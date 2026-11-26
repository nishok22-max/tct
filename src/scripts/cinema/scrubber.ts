// Scroll-controlled video playhead.
//
//  • Never plays on its own: the element is paused; only `currentTime` moves.
//  • One seek in flight at a time. While the decoder is busy, new targets just overwrite the
//    pending value, and the latest one is applied when `seeked` fires — so fast scrolling can't
//    queue a backlog of stale seeks or flash between timestamps.
//  • Progress → time uses the real `duration` from metadata; before that, targets are stored.
//  • The last frame is held: the maximum time stays a fraction of a frame before the end.
//  • On decode/network failure the poster image simply stays visible.

type Conn = { saveData?: boolean; effectiveType?: string };
export const lowData = () => {
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  return !!c && (c.saveData === true || /^(slow-2g|2g)$/.test(c.effectiveType ?? ''));
};

const TALL = '(max-aspect-ratio: 3/4)';
const FRAME = 1 / 24;

export class VideoScrubber {
  readonly el: HTMLVideoElement;
  duration = 0;
  ready = false;
  failed = false;
  private target = 0;
  private progress = 0;
  private seeking = false;
  private seekAt = 0;
  private loading = false;
  private onReady: (() => void) | undefined;
  private readonly offs: (() => void)[] = [];

  constructor(el: HTMLVideoElement, onReady?: () => void) {
    this.el = el;
    this.onReady = onReady;
    el.muted = true;
    el.playsInline = true;
    el.pause();
  }

  /** Portrait crop for portrait viewports, landscape otherwise. Chosen once, at load. */
  get source() {
    return (matchMedia(TALL).matches ? this.el.dataset.srcTall : this.el.dataset.srcWide) ?? '';
  }

  load() {
    if (this.loading || this.failed || lowData()) return;
    this.loading = true;
    const v = this.el;
    const on = <K extends keyof HTMLVideoElementEventMap>(type: K, fn: () => void, once = false) => {
      v.addEventListener(type, fn, { once });
      this.offs.push(() => v.removeEventListener(type, fn));
    };
    on('loadedmetadata', () => {
      this.duration = v.duration || 0;
      // iOS Safari only paints seeked frames after the element has played once. It is muted
      // and paused again immediately, so nothing actually plays.
      const p = v.play();
      if (p) p.then(() => v.pause()).catch(() => {});
      this.setProgress(this.progress);
    }, true);
    on('loadeddata', () => {
      this.ready = true;
      v.classList.add('is-ready');
      this.pump();
      this.onReady?.();
    }, true);
    on('seeked', () => {
      this.seeking = false;
      this.pump();
    });
    on('error', () => this.fail());
    // Defensive: if something resumes playback (e.g. media keys), stop it.
    on('play', () => { if (this.ready) v.pause(); });
    v.preload = 'auto';
    v.src = this.source;
    v.load();
  }

  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    if (!this.duration) return;
    this.target = Math.min(this.duration - FRAME * 0.5, this.progress * this.duration);
    this.pump();
  }

  private pump() {
    if (!this.ready || this.failed) return;
    // Watchdog: a seek that never reports back must not freeze the playhead.
    if (this.seeking && performance.now() - this.seekAt < 600) return;
    const v = this.el;
    if (Math.abs(v.currentTime - this.target) < FRAME * 0.5) return;
    this.seeking = true;
    this.seekAt = performance.now();
    v.currentTime = this.target;
  }

  private fail() {
    this.failed = true;
    this.ready = false;
    this.el.classList.remove('is-ready');
    this.el.removeAttribute('src');
  }

  destroy() {
    this.offs.forEach((off) => off());
    this.offs.length = 0;
  }
}
