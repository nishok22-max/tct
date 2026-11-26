/** @jsxImportSource react */
"use client";

/**
 * AKR Mills — Golden Hour Cotton Field (React wrapper)
 *
 * Same public props as the original component, so existing usages keep working.
 * The drawing code now lives in `src/lib/cotton-field/engine.ts` (unchanged functions
 * plus opt-in extensions), and this wrapper only mounts it.
 *
 * New, optional:
 *  • `controllerRef` — receives the imperative controller. Drive it from GSAP/ScrollTrigger:
 *      ref.current.setCamera(progress); ref.current.setFeatured({ boll, approach, glow })
 *    No React state is touched, so scrolling never re-renders.
 *  • `cameraDepth`, `sun`, `detail`, `featured` — see `SceneProps` in the engine.
 *
 * The Astro site does not ship React; it uses the same engine directly
 * (`src/scripts/film/`). This file is kept for React/Next.js consumers.
 */
import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import { createCottonField, type CottonFieldController, type FeaturedState } from "../../lib/cotton-field/engine";

export type AKRMillsCottonFieldProps = {
  /** Animation speed. 0 freezes the scene; 50 is the intended pace. */
  speed?: number;
  /** Overall visual scale in percent. */
  scale?: number;
  /** Number of visible cotton plants in percent. */
  density?: number;
  /** Amount of atmospheric pollen / floating fibre. */
  particles?: number;
  /** Strength of the golden-hour light. */
  sunlight?: number;
  /** Strength of the breeze moving leaves and cotton stems. */
  wind?: number;
  /** Optional externally-driven camera push, from 0 (wide) to 1 (closer). */
  cameraProgress?: number;
  /** Optional background colour used while the canvas initializes. */
  background?: string;
  /** Set false for a static fallback / reduced-motion layout. */
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
  /** [new] How far the camera travels at cameraProgress = 1 (0.12 ≈ original push). */
  cameraDepth?: number;
  /** [new] Normalised sun position. */
  sun?: { x: number; y: number };
  /** [new] 0.3–1 detail multiplier (blades / far dots). */
  detail?: number;
  /** [new] Featured plant with scroll-driven boll. */
  featured?: FeaturedState | null;
  /** [new] Imperative handle for scroll-driven control without re-renders. */
  controllerRef?: MutableRefObject<CottonFieldController | null>;
};

export default function AKRMillsCottonField({
  speed = 42,
  scale = 100,
  density = 88,
  particles = 42,
  sunlight = 86,
  wind = 42,
  cameraProgress,
  background = "#D9AE83",
  animate = true,
  className,
  style,
  cameraDepth,
  sun,
  detail,
  featured,
  controllerRef,
}: AKRMillsCottonFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<CottonFieldController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = createCottonField(canvas, { observe: rootRef.current, speed, scale, density, particles, sunlight, wind, cameraProgress, animate, cameraDepth, sun, detail, featured });
    controller.current = c;
    if (controllerRef) controllerRef.current = c;
    return () => {
      c.destroy();
      controller.current = null;
      if (controllerRef) controllerRef.current = null;
    };
    // The engine is created once; prop changes are forwarded below without re-creating it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prop changes (rare) are copied into the live state; scroll-driven updates should use controllerRef.
  useEffect(() => {
    controller.current?.set({ speed, scale, density, particles, sunlight, wind, cameraProgress, animate, ...(cameraDepth != null && { cameraDepth }), ...(sun && { sun }), ...(detail != null && { detail }), ...(featured !== undefined && { featured }) });
  }, [speed, scale, density, particles, sunlight, wind, cameraProgress, animate, cameraDepth, sun, detail, featured]);

  return (
    <div
      ref={rootRef}
      className={className}
      aria-hidden="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 360,
        overflow: "hidden",
        isolation: "isolate",
        background,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
