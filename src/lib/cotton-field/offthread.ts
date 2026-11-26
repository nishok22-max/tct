// Picks the fastest available way to run the cotton field:
//  • OffscreenCanvas + Worker → drawing happens off the main thread (Chromium, Firefox, Safari 16.4+)
//  • otherwise → the same engine on the main thread (createCottonField)
// Both return the same CottonFieldController, so callers never branch.
// Only types are imported statically: the engine itself is either in the worker chunk or, for
// browsers without OffscreenCanvas, fetched on demand — so it never weighs on the initial bundle.
import type { CottonFieldController, CottonFieldOptions, FeaturedState, LiveState, StatePatch } from './engine';

function stripDomOptions(o: Partial<CottonFieldOptions>): Partial<LiveState> {
  const rest: Record<string, unknown> = { ...o };
  delete rest.featuredCanvas;
  delete rest.observe;
  delete rest.maxDpr;
  return rest as Partial<LiveState>;
}

const mainThread = async (canvas: HTMLCanvasElement, options: CottonFieldOptions) =>
  (await import('./engine')).createCottonField(canvas, options);
import type { FromWorker, ToWorker } from './field.worker';

const canTransfer = (c: HTMLCanvasElement) =>
  typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in c;

export async function createCottonFieldAuto(canvas: HTMLCanvasElement, options: CottonFieldOptions = {}): Promise<CottonFieldController> {
  const featuredEl = options.featuredCanvas ?? null;
  if (!canTransfer(canvas) || (featuredEl && !canTransfer(featuredEl))) return mainThread(canvas, options);

  let worker: Worker;
  let offscreen: OffscreenCanvas;
  let offFeatured: OffscreenCanvas | null;
  try {
    worker = new Worker(new URL('./field.worker.ts', import.meta.url), { type: 'module', name: 'cotton-field' });
    offscreen = canvas.transferControlToOffscreen();
    offFeatured = featuredEl ? featuredEl.transferControlToOffscreen() : null;
  } catch {
    return mainThread(canvas, options);
  }

  const post = (m: ToWorker, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
  let stats = { avgMs: 0, dpr: 1, plants: 0 };
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    if (e.data.t === 'stats') stats = { avgMs: e.data.avgMs, dpr: e.data.dpr, plants: e.data.plants };
    else if (e.data.t === 'error') console.warn('[cotton-field worker]', e.data.message);
  };

  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const rect = canvas.getBoundingClientRect();
  post(
    {
      t: 'init',
      canvas: offscreen,
      featured: offFeatured,
      state: stripDomOptions(options),
      w: rect.width,
      h: rect.height,
      dpr: devicePixelRatio || 1,
      maxDpr: options.maxDpr ?? 1.6,
      reduced: media.matches,
    },
    offFeatured ? [offscreen, offFeatured] : [offscreen],
  );

  // Coalesce every update made during one task (e.g. camera + boll + glow from one GSAP tick)
  // into a single message.
  let pending: StatePatch | null = null;
  const flush = () => {
    if (!pending) return;
    post({ t: 'patch', patch: pending });
    pending = null;
  };
  const queue = (patch: StatePatch) => {
    if (!pending) {
      pending = {};
      queueMicrotask(flush);
    }
    if (patch.featuredPatch !== undefined) {
      const prev = pending.featuredPatch;
      pending.featuredPatch = patch.featuredPatch === null ? null : { ...(prev ?? {}), ...patch.featuredPatch };
    }
    const { featuredPatch: _ignored, ...rest } = patch;
    Object.assign(pending, rest);
  };

  let lastW = rect.width;
  let lastH = rect.height;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (r.width === lastW && r.height === lastH) return;
    lastW = r.width;
    lastH = r.height;
    post({ t: 'size', w: r.width, h: r.height, dpr: devicePixelRatio || 1 });
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((entries) => post({ t: 'flags', visible: entries.some((x) => x.isIntersecting) }));
  io.observe(options.observe ?? canvas);
  const onVis = () => post({ t: 'flags', hidden: document.hidden });
  document.addEventListener('visibilitychange', onVis);
  const onMotion = (e: MediaQueryListEvent) => post({ t: 'flags', reduced: e.matches });
  media.addEventListener('change', onMotion);

  return {
    setCamera(p) { queue({ cameraProgress: p }); },
    setFeatured(next: Partial<FeaturedState> | null) { queue({ featuredPatch: next }); },
    set(next) { queue(stripDomOptions(next)); },
    invalidate() { queue({}); },
    setRunning(running) { post({ t: 'flags', running }); },
    resize,
    destroy() {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      media.removeEventListener('change', onMotion);
      post({ t: 'stop' });
    },
    stats: () => ({ ...stats, thread: 'worker' }),
  };
}
