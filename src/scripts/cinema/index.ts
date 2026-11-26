// Home page cinema entry.
//  • Always: mounts the cotton-field canvas (a still frame when motion is reduced).
//  • Motion allowed: lazily loads GSAP + the choreography (./motion), which owns everything
//    inside a gsap.matchMedia() context and reverts cleanly if the OS setting changes.
import type { CottonFieldController } from '../../lib/cotton-field/engine';
import { createCottonFieldAuto } from '../../lib/cotton-field/offthread';

export type Field = { ctl: CottonFieldController; canvas: HTMLCanvasElement; featured: HTMLCanvasElement };

/** Sun behind the tree, as in the opening frame of the footage, so the two shots rhyme. */
export const FIELD_LOOK = { sun: { x: 0.535, y: 0.545 }, sunlight: 94, wind: 46, particles: 46 } as const;

const clampN = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

const STILL = { cameraProgress: 0.42, featured: { boll: 1, approach: 0, glow: 0.6 } };

async function mountField(): Promise<Field | null> {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-field-canvas]');
  const featured = document.querySelector<HTMLCanvasElement>('[data-featured-canvas]');
  if (!canvas || !featured) return null;
  const small = matchMedia('(max-width: 40rem)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const portrait = matchMedia('(max-aspect-ratio: 3/4)').matches;
  try {
    // Rendered in a Web Worker (OffscreenCanvas) where supported; main thread otherwise.
    const ctl = await createCottonFieldAuto(canvas, {
      ...FIELD_LOOK,
      featuredCanvas: featured,
      observe: canvas.closest('[data-scene]'),
      cameraDepth: small ? 0.5 : 0.62,
      detail: small ? 0.5 : 1,
      density: small ? 70 : 72,
      // Portrait screens: the composition is landscape-tuned, so plants and tree are scaled to the width.
      scale: portrait ? Math.round(clampN(innerWidth / innerHeight / 0.75, 0.55, 1) * 100) : 100,
      maxDpr: small ? 1 : 1.6, // phones: CPU-rasterised in the worker, so keep the pixel count modest
      animate: !reduce,
      ...(reduce ? STILL : { cameraProgress: 0, featured: { boll: 0, approach: 0, glow: 0 } }),
    });
    document.documentElement.classList.add('has-field');
    return { ctl, canvas, featured };
  } catch {
    // No 2D canvas: the poster image under it stays visible.
    return null;
  }
}

export async function initCinema() {
  const film = document.querySelector<HTMLElement>('[data-film]');
  if (!film) return;
  const field = await mountField();
  // `?debug` exposes the canvas controller for profiling: __akrField.ctl.stats()
  if (field && location.search.includes('debug')) (window as unknown as { __akrField: Field }).__akrField = field;
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)');

  let loading = false;
  const boot = () => {
    if (!motionOK.matches || loading) {
      // Switched to reduced motion: show a composed still frame.
      if (!motionOK.matches && field) field.ctl.set({ ...STILL, animate: false });
      return;
    }
    loading = true;
    field?.ctl.set({ animate: true });
    import('./motion')
      .then((m) => m.initMotion(field))
      .catch(() => {
        // Motion chunk unavailable: drop the pre-applied film layout so the static scenes show.
        document.documentElement.classList.remove('cine');
        field?.ctl.set({ ...STILL, animate: false });
      });
  };
  boot();
  motionOK.addEventListener('change', boot);
}
