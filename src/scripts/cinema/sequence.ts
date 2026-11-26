// Scroll-scrubbed image sequence for phones.
//
// Seeking an <video> on every scroll tick is the classic cause of mobile jank: phone decoders (iOS
// in particular) are slow to seek and can stall the page. Pre-decoded still frames drawn into a canvas
// cost a single drawImage per change instead — the technique large product pages use.
//
// Main-thread budget while scrolling is one drawImage per changed frame, nothing else:
//  • A worker downloads every frame once (compressed, ≈25 KB each) and decodes only the frames near
//    the current scroll position into ImageBitmaps, transferred zero-copy.
//  • A sliding window keeps ~20 decoded frames in memory (≈25 MB) instead of all of them (≈150 MB),
//    so phones never hit memory pressure or GC pauses.
//  • Until the exact frame is ready, the nearest decoded frame is shown — scrubbing never blocks.
//  • Same surface as VideoScrubber (load / setProgress / destroy), so the timeline doesn't branch.
// Browsers without worker image decoding fall back to decoding on the main thread.
import { lowData } from './scrubber';
import type { FromDecoder, ToDecoder } from './frame-decoder.worker';

type Frame = ImageBitmap | HTMLImageElement;

const AHEAD = 7;   // frames decoded in the scroll direction
const BEHIND = 3;  // frames decoded against it
const KEEP = 11;   // frames kept decoded on each side before being released

const canDecodeOffThread = () => typeof Worker !== 'undefined' && typeof createImageBitmap === 'function';

export class FrameSequence {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly urls: string[];
  private readonly frames: (Frame | undefined)[];
  private readonly pending = new Set<number>();
  private worker: Worker | null = null;
  private progress = 0;
  private drawn = -1;
  private lastTarget = 0;
  private dir = 1;
  private raf = 0;
  private started = false;
  private destroyed = false;
  private readonly ro: ResizeObserver;
  readonly ready = true;

  constructor(canvas: HTMLCanvasElement, base: string, count: number, ext = 'webp') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.urls = Array.from({ length: count }, (_, i) => `${base}/${String(i).padStart(3, '0')}.${ext}`);
    this.frames = new Array(count);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.drawn = -1;
      this.schedule();
    }
  }

  /** Coarse-to-fine order so the whole range is downloaded evenly, early. */
  private order() {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const step of [8, 4, 2, 1]) {
      for (let i = 0; i < this.urls.length; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); }
    }
    return out;
  }

  load() {
    if (this.started || lowData()) return;
    this.started = true;
    if (canDecodeOffThread()) {
      try {
        this.worker = new Worker(new URL('./frame-decoder.worker.ts', import.meta.url), { type: 'module', name: 'frame-decoder' });
        this.worker.onmessage = (e: MessageEvent<FromDecoder>) => this.onFrame(e.data);
        this.post({ t: 'prefetch', urls: this.order().map((i) => this.urls[i]!) });
        this.request();
        return;
      } catch {
        this.worker = null;
      }
    }
    this.loadOnMainThread();
  }

  private post(m: ToDecoder) {
    this.worker?.postMessage(m);
  }

  private onFrame(m: FromDecoder) {
    this.pending.delete(m.i);
    if (m.t !== 'frame') return;
    const t = this.target();
    if (this.destroyed || Math.abs(m.i - t) > KEEP) { m.bitmap.close(); return; }
    const old = this.frames[m.i];
    if (old && 'close' in old) old.close();
    this.frames[m.i] = m.bitmap;
    if (Math.abs(m.i - t) < Math.abs(this.drawn - t) || this.drawn < 0) this.schedule();
  }

  /** Ask the worker for the frames around the current position, nearest first, biased forward. */
  private request() {
    if (!this.worker) return;
    const t = this.target();
    const n = this.urls.length;
    const items: { i: number; url: string }[] = [];
    const add = (i: number) => {
      if (i < 0 || i >= n || this.frames[i] || this.pending.has(i)) return;
      items.push({ i, url: this.urls[i]! });
    };
    add(t);
    for (let d = 1; d <= Math.max(AHEAD, BEHIND); d++) {
      if (d <= AHEAD) add(t + d * this.dir);
      if (d <= BEHIND) add(t - d * this.dir);
    }
    // Replace the worker's queue; anything still pending stays pending.
    if (items.length) {
      items.forEach((x) => this.pending.add(x.i));
      this.post({ t: 'want', items });
    }
    // Release frames that drifted out of the window.
    for (let i = 0; i < n; i++) {
      const f = this.frames[i];
      if (f && Math.abs(i - t) > KEEP && i !== this.drawn) {
        if ('close' in f) f.close();
        this.frames[i] = undefined;
      }
    }
  }

  private loadOnMainThread() {
    const queue = this.order();
    const worker = async () => {
      while (queue.length && !this.destroyed) {
        const i = queue.shift()!;
        try {
          const img = new Image();
          img.decoding = 'async';
          img.src = this.urls[i]!;
          await img.decode();
          if (this.destroyed) return;
          this.frames[i] = img;
          if (Math.abs(i - this.target()) < Math.abs(this.drawn - this.target())) this.schedule();
        } catch {
          /* missing frame: neighbours cover it */
        }
      }
    };
    for (let k = 0; k < 3; k++) void worker();
  }

  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    const t = this.target();
    if (t !== this.lastTarget) {
      this.dir = t > this.lastTarget ? 1 : -1;
      this.lastTarget = t;
      // Pending requests from a different region would only waste decode time.
      this.pending.clear();
      this.request();
    }
    if (t !== this.drawn) this.schedule();
  }

  private target() {
    return Math.round(this.progress * (this.urls.length - 1));
  }

  private nearest(i: number) {
    for (let d = 0; d < this.urls.length; d++) {
      if (this.frames[i - d]) return i - d;
      if (this.frames[i + d]) return i + d;
    }
    return -1;
  }

  private schedule() {
    if (this.raf || this.destroyed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw() {
    const i = this.nearest(this.target());
    if (i < 0 || i === this.drawn || !this.ctx) return;
    const f = this.frames[i]!;
    const fw = 'naturalWidth' in f ? f.naturalWidth : f.width;
    const fh = 'naturalHeight' in f ? f.naturalHeight : f.height;
    const { width: cw, height: ch } = this.canvas;
    const k = Math.max(cw / fw, ch / fh); // object-fit: cover
    const w = fw * k;
    const h = fh * k;
    this.ctx.drawImage(f, (cw - w) / 2, (ch - h) / 2, w, h);
    this.drawn = i;
    this.canvas.classList.add('is-ready');
  }

  destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.worker?.terminate();
    this.worker = null;
    this.frames.forEach((f) => { if (f && 'close' in f) f.close(); });
    this.frames.length = 0;
    this.canvas.classList.remove('is-ready');
  }
}
