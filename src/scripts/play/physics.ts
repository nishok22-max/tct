// Physics playground: gravity, collisions, drag & throw with inertia, inside a constrained area.
//
// One Playground per area. The world's coordinates are the host element's own box (CSS px). The canvas
// is either inside the host (Story containers) or a viewport-sized fixed layer that draws the host's
// region (the Quality sandbox spans a whole tall section, and a section-sized canvas would cost far
// too much memory). Rendering is one drawImage per body from cached sprites.
//
// Cost control:
//  • steps and draws only while the host is on screen, the tab is visible and something is moving;
//    once every body is asleep the loop stops until the next touch, resize or scroll.
//  • touch: the page scrolls normally; only a touch that lands on a body is captured (preventDefault
//    on touchstart), so a swipe across a container still scrolls on phones.
import Matter from 'matter-js';
import type { Sprite } from './sprites';

const { Engine, Bodies, Body, Composite, Constraint, Query, Sleeping } = Matter;

export type Item = {
  sprite: Sprite;
  shape: { kind: 'circle'; r: number } | { kind: 'trapezoid'; w: number; h: number; topW: number };
  /** Sprite draw size (CSS px) and its offset from the body centre. */
  draw: { w: number; h: number; dx?: number; dy?: number };
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  angle?: number;
  spin?: number;
};

type Options = {
  /** Draw into this viewport-fixed canvas instead of a canvas inside the host. */
  fixedCanvas?: HTMLCanvasElement;
  /** Element that receives pointer input (defaults to the canvas). */
  input?: HTMLElement;
  ceiling?: boolean;
  /** Static rendering, no loop (prefers-reduced-motion). */
  still?: boolean;
  maxDpr?: number;
  restitution?: number;
};

const WALL = 200;

export class Playground {
  readonly engine: Matter.Engine;
  private readonly host: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly fixed: boolean;
  private readonly input: HTMLElement;
  private readonly opt: Options;
  private readonly sprites = new Map<number, Item>();
  private walls: Matter.Body[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private visible = false;
  private calm = 0;
  private drag: { c: Matter.Constraint; id: number } | null = null;
  private readonly io: IntersectionObserver;
  private readonly ro: ResizeObserver;
  private readonly off: (() => void)[] = [];
  private destroyed = false;

  constructor(host: HTMLElement, canvas: HTMLCanvasElement, opt: Options = {}) {
    this.host = host;
    this.canvas = opt.fixedCanvas ?? canvas;
    this.fixed = !!opt.fixedCanvas;
    // CPU raster (as in the cotton-field engine): no GPU context set-up or per-sprite texture uploads,
    // which otherwise cost a dropped frame or two the first time a playground draws.
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.input = opt.input ?? canvas;
    this.opt = opt;
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = 1;
    this.engine.positionIterations = 8;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = !!e?.isIntersecting;
      this.canvas.classList.toggle('is-on', this.visible);
      if (this.visible) this.wake();
    }, { rootMargin: '80px' });
    this.io.observe(host);
    this.resize();
    this.bindInput();
    const onVis = () => (document.hidden ? this.stop() : this.wake());
    document.addEventListener('visibilitychange', onVis);
    this.off.push(() => document.removeEventListener('visibilitychange', onVis));
    if (this.fixed) {
      // the fixed layer has to follow the page as it scrolls, even when nothing moves
      const onScroll = () => this.visible && this.paintSoon();
      addEventListener('scroll', onScroll, { passive: true });
      this.off.push(() => removeEventListener('scroll', onScroll));
    }
  }

  get size() {
    return { w: this.w, h: this.h };
  }

  /* ---------------- world ---------------- */
  private resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    this.dpr = Math.min(devicePixelRatio || 1, this.opt.maxDpr ?? 2);
    const cw = this.fixed ? innerWidth : w;
    const ch = this.fixed ? innerHeight : h;
    this.canvas.width = Math.max(1, Math.round(cw * this.dpr));
    this.canvas.height = Math.max(1, Math.round(ch * this.dpr));
    if (w !== this.w || h !== this.h) {
      const sx = this.w ? w / this.w : 1;
      const sy = this.h ? h / this.h : 1;
      this.w = w;
      this.h = h;
      this.buildWalls();
      // keep bodies inside after a resize
      for (const b of Composite.allBodies(this.engine.world)) {
        if (b.isStatic) continue;
        Body.setPosition(b, { x: Math.min(w - 8, Math.max(8, b.position.x * sx)), y: Math.min(h - 8, b.position.y * sy) });
        Sleeping.set(b, false);
      }
    }
    this.wake();
    this.paintSoon();
  }

  private buildWalls() {
    Composite.remove(this.engine.world, this.walls);
    const { w, h } = this;
    const o = { isStatic: true, friction: 0.6, restitution: 0.2 };
    this.walls = [
      Bodies.rectangle(w / 2, h + WALL / 2, w + WALL * 2, WALL, o), // floor
      Bodies.rectangle(-WALL / 2, h / 2, WALL, h * 3, o),
      Bodies.rectangle(w + WALL / 2, h / 2, WALL, h * 3, o),
    ];
    if (this.opt.ceiling !== false) this.walls.push(Bodies.rectangle(w / 2, -WALL / 2, w + WALL * 2, WALL, o));
    Composite.add(this.engine.world, this.walls);
  }

  add(items: Item[]) {
    const bodies = items.map((it) => {
      const common = { restitution: this.opt.restitution ?? 0.32, friction: 0.35, frictionAir: 0.012, angle: it.angle ?? 0, sleepThreshold: 50 };
      const b = it.shape.kind === 'circle'
        ? Bodies.circle(it.x, it.y, it.shape.r, common)
        : Bodies.trapezoid(it.x, it.y, it.shape.w, it.shape.h, 1 - it.shape.topW / it.shape.w, common);
      if (it.vx || it.vy) Body.setVelocity(b, { x: it.vx ?? 0, y: it.vy ?? 0 });
      if (it.spin) Body.setAngularVelocity(b, it.spin);
      this.sprites.set(b.id, it);
      return b;
    });
    Composite.add(this.engine.world, bodies);
    if (this.opt.still) this.settle();
    else this.wake();
    return bodies;
  }

  clear() {
    for (const b of Composite.allBodies(this.engine.world)) if (!b.isStatic) Composite.remove(this.engine.world, b);
    this.sprites.clear();
    this.paintSoon();
  }

  /** Reduced motion: run the simulation to rest off-screen and draw the result once. */
  settle(steps = 360) {
    for (let i = 0; i < steps; i++) Engine.update(this.engine, 1000 / 60);
    this.paint();
  }

  /* ---------------- loop ---------------- */
  wake() {
    if (this.opt.still || this.destroyed || this.raf || !this.visible || document.hidden) return;
    this.calm = 0;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private paintQueued = false;
  private paintSoon() {
    if (this.paintQueued || this.raf) return;
    this.paintQueued = true;
    requestAnimationFrame(() => { this.paintQueued = false; this.paint(); });
  }

  private readonly tick = (now: number) => {
    this.raf = 0;
    if (!this.visible || document.hidden || this.destroyed) return;
    const dt = Math.min(1000 / 40, Math.max(1000 / 144, now - this.last));
    this.last = now;
    Engine.update(this.engine, dt);
    this.paint();
    // stop once everything has been asleep for a moment
    const moving = Composite.allBodies(this.engine.world).some((b) => !b.isStatic && !b.isSleeping);
    this.calm = moving || this.drag ? 0 : this.calm + 1;
    if (this.calm < 20) this.raf = requestAnimationFrame(this.tick);
  };

  private paint() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let ox = 0;
    let oy = 0;
    if (this.fixed) {
      const r = this.host.getBoundingClientRect();
      ox = r.left;
      oy = r.top;
      if (r.bottom < 0 || r.top > innerHeight) return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    for (const b of Composite.allBodies(this.engine.world)) {
      const it = this.sprites.get(b.id);
      if (!it) continue;
      const { w, h, dx = 0, dy = 0 } = it.draw;
      const c = Math.cos(b.angle);
      const s = Math.sin(b.angle);
      ctx.setTransform(c * dpr, s * dpr, -s * dpr, c * dpr, (ox + b.position.x) * dpr, (oy + b.position.y) * dpr);
      ctx.drawImage(it.sprite.img, -w / 2 + dx, -h / 2 + dy, w, h);
    }
  }

  /* ---------------- input: drag & throw ---------------- */
  private point(e: { clientX: number; clientY: number }) {
    const r = this.host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Drag target kept inside the area, so a fast drag can't pull a body through a wall. */
  private inside(p: { x: number; y: number }) {
    return { x: Math.min(this.w - 6, Math.max(6, p.x)), y: Math.min(this.h - 6, Math.max(6, p.y)) };
  }

  /** The body under a point, if any (top-most first). */
  hit(p: { x: number; y: number }) {
    const bodies = Composite.allBodies(this.engine.world).filter((b) => !b.isStatic);
    return Query.point(bodies, p).pop() ?? null;
  }

  private bindInput() {
    if (this.opt.still) return;
    const el = this.input;
    // Phones: claim the gesture only when it starts on a body, so the page keeps scrolling otherwise.
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && e.touches.length === 1 && this.hit(this.point(t))) e.preventDefault();
    };
    const onDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      const p = this.point(e);
      const b = this.hit(p);
      if (!b) return;
      e.preventDefault();
      Sleeping.set(b, false);
      const local = Matter.Vector.rotate(Matter.Vector.sub(p, b.position), -b.angle);
      const c = Constraint.create({ pointA: p, bodyB: b, pointB: local, stiffness: 0.12, damping: 0.08, length: 0 });
      Composite.add(this.engine.world, c);
      this.drag = { c, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
      el.classList.add('is-grabbing');
      this.wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!this.drag) {
        if (e.pointerType === 'mouse') el.classList.toggle('is-over', !!this.hit(this.point(e)));
        return;
      }
      if (e.pointerId !== this.drag.id) return;
      this.drag.c.pointA = this.inside(this.point(e));
      if (this.drag.c.bodyB) Sleeping.set(this.drag.c.bodyB, false);
    };
    const onUp = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      // the body keeps the velocity the drag gave it — that is the throw
      Composite.remove(this.engine.world, this.drag.c);
      this.drag = null;
      el.classList.remove('is-grabbing');
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    this.off.push(() => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    });
  }

  destroy() {
    this.destroyed = true;
    this.stop();
    this.io.disconnect();
    this.ro.disconnect();
    this.off.forEach((f) => f());
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}

export const prefersStill = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isPhone = () => matchMedia('(max-width: 40rem)').matches;
