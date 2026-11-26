// Scroll-scrubbed image sequence for phones.
//
// Seeking an <video> on every scroll tick is the classic cause of mobile jank: phone decoders (iOS
// in particular) are slow to seek and can stall the page. Pre-decoded still frames drawn into a canvas
// cost a single drawImage per change instead — the technique large product pages use.
//
//  • Frames load progressively in a coarse-to-fine order (every 8th, then 4th, 2nd, 1st), so scrubbing
//    works almost immediately and sharpens as more frames arrive.
//  • Each frame is decoded off the main thread (img.decode / createImageBitmap) before it is drawn.
//  • The nearest available frame is shown; drawing happens at most once per animation frame and only
//    when the frame index actually changes.
//  • Same surface as VideoScrubber (load / setProgress / destroy), so the timeline code doesn't branch.
import { lowData } from './scrubber';

type Frame = ImageBitmap | HTMLImageElement;

export class FrameSequence {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly urls: string[];
  private readonly frames: (Frame | undefined)[];
  private progress = 0;
  private drawn = -1;
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

  /** Coarse-to-fine order so the whole range becomes scrubbable quickly. */
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
    const queue = this.order();
    const worker = async () => {
      while (queue.length && !this.destroyed) {
        const i = queue.shift()!;
        try {
          const img = new Image();
          img.decoding = 'async';
          img.src = this.urls[i]!;
          await img.decode();
          const frame: Frame = 'createImageBitmap' in window ? await createImageBitmap(img) : img;
          if (this.destroyed) { if ('close' in frame) frame.close(); return; }
          this.frames[i] = frame;
          // A newly arrived frame may be closer to the current position than the one on screen.
          if (Math.abs(i - this.target()) < Math.abs(this.drawn - this.target())) this.schedule();
        } catch {
          /* missing frame: neighbours cover it */
        }
      }
    };
    for (let k = 0; k < 4; k++) void worker(); // 4 parallel requests
  }

  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    if (this.target() !== this.drawn) this.schedule();
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
    this.frames.forEach((f) => { if (f && 'close' in f) f.close(); });
    this.frames.length = 0;
    this.canvas.classList.remove('is-ready');
  }
}
