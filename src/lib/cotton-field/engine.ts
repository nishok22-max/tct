/**
 * AKR Mills — Golden Hour Cotton Field · rendering engine
 *
 * The drawing functions in this file are the ones from the original
 * `AKRMillsCottonField.tsx` (sky, clouds, tree, field, plants, bolls, atmosphere).
 * They are kept intact; additions are marked `// [ext]` and are all opt-in with
 * defaults that reproduce the original look:
 *
 *  • depth-aware camera dolly (true ground-plane perspective instead of a global zoom)
 *  • configurable sun position (so the canvas can echo the hero footage)
 *  • a featured, botanically structured cotton plant whose boll opening is driven
 *    by an external 0–1 value (scroll), never by a timer
 *  • an imperative controller so GSAP can drive everything with zero React renders
 *  • cached sky layer, visibility-aware RAF, adaptive pixel ratio, mobile detail level
 *
 * Framework-agnostic: used directly by the Astro site and by the React wrapper
 * (`src/components/react/AKRMillsCottonField.tsx`).
 */

export type Plant = {
  x: number;
  y: number;
  seed: number;
  height: number;
  lean: number;
  bollCount: number;
};

type Ctx = CanvasRenderingContext2D;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const smoothstep = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePlants(count: number, seed = 26083): Plant[] {
  const random = mulberry32(seed);
  const plants: Plant[] = [];
  for (let i = 0; i < count; i += 1) {
    const y = 0.59 + Math.pow(random(), 0.72) * 0.47;
    plants.push({
      x: random(),
      y,
      seed: random(),
      height: 0.045 + Math.pow((y - 0.59) / 0.47, 1.1) * 0.23,
      lean: (random() - 0.5) * 0.16,
      bollCount: 2 + Math.floor(random() * 2),
    });
  }
  return plants.sort((a, b) => a.y - b.y);
}

/* ------------------------------------------------------------------ */
/* [ext] Camera: a dolly along the ground plane                         */
/* ------------------------------------------------------------------ */
// Screen y below the horizon is proportional to 1/depth on a flat field, so moving the
// camera forward by `dolly` scales every ground point by 1 / (1 - dolly · g), where g is
// its normalised distance below the horizon. Far things barely move; near things rush past.
export type Camera = {
  /** Forward travel, 0 = original framing. */
  dolly: number;
  /** Point the camera travels towards (screen x). */
  vx: number;
  /** Vertical tilt in px (negative = scene moves up, i.e. the camera looks down). */
  tilt: number;
  horizon: number;
  h: number;
};

const NEAR_CULL = 0.2;

function project(cam: Camera, x: number, y: number) {
  const g = Math.max(0, (y - cam.horizon) / (cam.h - cam.horizon));
  const k = 1 - cam.dolly * g;
  const s = 1 / Math.max(k, NEAR_CULL);
  return { x: cam.vx + (x - cam.vx) * s, y: cam.horizon + (y - cam.horizon) * s, s, k };
}

/* ------------------------------------------------------------------ */
/* Original drawing functions                                           */
/* ------------------------------------------------------------------ */
function drawCloud(ctx: Ctx, x: number, y: number, width: number, height: number, alpha: number, warm: boolean, time: number) {
  const drift = Math.sin(time * 0.035 + x * 0.01) * 10;
  const cx = x + drift;
  const base = warm ? "rgba(255,190,139," : "rgba(91,91,100,";
  const highlight = warm ? "rgba(255,220,177," : "rgba(226,165,139,";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = "blur(9px)";
  const puffs = [
    [-0.34, 0.1, 0.42, 0.55],
    [-0.1, -0.12, 0.48, 0.72],
    [0.17, -0.2, 0.5, 0.8],
    [0.42, 0.02, 0.4, 0.58],
    [0.02, 0.12, 0.65, 0.56],
  ] as const;
  for (const [ox, oy, sx, sy] of puffs) {
    const px = cx + ox * width;
    const py = y + oy * height;
    const gradient = ctx.createRadialGradient(px - width * 0.08, py - height * 0.18, 1, px, py, width * sx * 0.58);
    gradient.addColorStop(0, `${highlight}${0.92})`);
    gradient.addColorStop(0.55, `${base}${0.72})`);
    gradient.addColorStop(1, `${base}0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(px, py, width * sx * 0.58, height * sy * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// [ext] `sun` lets the caller place the sun; the default is the original position.
function drawSky(ctx: Ctx, w: number, h: number, time: number, sunlight: number, sun = DEFAULT_SUN) {
  const horizon = h * 0.585;
  const sky = ctx.createLinearGradient(0, 0, w * 0.2, horizon);
  sky.addColorStop(0, "#F5B777");
  sky.addColorStop(0.28, "#F6C18E");
  sky.addColorStop(0.62, "#D8B7A0");
  sky.addColorStop(1, "#789092");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 2);

  const sunX = w * sun.x;
  const sunY = h * sun.y;
  const glow = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, h * 0.42);
  glow.addColorStop(0, `rgba(255,244,205,${0.72 * sunlight})`);
  glow.addColorStop(0.18, `rgba(255,208,144,${0.36 * sunlight})`);
  glow.addColorStop(0.55, `rgba(255,174,111,${0.12 * sunlight})`);
  glow.addColorStop(1, "rgba(255,174,111,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizon + 30);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#FFF0C8";
  ctx.shadowColor = "rgba(255,218,161,.9)";
  ctx.shadowBlur = h * 0.035;
  ctx.beginPath();
  ctx.arc(sunX, sunY, Math.max(12, h * 0.026), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawCloud(ctx, w * 0.24, h * 0.12, w * 0.37, h * 0.15, 0.62, true, time);
  drawCloud(ctx, w * 0.55, h * 0.14, w * 0.42, h * 0.17, 0.48, false, time + 80);
  drawCloud(ctx, w * 0.89, h * 0.2, w * 0.34, h * 0.19, 0.53, false, time + 150);
  drawCloud(ctx, w * 0.06, h * 0.24, w * 0.3, h * 0.11, 0.34, true, time + 30);

  // Distant, softly lit hill silhouettes.
  ctx.fillStyle = "rgba(112,112,76,.25)";
  ctx.beginPath();
  ctx.moveTo(0, horizon * 0.91);
  ctx.bezierCurveTo(w * 0.12, horizon * 0.78, w * 0.2, horizon * 0.91, w * 0.34, horizon * 0.86);
  ctx.bezierCurveTo(w * 0.49, horizon * 0.8, w * 0.57, horizon * 0.96, w * 0.72, horizon * 0.88);
  ctx.bezierCurveTo(w * 0.83, horizon * 0.81, w * 0.92, horizon * 0.87, w, horizon * 0.82);
  ctx.lineTo(w, horizon + 10);
  ctx.lineTo(0, horizon + 10);
  ctx.closePath();
  ctx.fill();
}

function drawTree(ctx: Ctx, x: number, baseY: number, size: number, time: number, wind: number) {
  const sway = Math.sin(time * 0.65) * wind * 0.018;
  ctx.save();
  ctx.translate(x, baseY);

  // Soft ground shadow.
  const shadow = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.9);
  shadow.addColorStop(0, "rgba(39,47,26,.34)");
  shadow.addColorStop(1, "rgba(39,47,26,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.8, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk and branches.
  ctx.strokeStyle = "#493B2B";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(3, size * 0.075);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.02, -size * 0.42, -size * 0.04, -size * 0.65, sway * size, -size * 1.02);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.6, size * 0.027);
  const branches = [
    [-0.02, -0.34, -0.34, -0.79], [0.01, -0.49, 0.35, -0.84], [-0.01, -0.64, -0.48, -0.96],
    [0.02, -0.7, 0.5, -1.04], [0, -0.82, -0.18, -1.17],
  ] as const;
  for (const [x1, y1, x2, y2] of branches) {
    ctx.beginPath();
    ctx.moveTo(size * x1, size * y1);
    ctx.quadraticCurveTo(size * (x1 + x2) * 0.55 + sway * size, size * (y1 + y2) * 0.48, size * x2 + sway * size, size * y2);
    ctx.stroke();
  }

  // Broad canopy made of overlapping leaf masses, with a warm rim on the sun side.
  const crown = [
    [-0.46, -1.02, 0.36], [-0.29, -1.2, 0.39], [-0.02, -1.27, 0.41], [0.25, -1.2, 0.4],
    [0.48, -1.03, 0.31], [-0.52, -0.82, 0.31], [-0.23, -0.92, 0.4], [0.1, -0.91, 0.42],
    [0.4, -0.83, 0.31], [0.03, -1.48, 0.25],
  ] as const;
  for (let i = 0; i < crown.length; i += 1) {
    const [cx, cy, r] = crown[i]!;
    const pulse = Math.sin(time * 0.8 + i * 1.7) * wind * 0.008;
    const leaf = ctx.createRadialGradient(size * (cx - 0.12), size * (cy - 0.13), size * 0.02, size * cx, size * cy, size * r);
    leaf.addColorStop(0, i % 3 === 0 ? "#71864A" : "#536E3B");
    leaf.addColorStop(0.64, i % 2 === 0 ? "#3F5B32" : "#4A6535");
    leaf.addColorStop(1, "#29452B");
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.ellipse(size * (cx + pulse), size * cy, size * r, size * r * 0.78, pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scattered leaf highlights.
  const random = mulberry32(81);
  for (let i = 0; i < 95; i += 1) {
    const a = random() * Math.PI * 2;
    const rr = Math.sqrt(random()) * size * 0.43;
    const lx = Math.cos(a) * rr;
    const ly = -size * 1.08 + Math.sin(a) * rr * 0.77;
    ctx.fillStyle = i % 4 === 0 ? "rgba(195,169,92,.4)" : "rgba(143,164,84,.24)";
    ctx.beginPath();
    ctx.ellipse(lx + sway * size, ly, size * (0.012 + random() * 0.013), size * 0.008, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// [ext] `cam` projects every ground element through the dolly; `detail` thins blades on small screens.
function drawField(ctx: Ctx, w: number, h: number, time: number, cam: Camera = staticCamera(w, h), detail = 1) {
  const horizon = h * 0.585;
  const ground = ctx.createLinearGradient(0, horizon, 0, h);
  ground.addColorStop(0, "#A68B43");
  ground.addColorStop(0.24, "#9D8A37");
  ground.addColorStop(0.58, "#53602C");
  ground.addColorStop(1, "#192B20");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, w, h - horizon - cam.tilt + 2); // [ext] covers the strip revealed by tilt

  // Rolling amber bands give the field a broad, cinematic depth cue.
  for (let row = 0; row < 9; row += 1) {
    const y0 = horizon + Math.pow(row / 9, 1.7) * (h - horizon) * 0.96;
    const p = project(cam, w * 0.5, y0);
    if (p.k < NEAR_CULL + 0.02) continue;
    const y = p.y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.27, y - h * 0.028 * p.s, w * 0.67, y + h * 0.025 * p.s, w, y - h * 0.012 * p.s);
    ctx.strokeStyle = row < 3 ? "rgba(235,190,92,.16)" : "rgba(215,177,71,.12)";
    ctx.lineWidth = (1 + row * 0.9) * Math.min(p.s, 2.5);
    ctx.stroke();
  }

  // Perspective crop rows converging near the middle distance.
  const vanishX = w * 0.53;
  for (let i = -13; i <= 13; i += 1) {
    const edge = i / 13;
    const a = project(cam, vanishX + edge * w * 0.014, horizon + h * 0.012);
    const b = project(cam, vanishX + edge * w * 0.27, horizon + h * 0.2);
    const c = project(cam, vanishX + edge * w * 0.48, h * 0.82);
    const d = project(cam, vanishX + edge * w * 0.78, h * 1.13);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(247,211,126,.22)" : "rgba(24,47,28,.21)";
    ctx.lineWidth = Math.max(1, h * (0.0007 + Math.abs(edge) * 0.002) * (1 + cam.dolly * 2));
    ctx.stroke();
  }

  // Short field blades, densest in the foreground.
  // [ext] Same blades (same random sequence), but batched into depth bins: one stroke per
  // bin and colour instead of one per blade (≈1500 → 12 draw calls).
  const BINS = 6;
  const light: Path2D[] = Array.from({ length: BINS }, () => new Path2D());
  const dark: Path2D[] = Array.from({ length: BINS }, () => new Path2D());
  const random = mulberry32(1357);
  const blades = Math.round(1500 * detail);
  for (let i = 0; i < blades; i += 1) {
    const y0 = horizon + Math.pow(random(), 0.62) * (h - horizon);
    const x0 = random() * w;
    const depth = (y0 - horizon) / (h - horizon);
    const lenRand = random();
    const colRand = random();
    const p = project(cam, x0, y0);
    if (p.k < NEAR_CULL + 0.05 || p.x < -20 || p.x > w + 20 || p.y > h - cam.tilt + 40) continue;
    const x = p.x;
    const y = p.y;
    const length = h * (0.003 + depth * 0.019) * (0.5 + lenRand) * p.s;
    const sway = Math.sin(time * 1.05 + x0 * 0.018 + y0 * 0.023) * (0.5 + depth) * 2.5 * p.s;
    const bin = Math.min(BINS - 1, Math.floor(depth * BINS));
    const path = (colRand > 0.57 ? light : dark)[bin]!;
    path.moveTo(x, y);
    path.quadraticCurveTo(x + sway * 0.4, y - length * 0.55, x + sway, y - length);
  }
  for (let bin = 0; bin < BINS; bin += 1) {
    const depth = (bin + 0.5) / BINS;
    const s = 1 / Math.max(1 - cam.dolly * depth, NEAR_CULL);
    ctx.lineWidth = (0.5 + depth * 1.15) * Math.min(s, 3);
    ctx.strokeStyle = `rgba(216,190,104,${0.08 + depth * 0.23})`;
    ctx.stroke(light[bin]!);
    ctx.strokeStyle = `rgba(27,54,31,${0.08 + depth * 0.28})`;
    ctx.stroke(dark[bin]!);
  }
}

function bollOpening(seed: number, time: number) {
  // A staggered, slow time-lapse makes individual bolls appear to open over time.
  // (Ambient bolls only — the featured boll is driven by scroll, see drawFeaturedBoll.)
  const phase = (time + seed * 61) % 84;
  return 0.38 + 0.62 * smoothstep(0, 18, phase);
}

function drawCottonBoll(ctx: Ctx, x: number, y: number, r: number, seed: number, light: number, time: number) {
  drawCottonBollAt(ctx, x, y, r, seed, light, bollOpening(seed, time));
}

// [ext] Same drawing as the original, with the opening value passed in (so it can be cached).
function drawCottonBollAt(ctx: Ctx, x: number, y: number, r: number, seed: number, light: number, opening: number) {
  const random = mulberry32(Math.floor(seed * 100000) + 7);
  const spread = 0.42 + opening * 0.58;
  // Green-brown bracts behind the white locks.
  ctx.fillStyle = "#43502B";
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.28);
    ctx.quadraticCurveTo(x + Math.cos(angle - 0.2) * r * 0.7, y + Math.sin(angle - 0.2) * r * 0.62, x + Math.cos(angle) * r * 1.18 * spread, y + Math.sin(angle) * r * 0.95 * spread);
    ctx.quadraticCurveTo(x + Math.cos(angle + 0.25) * r * 0.43, y + Math.sin(angle + 0.25) * r * 0.48, x, y + r * 0.28);
    ctx.fill();
  }

  // Distinct rounded locks make the boll read as cotton rather than a flower.
  for (let i = 0; i < 5; i += 1) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const ox = Math.cos(a) * r * 0.38 * spread;
    const oy = Math.sin(a) * r * 0.35 * spread;
    const rr = r * (0.47 + random() * 0.08) * (0.68 + 0.32 * opening);
    const fluff = ctx.createRadialGradient(x + ox - rr * 0.25, y + oy - rr * 0.28, 1, x + ox, y + oy, rr * 1.1);
    fluff.addColorStop(0, light > 0.5 ? "#FFFDF3" : "#F2F0E5");
    fluff.addColorStop(0.72, "#EDECE1");
    fluff.addColorStop(1, "rgba(210,209,193,.9)");
    ctx.fillStyle = fluff;
    ctx.beginPath();
    ctx.ellipse(x + ox, y + oy, rr * 0.88, rr * 0.78, a * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Fine fibre wisps catch the light around the edge.
    ctx.strokeStyle = "rgba(255,255,244,.38)";
    ctx.lineWidth = Math.max(0.45, r * 0.018);
    for (let k = 0; k < 4; k += 1) {
      const aa = a + (random() - 0.5) * 0.8;
      const sx = x + ox + Math.cos(aa) * rr * 0.55;
      const sy = y + oy + Math.sin(aa) * rr * 0.55;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(aa) * rr * 0.34, sy + Math.sin(aa) * rr * 0.3, sx + Math.cos(aa) * rr * 0.72, sy + Math.sin(aa) * rr * 0.7);
      ctx.stroke();
    }
  }
}

/* [ext] Boll sprite cache ------------------------------------------------
   ~250 ambient bolls × (5 gradients + 25 paths) per frame was the single biggest cost of the
   scene. Small bolls are now stamped from sprites rendered by drawCottonBollAt itself,
   quantised to 9 opening stages × 4 seed variants × 2 light levels (created on demand). */
const SPRITE_R = 44;
const SPRITE_LEVELS = 9;
const SPRITE_VARIANTS = 4;
const SPRITE_MAX_R = 54; // larger, near-camera bolls are drawn live for full crispness
const spriteCache = new Map<string, CanvasImageSource>();
let spriteScale = 1;

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  return typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
}

function bollSprite(variant: number, level: number, lightHi: boolean): CanvasImageSource {
  const key = `${variant}:${level}:${lightHi ? 1 : 0}:${spriteScale}`;
  let sprite = spriteCache.get(key);
  if (sprite) return sprite;
  const R = SPRITE_R * spriteScale;
  const size = Math.ceil(R * 3);
  const c = makeCanvas(size, size);
  const cx = c.getContext("2d") as Ctx | null;
  if (!cx) throw new Error("2D context unavailable");
  const opening = 0.38 + 0.62 * (level / (SPRITE_LEVELS - 1));
  drawCottonBollAt(cx, size / 2, size / 2, R, (variant + 0.5) / SPRITE_VARIANTS, lightHi ? 1 : 0, opening);
  sprite = c as CanvasImageSource;
  spriteCache.set(key, sprite);
  return sprite;
}

function drawCottonBollFast(ctx: Ctx, x: number, y: number, r: number, seed: number, light: number, time: number) {
  if (r > SPRITE_MAX_R) { drawCottonBoll(ctx, x, y, r, seed, light, time); return; }
  const o = bollOpening(seed, time);
  const level = Math.round(((o - 0.38) / 0.62) * (SPRITE_LEVELS - 1));
  const variant = Math.floor(seed * SPRITE_VARIANTS) % SPRITE_VARIANTS;
  const sprite = bollSprite(variant, level, light > 0.5);
  const R = SPRITE_R * spriteScale;
  const k = r / R;
  const half = (Math.ceil(R * 3) / 2) * k;
  ctx.drawImage(sprite, x - half, y - half, half * 2, half * 2);
}

function drawLeaf(ctx: Ctx, x: number, y: number, length: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.35, -length * 0.48, length, -length * 0.08);
  ctx.quadraticCurveTo(length * 0.62, length * 0.38, 0, 0);
  ctx.fill();
  ctx.strokeStyle = "rgba(220,205,132,.32)";
  ctx.lineWidth = Math.max(0.45, length * 0.018);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.48, -length * 0.02, length * 0.92, -length * 0.08);
  ctx.stroke();
  ctx.restore();
}

// [ext] Cotton leaves are palmately lobed (three to five lobes on a long petiole), not
// lanceolate. Used for near plants and the featured plant, where the shape is readable.
function drawLobedLeaf(ctx: Ctx, x: number, y: number, length: number, angle: number, color: string, lobes = 3, light = 0.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const petiole = length * 0.28;
  ctx.strokeStyle = "#4C5E2E";
  ctx.lineWidth = Math.max(0.6, length * 0.025);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(petiole * 0.5, -petiole * 0.12, petiole, 0);
  ctx.stroke();
  ctx.translate(petiole, 0);
  const L = length * 0.72;
  const spread = lobes === 5 ? [-1.15, -0.58, 0, 0.58, 1.15] : [-0.78, 0, 0.78];
  const tipLen = lobes === 5 ? [0.62, 0.86, 1, 0.86, 0.62] : [0.78, 1, 0.78];
  const grad = ctx.createLinearGradient(0, -L * 0.6, L, L * 0.3);
  grad.addColorStop(0, light > 0.5 ? "#7E9150" : "#5F7440");
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, "#2F4A2A");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 0; i < spread.length; i += 1) {
    const a = spread[i]!;
    const r = L * tipLen[i]!;
    const prev = i === 0 ? a - 0.55 : (spread[i - 1]! + a) / 2;
    const next = i === spread.length - 1 ? a + 0.55 : (spread[i + 1]! + a) / 2;
    // sinus (notch) before this lobe, then out to its pointed tip and back
    const sr = i === 0 ? L * 0.12 : L * 0.42;
    ctx.lineTo(Math.cos(prev) * sr, Math.sin(prev) * sr);
    ctx.quadraticCurveTo(Math.cos(a - 0.3) * r * 0.82, Math.sin(a - 0.3) * r * 0.82, Math.cos(a) * r, Math.sin(a) * r);
    const er = i === spread.length - 1 ? L * 0.12 : L * 0.42;
    ctx.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.82, Math.sin(a + 0.3) * r * 0.82, Math.cos(next) * er, Math.sin(next) * er);
  }
  ctx.closePath();
  ctx.fill();
  // Palmate veins.
  ctx.strokeStyle = "rgba(226,214,150,.38)";
  ctx.lineWidth = Math.max(0.4, length * 0.012);
  for (let i = 0; i < spread.length; i += 1) {
    const a = spread[i]!;
    const r = L * tipLen[i]! * 0.88;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 - r * 0.03, Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

// [ext] `cam` places the plant in perspective; near plants that pass the lens fade out.
function drawPlant(ctx: Ctx, plant: Plant, w: number, h: number, time: number, wind: number, zoom: number, cam: Camera = staticCamera(w, h)) {
  const depth = clamp((plant.y - 0.585) / 0.47, 0, 1);
  const p = project(cam, plant.x * w, plant.y * h);
  if (p.k < NEAR_CULL + 0.04) return;
  const passing = smoothstep(NEAR_CULL + 0.04, 0.42, p.k); // 1 = fully visible
  const size = h * plant.height * zoom * p.s;
  const x = p.x;
  const baseY = p.y;
  if (x < -size || x > w + size || baseY - size > h - cam.tilt) return;
  const sway = Math.sin(time * 0.9 + plant.seed * 18) * wind * (0.004 + depth * 0.015);
  const topX = x + (plant.lean + sway) * size * 3;
  const topY = baseY - size;
  const stemColor = depth > 0.5 ? "#38502B" : "#61703A";
  const alpha = (0.48 + depth * 0.5) * passing;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stemColor;
  ctx.lineWidth = Math.max(1, size * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + sway * size, baseY - size * 0.52, topX, topY);
  ctx.stroke();

  const leafLength = size * (0.25 + depth * 0.09);
  const leafColors = ["#506936", "#66783D", "#3D5D32"];
  const lobed = size > h * 0.09; // [ext] readable size → botanically shaped leaves
  for (let i = 0; i < 4; i += 1) {
    const t = 0.28 + i * 0.16;
    const lx = x + (topX - x) * t;
    const ly = baseY - size * t;
    const side = i % 2 === 0 ? -1 : 1;
    const c1 = leafColors[(i + Math.floor(plant.seed * 3)) % leafColors.length]!;
    const c2 = leafColors[(i + 1) % leafColors.length]!;
    if (lobed) {
      drawLobedLeaf(ctx, lx, ly, leafLength * (0.9 - i * 0.08), (side < 0 ? Math.PI : 0) - side * (0.35 + plant.seed * 0.3) + sway * 2, c1);
      drawLobedLeaf(ctx, lx, ly + size * 0.05, leafLength * 0.72, (side < 0 ? 0 : Math.PI) + side * 0.5 + sway * 2, c2);
    } else {
      drawLeaf(ctx, lx, ly, leafLength * (0.9 - i * 0.08), side * (0.45 + (plant.seed * 0.3)) + sway * 2, c1);
      drawLeaf(ctx, lx, ly + size * 0.05, leafLength * 0.77, -side * 0.9 + sway * 2, c2);
    }
  }

  // Bolls sit on short branches along the upper half of the stalk.
  for (let i = 0; i < plant.bollCount; i += 1) {
    const t = 0.43 + (i / Math.max(1, plant.bollCount - 1)) * 0.46;
    const side = i % 2 === 0 ? -1 : 1;
    const bx = x + (topX - x) * t + side * size * 0.14;
    const by = baseY - size * t - size * 0.015;
    const br = size * (0.13 + depth * 0.035);
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = Math.max(0.7, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(x + (topX - x) * t, baseY - size * t);
    ctx.lineTo(bx, by);
    ctx.stroke();
    drawCottonBollFast(ctx, bx, by, br, plant.seed + i * 0.13, 1 - depth * 0.3, time);
  }
  ctx.restore();
}

function drawAtmosphere(ctx: Ctx, w: number, h: number, time: number, amount: number) {
  const random = mulberry32(99);
  const count = Math.round(80 * clamp(amount, 0, 100) / 50);
  for (let i = 0; i < count; i += 1) {
    const seed = random();
    const x = ((seed * w + time * (3 + seed * 5)) % (w + 40)) - 20;
    const y = h * (0.38 + random() * 0.55) + Math.sin(time * 0.3 + seed * 20) * 5;
    const r = 0.5 + random() * 1.8;
    ctx.fillStyle = `rgba(255,239,203,${0.12 + random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ */
/* [ext] Featured cotton plant — scroll-driven boll opening              */
/* ------------------------------------------------------------------ */
// Botanical structure, front-on view of the boll:
//   0.00–0.25  closed, mature green capsule (five carpels, seams meeting at the tip),
//              three toothed bracts framing it
//   0.25–0.45  the seams split; first white lint shows in the cracks
//   0.45–0.80  carpel walls peel back and dry from green to brown; locks swell out
//   0.80–1.00  fully open boll: five fluffy locks held by a pointed brown burr
const LOCULES = 5;

function drawBract(ctx: Ctx, angle: number, r: number, dry: number) {
  ctx.save();
  ctx.rotate(angle);
  const L = r * 1.42;
  const W = r * 0.62;
  ctx.fillStyle = dry > 0.5 ? "#5E5A2E" : "#4D6A33";
  ctx.beginPath();
  ctx.moveTo(r * 0.2, 0);
  // toothed (laciniate) margin — characteristic of cotton bracts
  const teeth = 7;
  for (let i = 0; i <= teeth; i += 1) {
    const t = i / teeth;
    const along = r * 0.2 + (L - r * 0.2) * t;
    const half = W * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - t * 0.35);
    ctx.lineTo(along, -half - (i % 2 === 0 ? r * 0.06 : 0));
  }
  for (let i = teeth; i >= 0; i -= 1) {
    const t = i / teeth;
    const along = r * 0.2 + (L - r * 0.2) * t;
    const half = W * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (1 - t * 0.35);
    ctx.lineTo(along, half + (i % 2 === 0 ? r * 0.06 : 0));
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(205,200,130,.35)";
  ctx.lineWidth = Math.max(0.6, r * 0.02);
  ctx.beginPath();
  ctx.moveTo(r * 0.25, 0);
  ctx.lineTo(L * 0.92, 0);
  ctx.stroke();
  ctx.restore();
}

function drawLock(ctx: Ctx, x: number, y: number, rr: number, angle: number, glow: number, random: () => number) {
  // A lock is a mass of fine fibres, not a ball: built from many small, soft-edged puffs,
  // lit from the upper-left (the low sun), with a soft contact shadow where it meets the burr.
  ctx.save();
  const shadow = ctx.createRadialGradient(x + rr * 0.18, y + rr * 0.28, rr * 0.2, x + rr * 0.18, y + rr * 0.28, rr * 1.15);
  shadow.addColorStop(0, "rgba(74,56,32,0.35)");
  shadow.addColorStop(1, "rgba(74,56,32,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(x + rr * 0.18, y + rr * 0.28, rr * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Body of the lock: one soft mass the puffs add texture to.
  const body = ctx.createRadialGradient(x - rr * 0.28, y - rr * 0.32, rr * 0.1, x, y, rr * 0.98);
  body.addColorStop(0, "rgba(255,253,246,0.98)");
  body.addColorStop(0.6, "rgba(242,236,220,0.95)");
  body.addColorStop(0.9, "rgba(214,204,180,0.55)");
  body.addColorStop(1, "rgba(214,204,180,0)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, rr * 0.98, rr * 0.88, angle, 0, Math.PI * 2);
  ctx.fill();

  const puffs = 34;
  for (let b = 0; b < puffs; b += 1) {
    // Distribute puffs in a lumpy ellipse, elongated along the lock's direction.
    const pa = random() * Math.PI * 2;
    const pd = Math.sqrt(random()) * rr * 0.78;
    const px = x + Math.cos(pa) * pd * 1.05 * Math.abs(Math.cos(pa - angle) * 0.25 + 0.85);
    const py = y + Math.sin(pa) * pd * 0.92;
    const pr = rr * (0.13 + random() * 0.14);
    // Facing the light (upper-left) → brighter; away → warmer grey.
    const facing = clamp(0.5 - ((px - x) + (py - y)) / (rr * 2.2), 0, 1);
    const core = facing > 0.55 ? "rgba(255,254,247,0.6)" : facing > 0.3 ? "rgba(246,241,228,0.55)" : "rgba(222,212,188,0.55)";
    const g = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.05, px, py, pr);
    g.addColorStop(0, core);
    g.addColorStop(0.65, facing > 0.4 ? "rgba(244,239,225,0.35)" : "rgba(214,202,176,0.35)");
    g.addColorStop(1, "rgba(230,222,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fibre wisps — fine, slightly curled strands escaping the lock edge; they catch the sun.
  const wisps = 30;
  ctx.lineCap = "round";
  for (let k = 0; k < wisps; k += 1) {
    const aa = angle + (random() - 0.5) * 2.6;
    const sx = x + Math.cos(aa) * rr * (0.55 + random() * 0.2);
    const sy = y + Math.sin(aa) * rr * (0.5 + random() * 0.2);
    const len = rr * (0.18 + random() * 0.42);
    const curl = (random() - 0.5) * 1.2;
    const lit = Math.cos(aa + Math.PI * 0.75) > 0 ? 1 : 0.55;
    ctx.strokeStyle = `rgba(255,${248 - Math.round(glow * 34)},${232 - Math.round(glow * 86)},${(0.18 + glow * 0.32) * lit})`;
    ctx.lineWidth = Math.max(0.3, rr * 0.008);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.cos(aa + curl) * len * 0.6, sy + Math.sin(aa + curl) * len * 0.6, sx + Math.cos(aa + curl * 1.6) * len, sy + Math.sin(aa + curl * 1.6) * len);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFeaturedBoll(ctx: Ctx, x: number, y: number, r: number, open: number, time: number, glow = 0) {
  const o = clamp(open, 0, 1);
  const crack = smoothstep(0.22, 0.45, o);   // seams split
  const peel = smoothstep(0.4, 0.82, o);     // carpel walls fold back
  const swell = smoothstep(0.42, 0.96, o);   // lint expands
  const dry = smoothstep(0.34, 0.72, o);     // green → brown burr
  const random = mulberry32(4242);
  const base = -Math.PI / 2;
  const breathe = Math.sin(time * 0.6) * 0.012 * swell; // ambient life, independent of scroll

  ctx.save();
  ctx.translate(x, y);

  // Bracts (behind everything), slightly spreading as the boll opens.
  for (const a of [Math.PI * 0.2, Math.PI * 0.8, Math.PI * 0.5]) drawBract(ctx, a + (a - Math.PI / 2) * 0.25 * peel, r * lerp(1, 0.78, peel), dry);

  // Carpel walls (valves). Closed they tile a sphere; opening, each narrows into a
  // pointed, recurved burr segment that sits between two locks.
  for (let i = 0; i < LOCULES; i += 1) {
    const c = base + ((i + 0.5) * Math.PI * 2) / LOCULES;
    const hw = lerp(Math.PI / LOCULES - 0.015 - crack * 0.05, 0.16, peel);
    const rim = r * lerp(0.96, 0.72, peel);
    const tip = r * lerp(1.0, 1.42, peel);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.3);
    const green = ["#7C9A4B", "#58773A", "#3A5530"];
    const brown = ["#6E4A28", "#4A3119", "#2A1B0E"];
    g.addColorStop(0, mixHex(green[0]!, brown[0]!, dry));
    g.addColorStop(0.6, mixHex(green[1]!, brown[1]!, dry));
    g.addColorStop(1, mixHex(green[2]!, brown[2]!, dry));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(Math.cos(c) * r * 0.08 * peel, Math.sin(c) * r * 0.08 * peel);
    ctx.lineTo(Math.cos(c - hw) * rim, Math.sin(c - hw) * rim);
    // closed: rounded outer edge; open: pointed tip
    const ctrl = lerp(1 / Math.cos(hw), 1, peel);
    ctx.quadraticCurveTo(Math.cos(c - hw * 0.5) * tip * ctrl, Math.sin(c - hw * 0.5) * tip * ctrl, Math.cos(c) * tip, Math.sin(c) * tip);
    ctx.quadraticCurveTo(Math.cos(c + hw * 0.5) * tip * ctrl, Math.sin(c + hw * 0.5) * tip * ctrl, Math.cos(c + hw) * rim, Math.sin(c + hw) * rim);
    ctx.closePath();
    ctx.fill();
    // inner surface of a peeled wall catches warm light
    if (peel > 0.05) {
      ctx.strokeStyle = `rgba(214,160,92,${0.45 * peel})`;
      ctx.lineWidth = Math.max(0.6, r * 0.018);
      ctx.beginPath();
      ctx.moveTo(Math.cos(c - hw * 0.8) * rim * 0.95, Math.sin(c - hw * 0.8) * rim * 0.95);
      ctx.lineTo(Math.cos(c) * tip * 0.96, Math.sin(c) * tip * 0.96);
      ctx.stroke();
    }
  }

  // Closed capsule: glossy highlight + pointed tip.
  if (peel < 0.6) {
    const a = 1 - smoothstep(0.2, 0.6, peel);
    const hl = ctx.createRadialGradient(-r * 0.32, -r * 0.38, 0, -r * 0.32, -r * 0.38, r * 0.7);
    hl.addColorStop(0, `rgba(236,240,186,${0.42 * a})`);
    hl.addColorStop(1, "rgba(236,240,186,0)");
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(52,74,36,${a})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Seams. Closed: fine dark sutures. Cracking: white lint visible inside the split.
  for (let i = 0; i < LOCULES; i += 1) {
    const a = base + (i * Math.PI * 2) / LOCULES;
    if (crack < 0.98) {
      ctx.strokeStyle = `rgba(38,52,28,${0.7 * (1 - peel)})`;
      ctx.lineWidth = Math.max(0.7, r * 0.022);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a + 0.12) * r * 0.55, Math.sin(a + 0.12) * r * 0.55, Math.cos(a) * r * 0.96, Math.sin(a) * r * 0.96);
      ctx.stroke();
    }
    if (crack > 0 && swell < 0.6) {
      const wv = r * 0.06 * crack * (1 - swell);
      ctx.fillStyle = `rgba(250,248,238,${crack * (1 - swell * 1.2)})`;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.42 * crack, wv, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Locks of lint emerge where the seams split.
  if (swell > 0) {
    const order = [3, 4, 0, 2, 1]; // back locks first, front-lower last
    for (const i of order) {
      const a = base + (i * Math.PI * 2) / LOCULES;
      const rr = r * lerp(0.3, 0.66, swell) * (1 + breathe);
      const dist = r * lerp(0.28, 0.5, swell);
      drawLock(ctx, Math.cos(a) * dist, Math.sin(a) * dist, rr, a, glow, random);
    }
    // central fill so the locks read as one boll
    const core = ctx.createRadialGradient(-r * 0.1, -r * 0.12, 0, 0, 0, r * 0.45 * swell);
    core.addColorStop(0, `rgba(255,253,244,${swell})`);
    core.addColorStop(1, "rgba(240,236,222,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45 * swell, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden-hour rim light on the lint.
  if (glow > 0 && swell > 0) {
    ctx.globalCompositeOperation = "lighter";
    // Concentric gradient so the lit area fades to nothing well inside the filled rect (no hard edge).
    const rim = ctx.createRadialGradient(-r * 0.45, -r * 0.5, 0, -r * 0.45, -r * 0.5, r * 1.3);
    rim.addColorStop(0, `rgba(255,196,110,${0.3 * glow * swell})`);
    rim.addColorStop(1, "rgba(255,196,110,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(-r * 1.8, -r * 1.85, r * 2.7, r * 2.7);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}

export type FeaturedState = {
  /** 0 closed green boll → 1 fully open. */
  boll: number;
  /** 0 = part of the field, 1 = boll centred and dominant in frame. */
  approach: number;
  /** 0–1 golden light on the fibres. */
  glow: number;
  /** Boll radius (px) at approach = 1. Lets a caller match another shot, e.g. a macro video. */
  targetRadius?: number;
};

/** World position of the featured plant (same normalised space as `Plant`). */
export const FEATURED = { x: 0.47, y: 0.88, height: 0.19 } as const;

export function drawFeaturedPlant(ctx: Ctx, w: number, h: number, time: number, wind: number, zoom: number, cam: Camera, state: FeaturedState) {
  const p = project(cam, FEATURED.x * w, FEATURED.y * h);
  const size = h * FEATURED.height * zoom * p.s;
  const sway = Math.sin(time * 0.7 + 1.3) * wind * 0.01 * (1 - state.approach * 0.8);
  const baseX = p.x;
  const baseY = p.y;
  const topX = baseX + (0.03 + sway) * size;
  const topY = baseY - size;
  const bollR = size * 0.14;
  const bx = topX + size * 0.02;
  const by = topY + bollR * 0.4;

  // Approach: carry the boll to frame centre and grow it to a macro scale.
  const e = easeInOut(clamp(state.approach, 0, 1));
  const targetR = state.targetRadius ?? Math.min(w, h * 0.9) * 0.2;
  const k = lerp(1, Math.max(1, targetR / Math.max(1, bollR)), e);
  const tx = lerp(bx, w * 0.5, e);
  const ty = lerp(by, h * 0.5, e);

  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(k, k);
  ctx.translate(-bx, -by);

  // Main stalk with a slight zig-zag at nodes.
  ctx.strokeStyle = "#3F5530";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY + size * 0.4);
  ctx.bezierCurveTo(baseX - size * 0.04, baseY - size * 0.35, topX + size * 0.05, topY + size * 0.4, bx, by + bollR * 0.6);
  ctx.stroke();

  // Lobed leaves on long petioles.
  const leaves = [
    { t: 0.32, side: -1, len: 0.5 }, { t: 0.48, side: 1, len: 0.46 },
    { t: 0.66, side: -1, len: 0.38 }, { t: 0.8, side: 1, len: 0.3 },
  ];
  for (const lf of leaves) {
    const lx = lerp(baseX, bx, lf.t);
    const ly = lerp(baseY, by, lf.t);
    const flutter = Math.sin(time * 1.3 + lf.t * 9) * wind * 0.04;
    drawLobedLeaf(ctx, lx, ly, size * lf.len, (lf.side < 0 ? Math.PI + 0.35 : -0.35) + flutter, lf.t > 0.6 ? "#557A3A" : "#466A33", 5, lf.side < 0 ? 0.8 : 0.4);
  }

  // A second, still-green boll lower on the stalk (cotton sets bolls at several nodes).
  const gx = lerp(baseX, bx, 0.56) + size * 0.12;
  const gy = lerp(baseY, by, 0.56);
  ctx.strokeStyle = "#3F5530";
  ctx.lineWidth = Math.max(0.8, size * 0.018);
  ctx.beginPath();
  ctx.moveTo(lerp(baseX, bx, 0.56), gy);
  ctx.lineTo(gx, gy - size * 0.02);
  ctx.stroke();
  drawFeaturedBoll(ctx, gx, gy - size * 0.02, bollR * 0.55, Math.min(0.2, state.boll * 0.2), time, 0);

  // Featured boll.
  drawFeaturedBoll(ctx, bx, by, bollR, state.boll, time, state.glow);
  ctx.restore();

  return { x: tx, y: ty, r: bollR * k };
}

/* ------------------------------------------------------------------ */
/* Scene composition                                                    */
/* ------------------------------------------------------------------ */
export const DEFAULT_SUN: Readonly<{ x: number; y: number }> = { x: 0.105, y: 0.43 };

export type SceneProps = {
  scale: number;
  density: number;
  particles: number;
  sunlight: number;
  wind: number;
  /** 0–1 externally driven camera. Undefined → the original slow automatic push. */
  cameraProgress?: number;
  /** [ext] How far the camera may travel at cameraProgress = 1. 0.12 ≈ the original subtle push. */
  cameraDepth?: number;
  /** [ext] Normalised sun position. */
  sun?: { x: number; y: number };
  /** [ext] 0.35–1 blade / dot density multiplier for small screens. */
  detail?: number;
  /** [ext] Featured plant; null/undefined → not drawn. */
  featured?: FeaturedState | null;
};

function staticCamera(w: number, h: number): Camera {
  return { dolly: 0, vx: w * 0.53, tilt: 0, horizon: h * 0.585, h };
}

export function cameraFor(w: number, h: number, progress: number, depth: number): Camera {
  const e = easeInOut(clamp(progress, 0, 1));
  return { dolly: e * depth, vx: w * 0.5, tilt: -e * depth * h * 0.16, horizon: h * 0.585, h };
}

type SkyCache = { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: Ctx; key: string; at: number } | null;

/**
 * Draws the scene. `layers.featured`, when provided, receives the featured plant on a
 * separate canvas so the field can be defocused independently (depth of field).
 */
export function drawScene(
  ctx: Ctx,
  w: number,
  h: number,
  time: number,
  props: SceneProps,
  plants: Plant[],
  cache?: { sky: SkyCache; dpr: number },
  featuredCtx?: Ctx | null,
) {
  ctx.clearRect(0, 0, w, h);
  const autoPush = 0.5 - Math.cos((time / 52) * Math.PI * 2) * 0.5;
  const progress = props.cameraProgress == null ? autoPush : clamp(props.cameraProgress, 0, 1);
  const zoom = (props.scale / 100) * (1 + progress * 0.085);
  const parallax = (progress - 0.5) * 0.018;
  const cam = cameraFor(w, h, progress, props.cameraDepth ?? 0.12);
  const detail = clamp(props.detail ?? 1, 0.3, 1);
  const sun = props.sun ?? DEFAULT_SUN;

  // Sky: cached (cloud blur is expensive; the drift is < 0.4 px/s), refreshed every 1.5 s.
  // A tilt rotates the view, so sky and ground shift together; only the dolly is depth-dependent.
  ctx.save();
  ctx.translate(0, cam.tilt);
  if (cache) {
    const key = `${w}x${h}@${cache.dpr}:${Math.round(props.sunlight)}:${sun.x},${sun.y}`;
    if (!cache.sky || cache.sky.key !== key || Math.abs(time - cache.sky.at) > 1.5) {
      cache.sky = renderSkyCache(cache.sky, w, h, time, props.sunlight / 100, sun, cache.dpr, key);
    }
    ctx.drawImage(cache.sky.canvas as CanvasImageSource, 0, 0, w, h);
  } else {
    drawSky(ctx, w, h, time, props.sunlight / 100, sun);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, cam.tilt);
  drawField(ctx, w, h, time, cam, detail);

  // Tree remains a recognizable echo of the supplied landscape reference.
  const tp = project(cam, w * (0.53 - parallax), h * 0.615);
  // [ext] the tree follows `scale` too (identical at the default 100) so portrait screens can shrink the composition.
  drawTree(ctx, tp.x, tp.y, h * 0.205 * (props.scale / 100) * (1 + progress * 0.06) * tp.s, time, props.wind / 50);

  // Far cotton dots establish the plantation before the larger foreground plants.
  const farRandom = mulberry32(2026);
  const dots = Math.round(240 * detail);
  for (let i = 0; i < dots; i += 1) {
    const p = project(cam, farRandom() * w, h * (0.586 + farRandom() * 0.095));
    const r = h * (0.0015 + farRandom() * 0.0035) * p.s;
    ctx.fillStyle = `rgba(247,242,220,${0.25 + farRandom() * 0.42})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const visible = Math.floor(plants.length * clamp(props.density, 5, 100) / 100);
  for (let i = 0; i < visible; i += 1) {
    drawPlant(ctx, plants[i]!, w, h, time, props.wind / 50, zoom, cam);
  }
  ctx.restore();

  // Soft foreground focus falloff gives the shot a photographic lens feel.
  const focus = ctx.createLinearGradient(0, h * 0.62, 0, h);
  focus.addColorStop(0, "rgba(255,222,164,0)");
  focus.addColorStop(0.78, "rgba(20,31,20,0.04)");
  focus.addColorStop(1, "rgba(12,25,18,0.22)");
  ctx.fillStyle = focus;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  drawAtmosphere(ctx, w, h, time, props.particles);

  // Natural edge falloff, kept subtle so overlaid website copy remains legible.
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.43, h * 0.18, w * 0.5, h * 0.5, h * 0.9);
  vignette.addColorStop(0, "rgba(16,25,18,0)");
  vignette.addColorStop(1, "rgba(16,25,18,0.24)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // [ext] Featured plant: on its own layer when one is supplied, otherwise on top of the field.
  if (props.featured) {
    const target = featuredCtx ?? ctx;
    if (featuredCtx) featuredCtx.clearRect(0, 0, w, h);
    target.save();
    target.translate(0, cam.tilt * (1 - easeInOut(clamp(props.featured.approach, 0, 1))));
    drawFeaturedPlant(target, w, h, time, props.wind / 50, zoom, cam, props.featured);
    target.restore();
  } else if (featuredCtx) {
    featuredCtx.clearRect(0, 0, w, h);
  }
}

function renderSkyCache(prev: SkyCache, w: number, h: number, time: number, sunlight: number, sun: { x: number; y: number }, dpr: number, key: string): NonNullable<SkyCache> {
  const cw = Math.max(1, Math.round(w * dpr));
  const ch = Math.max(1, Math.round(h * dpr));
  let canvas = prev?.canvas;
  let ctx = prev?.ctx;
  if (!canvas || !ctx || canvas.width !== cw || canvas.height !== ch) {
    canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(cw, ch) : Object.assign(document.createElement("canvas"), { width: cw, height: ch });
    ctx = (canvas.getContext("2d") as Ctx | null) ?? undefined;
    if (!ctx) throw new Error("2D context unavailable");
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, h, time, sunlight, sun);
  return { canvas, ctx, key, at: time };
}

/* ------------------------------------------------------------------ */
/* Renderer + clock — shared by the main-thread controller and the worker */
/* ------------------------------------------------------------------ */
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export type LiveState = Required<Pick<SceneProps, "scale" | "density" | "particles" | "sunlight" | "wind">> & {
  cameraProgress: number | undefined;
  cameraDepth: number;
  sun: { x: number; y: number };
  detail: number;
  featured: FeaturedState | null;
  speed: number;
  animate: boolean;
  /** Backing-store scale for the field layer (0.3–1). Lower while defocused: cheaper, and blur hides it. */
  resolution: number;
};

export type StatePatch = Partial<LiveState> & { featuredPatch?: Partial<FeaturedState> | null };

export function initialState(o: Partial<LiveState> = {}): LiveState {
  return {
    scale: o.scale ?? 100,
    density: o.density ?? 88,
    particles: o.particles ?? 42,
    sunlight: o.sunlight ?? 86,
    wind: o.wind ?? 42,
    cameraProgress: o.cameraProgress,
    cameraDepth: o.cameraDepth ?? 0.12,
    sun: o.sun ?? { ...DEFAULT_SUN },
    detail: o.detail ?? 1,
    featured: o.featured ?? null,
    speed: o.speed ?? 42,
    animate: o.animate ?? true,
    resolution: o.resolution ?? 1,
  };
}

export function applyPatch(state: LiveState, patch: StatePatch) {
  const { featuredPatch, ...rest } = patch;
  Object.assign(state, rest);
  if (featuredPatch === null) state.featured = null;
  else if (featuredPatch) state.featured = { boll: 0, approach: 0, glow: 0, ...(state.featured ?? {}), ...featuredPatch };
}

/** Owns the canvases and the draw call; knows nothing about the DOM, timers or threads. */
export class FieldRenderer {
  readonly state: LiveState;
  private readonly canvas: AnyCanvas;
  private readonly featured: AnyCanvas | null;
  private readonly ctx: Ctx;
  private readonly fctx: Ctx | null;
  private readonly cache: { sky: SkyCache; dpr: number } = { sky: null, dpr: 1 };
  private readonly samples: number[] = [];
  private plants: Plant[] = makePlants(138);
  private res = 1;
  private rawDpr = 1;
  private dprCap: number;
  w = 0;
  h = 0;
  dpr = 1;

  /**
   * `cpuRaster`: rasterise on the calling thread instead of the GPU process. Used in the worker: the
   * scene is thousands of small paths/gradients, which on accelerated canvases is replayed in the GPU
   * process every frame and starves page compositing. Software raster in the worker hands the GPU one
   * finished bitmap per frame instead.
   */
  constructor(canvas: AnyCanvas, featured: AnyCanvas | null, state: LiveState, maxDpr = 1.6, cpuRaster = false) {
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: cpuRaster }) as Ctx | null;
    if (!ctx) throw new Error("Canvas 2D is not supported");
    this.canvas = canvas;
    this.featured = featured;
    this.ctx = ctx;
    this.fctx = (featured?.getContext("2d", { willReadFrequently: cpuRaster }) as Ctx | null) ?? null;
    this.state = state;
    this.dprCap = maxDpr;
  }

  resize(w: number, h: number, devicePixelRatio: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.rawDpr = devicePixelRatio || 1;
    this.plants = makePlants(this.w < 600 ? 72 : 138);
    this.applySize();
  }

  private applySize() {
    this.dpr = Math.min(this.rawDpr, this.dprCap);
    this.res = clamp(this.state.resolution, 0.3, 1);
    const fr = this.dpr * this.res;
    this.canvas.width = Math.round(this.w * fr);
    this.canvas.height = Math.round(this.h * fr);
    this.ctx.setTransform(fr, 0, 0, fr, 0, 0);
    this.cache.dpr = fr;
    this.cache.sky = null;
    spriteScale = fr > 1.2 ? 1.5 : 1;
    if (this.featured && this.fctx) {
      this.featured.width = Math.round(this.w * this.dpr);
      this.featured.height = Math.round(this.h * this.dpr);
      this.fctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  /** Draws one frame; returns the draw time in ms. */
  render(time: number) {
    if (!this.w) return 0;
    if (clamp(this.state.resolution, 0.3, 1) !== this.res) this.applySize();
    const t0 = performance.now();
    drawScene(this.ctx, this.w, this.h, time, this.state, this.plants, this.cache, this.fctx);
    const dt = performance.now() - t0;
    if (this.res === 1) {
      this.samples.push(dt);
      if (this.samples.length > 60) this.samples.shift();
    }
    // Adaptive resolution: if full-resolution frames are consistently expensive, step the pixel ratio down.
    if (this.samples.length === 60 && this.dprCap > 1 && this.avg() > 12) {
      this.dprCap = Math.max(1, this.dprCap - 0.3);
      this.samples.length = 0;
      this.applySize();
    }
    return dt;
  }

  avg() {
    return this.samples.reduce((a, b) => a + b, 0) / Math.max(1, this.samples.length);
  }

  stats() {
    return { avgMs: Math.round(this.avg() * 100) / 100, dpr: this.dpr, plants: this.plants.length };
  }
}

/**
 * Frame scheduling. Ambient motion (wind, clouds, drifting fibre) is slow by nature and renders
 * at ~30 fps; anything driven from outside (scroll) renders on the very next frame.
 * Nothing is scheduled while hidden, off-screen, or idle.
 */
export class FieldClock {
  elapsed = 0;
  visible = true;
  hidden = false;
  running = true;
  reduced = false;
  private dirty = true;
  private last = 0;
  private lastDraw = 0;
  private handle = 0;
  private destroyed = false;
  private readonly renderer: FieldRenderer;
  private readonly raf: (cb: (now: number) => void) => number;
  private readonly caf: (h: number) => void;

  constructor(renderer: FieldRenderer, raf: (cb: (now: number) => void) => number, caf: (h: number) => void) {
    this.renderer = renderer;
    this.raf = raf;
    this.caf = caf;
  }

  private ambient() {
    const s = this.renderer.state;
    return s.animate && !this.reduced && s.speed > 0 && this.running;
  }

  invalidate() {
    this.dirty = true;
    this.schedule();
  }

  schedule() {
    if (this.destroyed || this.handle) return;
    if (!this.visible || this.hidden || (!this.ambient() && !this.dirty)) { this.last = 0; return; }
    this.handle = this.raf(this.frame);
  }

  private readonly frame = (now: number) => {
    this.handle = 0;
    if (this.destroyed) return;
    const dt = this.last === 0 ? 0 : Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    let draw = this.dirty;
    if (this.ambient()) {
      this.elapsed += dt * (this.renderer.state.speed / 42);
      if (now - this.lastDraw >= 31) draw = true; // ~30 fps for wind-only frames
    }
    if (draw && this.visible && !this.hidden) {
      this.dirty = false;
      this.lastDraw = now;
      this.renderer.render(this.elapsed);
    }
    this.schedule();
  };

  destroy() {
    this.destroyed = true;
    if (this.handle) this.caf(this.handle);
  }
}

/* ------------------------------------------------------------------ */
/* Imperative controller (main thread)                                  */
/* ------------------------------------------------------------------ */
export type CottonFieldOptions = Partial<SceneProps> & {
  /** Animation speed. 0 freezes the scene; 42 is the default pace. */
  speed?: number;
  /** Set false for a static fallback / reduced-motion layout. */
  animate?: boolean;
  /** Optional second canvas for the featured plant (sharp while the field is defocused). */
  featuredCanvas?: HTMLCanvasElement | null;
  /** Element whose visibility gates rendering (defaults to the canvas). */
  observe?: Element | null;
  /** Upper bound for devicePixelRatio. */
  maxDpr?: number;
  /** Field backing-store scale (0.3–1). */
  resolution?: number;
};

export type CottonFieldController = {
  setCamera(progress: number | undefined): void;
  setFeatured(next: Partial<FeaturedState> | null): void;
  set(next: Partial<CottonFieldOptions>): void;
  /** Force a redraw on the next frame (also works while paused). */
  invalidate(): void;
  /** Pause / resume the ambient clock (rendering still follows visibility). */
  setRunning(running: boolean): void;
  resize(): void;
  destroy(): void;
  /** Average full-resolution draw time in ms over the last 60 frames (for profiling). */
  stats(): { avgMs: number; dpr: number; plants: number; thread?: string };
};

export function stripDomOptions(o: Partial<CottonFieldOptions>): Partial<LiveState> {
  const rest: Record<string, unknown> = { ...o };
  delete rest.featuredCanvas;
  delete rest.observe;
  delete rest.maxDpr;
  return rest as Partial<LiveState>;
}

export function createCottonField(canvas: HTMLCanvasElement, options: CottonFieldOptions = {}): CottonFieldController {
  const state = initialState(stripDomOptions(options));
  const renderer = new FieldRenderer(canvas, options.featuredCanvas ?? null, state, options.maxDpr ?? 1.6);
  const clock = new FieldClock(renderer, (cb) => window.requestAnimationFrame(cb), (h) => window.cancelAnimationFrame(h));

  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  clock.reduced = Boolean(media?.matches);
  const onMotion = (e: MediaQueryListEvent) => { clock.reduced = e.matches; clock.invalidate(); };
  media?.addEventListener?.("change", onMotion);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    clock.invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const io = new IntersectionObserver((entries) => {
    clock.visible = entries.some((e) => e.isIntersecting);
    clock.invalidate();
  });
  io.observe(options.observe ?? canvas);
  const onVis = () => { clock.hidden = document.hidden; clock.invalidate(); };
  document.addEventListener("visibilitychange", onVis);
  resize();

  return {
    setCamera(p) { state.cameraProgress = p; clock.invalidate(); },
    setFeatured(next) { applyPatch(state, { featuredPatch: next }); clock.invalidate(); },
    set(next) { applyPatch(state, stripDomOptions(next)); clock.invalidate(); },
    invalidate: () => clock.invalidate(),
    setRunning(r) { clock.running = r; clock.invalidate(); },
    resize,
    destroy() {
      clock.destroy();
      observer.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      media?.removeEventListener?.("change", onMotion);
    },
    stats: () => ({ ...renderer.stats(), thread: "main" }),
  };
}
