// Home page cinema entry.
//  • Always: mounts the cotton-field canvas (a still frame when motion is reduced).
//  • Motion allowed: lazily loads GSAP + the choreography (./motion), which owns everything
//    inside a gsap.matchMedia() context and reverts cleanly if the OS setting changes.
import type { CottonFieldController } from '../../lib/cotton-field/engine';
import { createCottonFieldAuto } from '../../lib/cotton-field/offthread';

export type Field = { ctl: CottonFieldController; canvas: HTMLCanvasElement };

/** The featured plant's camera: fixed, so the plant enters the frame at the same scale as before. */
const FOCUS_CAMERA = 0.6;
const STILL = { featured: { boll: 1, approach: 1, glow: 0.6 } };

// The field itself is now live-action footage; the canvas only draws the featured cotton plant
// (plant-only mode) over a real out-of-focus field, so its boll can still open with scroll.
async function mountField(): Promise<Field | null> {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-featured-canvas]');
  if (!canvas) return null;
  const small = matchMedia('(max-width: 40rem)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const portrait = matchMedia('(max-aspect-ratio: 3/4)').matches;
  try {
    // Rendered in a Web Worker (OffscreenCanvas) where supported; main thread otherwise.
    const ctl = await createCottonFieldAuto(canvas, {
      field: false,
      wind: 46,
      observe: canvas.closest('[data-scene]'),
      cameraProgress: FOCUS_CAMERA,
      cameraDepth: small ? 0.5 : 0.62,
      scale: portrait ? Math.round(Math.min(1, Math.max(0.55, innerWidth / innerHeight / 0.75)) * 100) : 100,
      maxDpr: small ? 1.25 : 1.6,
      animate: !reduce,
      featured: reduce ? STILL.featured : { boll: 0, approach: 0, glow: 0 },
    });
    document.documentElement.classList.add('has-field');
    return { ctl, canvas };
  } catch {
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
