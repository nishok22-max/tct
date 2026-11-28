// Newton's cradle — seven yarn balls on threads.
//
// A dedicated pendulum solver (a general rigid-body engine smears the momentum hand-off):
//  • each ball i has angle θ and angular velocity ω; gravity ω += -(g/L)·sinθ·dt at a fixed 240 Hz step
//  • touching neighbours that approach exchange velocity (equal-mass elastic, restitution e), resolved
//    in repeated passes so a hit passes through the whole row — lift one, one flies out; lift three…
//  • a dragged ball pushes the balls in its way, so pulling ball 3 left lifts 1–3 together
// Drawing: steel rails and walnut base are pre-rendered once; each frame draws threads, 7 cached
// yarn-ball sprites and their number discs. The loop runs only while on screen and moving.
import { yarnBall } from './sprites';

const N = 7;
const STEP = 1 / 240;
const E = 0.995; // restitution between balls
const DAMP = 0.06; // per second (air drag)

export function mountCradle(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('[data-cradle-stage]')!;
  const canvas = stage.querySelector('canvas')!;
  const label = root.querySelector<HTMLElement>('[data-cradle-label]')!;
  const names: string[] = JSON.parse(root.dataset.stages ?? '[]');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 40rem)').matches;

  const th = new Float64Array(N);
  const om = new Float64Array(N);
  let W = 0, H = 0, dpr = 1, r = 10, L = 100, g = 1, y0 = 0, yBase = 0;
  let MAX = 0.7; // swing limit (rad): the outer balls stay inside the frame's posts
  const px = new Float64Array(N);
  let back: HTMLCanvasElement | null = null;
  let front: HTMLCanvasElement | null = null;
  let balls: ReturnType<typeof yarnBall>[] = [];
  // yarn tones (same family as the winding animation and the Story containers)
  const colours = ['#E9D8BA', '#C68F4C', '#F3EBDD', '#4E5A3A', '#D9C19A', '#B9573C', '#8A6A3E'];

  /* ---------------- layout + static layers ---------------- */
  const layer = (paint: (c: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.scale(dpr, dpr);
    paint(x);
    return c;
  };

  const steel = (c: CanvasRenderingContext2D, x0: number, y0_: number, x1: number, y1: number, wdt: number, dim = 0) => {
    // a polished tube: dark edge → bright highlight → mid
    const horiz = Math.abs(y1 - y0_) < 1;
    const gr = horiz ? c.createLinearGradient(0, y0_ - wdt / 2, 0, y0_ + wdt / 2) : c.createLinearGradient(x0 - wdt / 2, 0, x0 + wdt / 2, 0);
    gr.addColorStop(0, `rgb(${110 - dim} ${114 - dim} ${116 - dim})`);
    gr.addColorStop(0.35, `rgb(${246 - dim} ${247 - dim} ${246 - dim})`);
    gr.addColorStop(0.6, `rgb(${178 - dim} ${182 - dim} ${184 - dim})`);
    gr.addColorStop(1, `rgb(${96 - dim} ${100 - dim} ${103 - dim})`);
    c.strokeStyle = gr;
    c.lineWidth = wdt;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x0, y0_);
    c.lineTo(x1, y1);
    c.stroke();
  };

  const frame = (c: CanvasRenderingContext2D, inset: number, lift: number, wdt: number, dim: number) => {
    const xl = W * 0.05 + inset;
    const xr = W * 0.95 - inset;
    const top = y0 - lift;
    const rad = wdt * 2.2;
    steel(c, xl, yBase - 2, xl, top + rad, wdt, dim);
    steel(c, xr, yBase - 2, xr, top + rad, wdt, dim);
    steel(c, xl + rad, top, xr - rad, top, wdt, dim);
    // rounded corners
    c.strokeStyle = `rgb(${200 - dim} ${203 - dim} ${205 - dim})`;
    c.lineWidth = wdt;
    c.beginPath();
    c.arc(xl + rad, top + rad, rad, Math.PI, Math.PI * 1.5);
    c.moveTo(xr - rad, top);
    c.arc(xr - rad, top + rad, rad, Math.PI * 1.5, 0);
    c.stroke();
  };

  const layout = () => {
    const rect = stage.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    yBase = H * 0.86;
    y0 = H * 0.1;
    r = Math.min((W * 0.46) / (N * 2), H * 0.08); // the row spans under half the frame, leaving room to swing
    L = yBase - y0 - r - H * 0.07;
    g = L * (2 * Math.PI / 1.2) ** 2; // period ≈ 1.2 s at any size
    for (let i = 0; i < N; i++) px[i] = W / 2 + (i - (N - 1) / 2) * 2 * r;
    const room = W * 0.95 - Math.max(3.5, W * 0.011) - px[N - 1]! - r * 1.05; // to the inside of the right post
    MAX = Math.min(1.0, Math.asin(Math.max(0.2, Math.min(1, room / L))));
    balls = colours.map((c, i) => yarnBall(c, r, i + 3));

    back = layer((c) => {
      // walnut base
      const bh = H * 0.1;
      const bx = W * 0.025, bw = W * 0.95;
      const wood = c.createLinearGradient(0, yBase, 0, yBase + bh);
      wood.addColorStop(0, '#7A3E2A');
      wood.addColorStop(0.18, '#5E2D1F');
      wood.addColorStop(1, '#3F1D14');
      c.fillStyle = 'rgb(0 0 0 / 0.18)';
      c.beginPath();
      c.ellipse(W / 2, yBase + bh + 4, bw * 0.52, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = wood;
      c.beginPath();
      c.roundRect(bx, yBase, bw, bh, 5);
      c.fill();
      // lacquer sheen on the top face
      const sheen = c.createLinearGradient(bx, 0, bx + bw, 0);
      sheen.addColorStop(0, 'rgb(255 220 190 / 0.05)');
      sheen.addColorStop(0.5, 'rgb(255 230 205 / 0.22)');
      sheen.addColorStop(1, 'rgb(255 220 190 / 0.05)');
      c.fillStyle = sheen;
      c.fillRect(bx + 4, yBase + 1, bw - 8, bh * 0.22);
      // back frame (slightly higher and dimmer — depth)
      frame(c, W * 0.035, H * 0.035, Math.max(3, W * 0.009), 40);
    });
    front = layer((c) => frame(c, 0, 0, Math.max(3.5, W * 0.011), 0));
    draw();
  };

  /* ---------------- physics ---------------- */
  const xOf = (i: number) => px[i]! + L * Math.sin(th[i]!);
  const yOf = (i: number) => y0 + L * Math.cos(th[i]!);
  let drag = -1;

  const step = (dt: number) => {
    for (let i = 0; i < N; i++) {
      if (i === drag) continue;
      om[i]! += -(g / L) * Math.sin(th[i]!) * dt;
      om[i]! *= 1 - DAMP * dt;
    }
    for (let i = 0; i < N; i++) {
      if (i === drag) continue;
      th[i]! += om[i]! * dt;
      // the frame's posts: a ball flung too far is stopped softly instead of passing through them
      if (Math.abs(th[i]!) > MAX * 1.04 && th[i]! * om[i]! > 0) { th[i] = Math.sign(th[i]!) * MAX * 1.04; om[i] = -om[i]! * 0.25; }
    }
    // collisions: neighbours touching and approaching exchange velocity
    for (let pass = 0; pass < N * 2; pass++) {
      let hit = false;
      for (let i = 0; i < N - 1; i++) {
        const gap = xOf(i + 1) - xOf(i) - 2 * r;
        if (gap > 0.01) continue;
        const v1 = om[i]!;
        const v2 = om[i + 1]!;
        if (v1 > v2 + 1e-6) {
          hit = true;
          if (i === drag) om[i + 1] = (1 + E) * v1 - E * v2; // a held ball acts as a wall
          else if (i + 1 === drag) om[i] = (1 + E) * v2 - E * v1;
          else {
            om[i] = ((1 - E) * v1 + (1 + E) * v2) / 2;
            om[i + 1] = ((1 + E) * v1 + (1 - E) * v2) / 2;
          }
        }
        // positional correction so balls never interpenetrate
        if (gap < -0.01) {
          const fix = Math.asin(Math.min(1, -gap / 2 / L));
          if (i !== drag) th[i]! -= fix;
          if (i + 1 !== drag) th[i + 1]! += fix;
        }
      }
      if (!hit) break;
    }
  };

  /* ---------------- drawing ---------------- */
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (back) ctx.drawImage(back, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // soft reflections of the balls in the lacquered base
    for (let i = 0; i < N; i++) {
      const x = xOf(i);
      const lift = (yOf(i) - (y0 + L)) / (r * 4);
      ctx.fillStyle = `rgb(255 236 214 / ${Math.max(0, 0.16 + lift * 0.1)})`;
      ctx.beginPath();
      ctx.ellipse(x, yBase + H * 0.028, r * 0.75, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // threads: a V to the front and back rails
    ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) {
      const x = xOf(i);
      const y = yOf(i);
      const tx = x - Math.sin(th[i]!) * r * 0.92;
      const ty = y - Math.cos(th[i]!) * r * 0.92;
      ctx.strokeStyle = 'rgb(214 200 176 / 0.9)';
      ctx.beginPath();
      ctx.moveTo(px[i]! - r * 0.35, y0 - H * 0.035);
      ctx.lineTo(tx, ty);
      ctx.lineTo(px[i]! + r * 0.35, y0);
      ctx.stroke();
    }
    // balls and their number discs
    const fs = Math.max(9, r * 0.62);
    ctx.font = `${fs}px "Instrument Serif", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
      const x = xOf(i);
      const y = yOf(i);
      const sp = balls[i]!;
      const c = Math.cos(th[i]!);
      const s = Math.sin(th[i]!);
      ctx.setTransform(c * dpr, -s * dpr, s * dpr, c * dpr, x * dpr, y * dpr);
      ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgb(251 246 236 / 0.94)';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgb(138 106 62 / 0.55)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = '#1F2A20';
      ctx.fillText(String(i + 1).padStart(2, '0'), x, y + fs * 0.04);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (front) ctx.drawImage(front, 0, 0);
  };

  /* ---------------- loop ---------------- */
  let raf = 0;
  let last = 0;
  let acc = 0;
  let calm = 0;
  let visible = false;
  let shown = -1;
  const showStage = (i: number) => {
    if (i === shown || i < 0) return;
    shown = i;
    label.textContent = names[i] ?? '';
  };
  const tick = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    draw();
    // the label follows the ball currently swinging out the furthest
    if (drag < 0) {
      let best = -1, amp = 0.12;
      for (let i = 0; i < N; i++) if (Math.abs(th[i]!) > amp) { amp = Math.abs(th[i]!); best = i; }
      showStage(best);
    }
    let energy = 0;
    for (let i = 0; i < N; i++) energy += Math.abs(om[i]!) + Math.abs(th[i]!);
    calm = energy < 0.004 && drag < 0 ? calm + 1 : 0;
    if (calm > 30) { th.fill(0); om.fill(0); draw(); return; }
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (raf || !visible || document.hidden) return;
    calm = 0;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  /* ---------------- input ---------------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const b = stage.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const ballAt = (p: { x: number; y: number }) => {
    for (let i = 0; i < N; i++) if (Math.hypot(p.x - xOf(i), p.y - yOf(i)) < r * 1.15) return i;
    return -1;
  };
  /** Put ball k at angle a and push the balls in its way so nothing overlaps. */
  const place = (k: number, a: number) => {
    th[k] = Math.max(-MAX, Math.min(MAX, a));
    om[k] = 0;
    for (let j = k - 1; j >= 0; j--) {
      const limit = xOf(j + 1) - 2 * r;
      if (xOf(j) > limit) { th[j] = Math.asin(Math.max(-1, Math.min(1, (limit - px[j]!) / L))); om[j] = 0; }
    }
    for (let j = k + 1; j < N; j++) {
      const limit = xOf(j - 1) + 2 * r;
      if (xOf(j) < limit) { th[j] = Math.asin(Math.max(-1, Math.min(1, (limit - px[j]!) / L))); om[j] = 0; }
    }
  };
  let lastA = 0;
  let lastT = 0;
  let flick = 0;
  const angleTo = (k: number, p: { x: number; y: number }) => Math.atan2(p.x - px[k]!, Math.max(1, p.y - y0));

  stage.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t && e.touches.length === 1 && ballAt(local(t)) >= 0) e.preventDefault();
  }, { passive: false });
  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const k = ballAt(local(e));
    if (k < 0) return;
    e.preventDefault();
    drag = k;
    try { stage.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    root.classList.add('is-used', 'is-grabbing');
    showStage(k);
    lastA = th[k]!;
    lastT = performance.now();
    flick = 0;
    wake();
  });
  stage.addEventListener('pointermove', (e) => {
    if (drag < 0) {
      if (e.pointerType === 'mouse') stage.classList.toggle('is-over', ballAt(local(e)) >= 0);
      return;
    }
    const a = angleTo(drag, local(e));
    const now = performance.now();
    const dt = Math.max(1, now - lastT) / 1000;
    flick = flick * 0.5 + ((a - lastA) / dt) * 0.5;
    lastA = a;
    lastT = now;
    place(drag, a);
    draw();
  });
  const release = () => {
    if (drag < 0) return;
    // the lifted group keeps a little of the flick, so a toss feels alive (capped)
    const v = Math.max(-1.5, Math.min(1.5, flick * 0.5));
    for (let i = 0; i < N; i++) if (Math.abs(th[i]!) > 0.02) om[i] = v;
    drag = -1;
    root.classList.remove('is-grabbing');
    wake();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  // keyboard: swing 1, then 2, then 3 balls
  let presses = 0;
  const swing = (count: number) => {
    th.fill(0);
    om.fill(0);
    for (let i = 0; i < count; i++) th[i] = -MAX * 0.95;
    showStage(0);
    root.classList.add('is-used');
    wake();
  };
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    swing((presses++ % 3) + 1);
  });

  /* ---------------- lifecycle ---------------- */
  let demoed = still;
  const io = new IntersectionObserver(([en]) => {
    visible = !!en?.isIntersecting;
    if (!visible) return;
    root.classList.add('is-in');
    wake();
    if (!demoed && (en?.intersectionRatio ?? 0) > 0.5) {
      demoed = true;
      // a one-time demo: ball 01 lifts and drops, so the cradle is visibly alive
      const t0 = performance.now();
      const lift = (now: number) => {
        const k = Math.min(1, (now - t0) / 700);
        if (drag >= 0 || root.classList.contains('is-used')) return;
        th[0] = -MAX * 0.9 * (1 - (1 - k) ** 3);
        om[0] = 0;
        draw();
        if (k < 1) requestAnimationFrame(lift);
        else setTimeout(() => { if (drag < 0) wake(); }, 250);
      };
      requestAnimationFrame(lift);
    }
  }, { threshold: [0, 0.55] });
  io.observe(root);
  new ResizeObserver(() => layout()).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  document.fonts?.ready.then(() => draw());
  layout();
  // `?debug` exposes the solver for inspection: __cradle.th / .om / .swing(n)
  if (location.search.includes('debug')) (window as unknown as { __cradle: unknown }).__cradle = { th, om, swing, step, get drag() { return drag; } };
}
