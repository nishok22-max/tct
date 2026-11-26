/// <reference lib="webworker" />
// Cotton-field renderer running off the main thread (OffscreenCanvas). The main thread only posts
// small state patches; drawing, the ambient clock and adaptive resolution all live here, so
// scrolling, GSAP and video decoding never wait on canvas work.
import { FieldClock, FieldRenderer, applyPatch, initialState, type LiveState, type StatePatch } from './engine';

export type ToWorker =
  | { t: 'init'; canvas: OffscreenCanvas; featured: OffscreenCanvas | null; state: Partial<LiveState>; w: number; h: number; dpr: number; maxDpr: number; reduced: boolean }
  | { t: 'size'; w: number; h: number; dpr: number }
  | { t: 'patch'; patch: StatePatch; invalidate?: boolean }
  | { t: 'flags'; visible?: boolean; hidden?: boolean; running?: boolean; reduced?: boolean }
  | { t: 'stop' };

export type FromWorker = { t: 'stats'; avgMs: number; dpr: number; plants: number } | { t: 'error'; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
// requestAnimationFrame exists in dedicated workers in Chromium and Firefox; fall back to a timer elsewhere.
const raf: (cb: (now: number) => void) => number =
  typeof scope.requestAnimationFrame === 'function'
    ? (cb) => scope.requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
const caf: (h: number) => void =
  typeof scope.cancelAnimationFrame === 'function' ? (h) => scope.cancelAnimationFrame(h) : (h) => clearTimeout(h);

let renderer: FieldRenderer | null = null;
let clock: FieldClock | null = null;
let statsTimer = 0;

scope.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  try {
    if (m.t === 'init') {
      renderer = new FieldRenderer(m.canvas, m.featured, initialState(m.state), m.maxDpr, true);
      clock = new FieldClock(renderer, raf, caf);
      clock.reduced = m.reduced;
      renderer.resize(m.w, m.h, m.dpr);
      clock.invalidate();
      statsTimer = setInterval(() => {
        if (renderer) scope.postMessage({ t: 'stats', ...renderer.stats() } satisfies FromWorker);
      }, 1000) as unknown as number;
      return;
    }
    if (!renderer || !clock) return;
    if (m.t === 'size') { renderer.resize(m.w, m.h, m.dpr); clock.invalidate(); }
    else if (m.t === 'patch') { applyPatch(renderer.state, m.patch); clock.invalidate(); }
    else if (m.t === 'flags') {
      if (m.visible !== undefined) clock.visible = m.visible;
      if (m.hidden !== undefined) clock.hidden = m.hidden;
      if (m.running !== undefined) clock.running = m.running;
      if (m.reduced !== undefined) clock.reduced = m.reduced;
      clock.invalidate();
    } else if (m.t === 'stop') {
      clock.destroy();
      clearInterval(statsTimer);
      scope.close();
    }
  } catch (err) {
    scope.postMessage({ t: 'error', message: String(err) } satisfies FromWorker);
  }
};
