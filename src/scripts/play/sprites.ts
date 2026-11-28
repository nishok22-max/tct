// Sprites for the physics playgrounds — each is drawn (or decoded) once to an offscreen canvas, so a
// frame costs one drawImage per body.
//  • cotton: die-cut stickers cut from the site's own cotton footage (public/play/cotton-*.webp,
//    made by scripts/play/make-cotton-stickers.mjs)
//  • yarn balls and yarn cones: drawn here, in the palette of the yarn-winding animation
//  • tufts: small fluffy cotton pieces for the piñata burst

export type Pt = { x: number; y: number };
/** `hull`: convex outline in sprite pixels, relative to the sprite's centre (for exact collisions). */
export type Sprite = { img: CanvasImageSource; w: number; h: number; hull?: Pt[] };

const SS = 2; // supersampling: sprites are drawn at 2× their largest on-screen size

/** Yarn tones: ecru, cream, raw cotton, gold, khaki, forest, terracotta. */
export const YARN = ['#F3EBDD', '#E9D8BA', '#D9C19A', '#C68F4C', '#8A6A3E', '#4E5A3A', '#B9573C'];

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * SS);
  c.height = Math.ceil(h * SS);
  // CPU-backed: sprites are drawn once and then only copied, so they never need their own GPU surface
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(SS, SS);
  return { c, ctx };
};

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)} ${f((n >> 8) & 255)} ${f(n & 255)})`;
};

/* ---------------- cotton (photo cutouts) ---------------- */
function convexHull(pts: Pt[]): Pt[] {
  pts.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Pt[] = [];
  const up: Pt[] = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]!; while (up.length >= 2 && cross(up[up.length - 2]!, up[up.length - 1]!, p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Drop the vertices that add the least area until `max` remain (Visvalingam). */
function simplify(poly: Pt[], max: number): Pt[] {
  const p = poly.slice();
  const area = (a: Pt, b: Pt, c: Pt) => Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  while (p.length > max) {
    let k = 0;
    let best = Infinity;
    for (let i = 0; i < p.length; i++) {
      const v = area(p[(i - 1 + p.length) % p.length]!, p[i]!, p[(i + 1) % p.length]!);
      if (v < best) { best = v; k = i; }
    }
    p.splice(k, 1);
  }
  return p;
}

/** Outline from the alpha channel: solid pixels only, pulled in slightly so soft fibre edges can touch. */
function hullOf(src: CanvasImageSource, w: number, h: number): Pt[] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  const pts: Pt[] = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3]! > 150) pts.push({ x, y });
  return simplify(convexHull(pts), 12).map((p) => ({ x: (p.x - w / 2) * 0.95, y: (p.y - h / 2) * 0.95 }));
}

let cotton: Promise<Sprite[]> | null = null;
/** The three cutouts plus mirrored copies — six variants. */
export function cottonStickers(): Promise<Sprite[]> {
  cotton ??= Promise.all(
    [1, 2, 3].map(async (i) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = `/play/cotton-${i}.webp`;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const hull = hullOf(img, w, h);
      const { c, ctx } = canvas(w / SS, h / SS);
      ctx.setTransform(-1, 0, 0, 1, w, 0); // mirror
      ctx.drawImage(img, 0, 0);
      const mirrored: Sprite = { img: c, w, h, hull: hull.map((p) => ({ x: -p.x, y: p.y })).reverse() };
      return [{ img, w, h, hull } as Sprite, mirrored];
    }),
  ).then((pairs) => pairs.flat());
  return cotton;
}

/* ---------------- yarn ball ---------------- */
export function yarnBall(color: string, r: number, seed = 1): Sprite {
  const pad = 2;
  const { c, ctx } = canvas(r * 2 + pad * 2, r * 2 + pad * 2);
  const cx = r + pad;
  const cy = r + pad;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  // body with a soft light from the upper left
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, shade(color, 0.28));
  g.addColorStop(0.7, color);
  g.addColorStop(1, shade(color, -0.28));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // wound strands: bands of parallel arcs in a few directions, clipped to the ball
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let band = 0; band < 4; band++) {
    const a = rnd() * Math.PI;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.scale(1, 0.35 + rnd() * 0.4);
    for (let k = -6; k <= 6; k++) {
      ctx.strokeStyle = k % 2 ? shade(color, -0.18) : shade(color, 0.2);
      ctx.lineWidth = Math.max(0.7, r * 0.045);
      ctx.beginPath();
      ctx.arc(0, k * r * 0.11, r * 1.05, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }
  // shading over the strands
  const sh = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r * 1.02);
  sh.addColorStop(0, 'rgb(255 255 255 / 0.18)');
  sh.addColorStop(0.65, 'rgb(0 0 0 / 0)');
  sh.addColorStop(1, 'rgb(0 0 0 / 0.28)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, cx * 2, cy * 2);
  ctx.restore();

  // a loose tail of yarn
  ctx.strokeStyle = shade(color, -0.12);
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.beginPath();
  const ta = rnd() * Math.PI * 2;
  ctx.moveTo(cx + Math.cos(ta) * r * 0.92, cy + Math.sin(ta) * r * 0.92);
  ctx.quadraticCurveTo(cx + Math.cos(ta + 0.5) * r * 1.05, cy + Math.sin(ta + 0.5) * r * 1.05, cx + Math.cos(ta + 0.9) * r * 0.98, cy + Math.sin(ta + 0.9) * r * 0.98);
  ctx.stroke();
  return { img: c, w: r * 2 + pad * 2, h: r * 2 + pad * 2 };
}

/* ---------------- yarn cone (narrow end up, paper tube on top) ---------------- */
/** Body is a trapezoid `w` wide at the base, `topW` at the top, `h` tall; the tube adds `tube` above. */
export function yarnCone(color: string, w: number, h: number, topW: number, seed = 1): Sprite & { tube: number } {
  const tube = h * 0.16;
  const pad = 3;
  const W = w + pad * 2;
  const H = h + tube + pad * 2;
  const { c, ctx } = canvas(W, H);
  const x0 = pad;
  const yTop = pad + tube;
  const yBot = yTop + h;
  const cx = x0 + w / 2;
  let s = seed * 7919 + 13;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

  // paper tube
  ctx.fillStyle = '#4E5A3A';
  ctx.beginPath();
  ctx.moveTo(cx - topW * 0.28, yTop + 2);
  ctx.lineTo(cx - topW * 0.2, pad + 1);
  ctx.quadraticCurveTo(cx, pad - 1, cx + topW * 0.2, pad + 1);
  ctx.lineTo(cx + topW * 0.28, yTop + 2);
  ctx.closePath();
  ctx.fill();

  // body
  const body = new Path2D();
  body.moveTo(cx - topW / 2, yTop);
  body.quadraticCurveTo(cx, yTop - h * 0.04, cx + topW / 2, yTop);
  body.lineTo(x0 + w, yBot);
  body.quadraticCurveTo(cx, yBot + h * 0.07, x0, yBot);
  body.closePath();
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, shade(color, -0.22));
  g.addColorStop(0.45, shade(color, 0.18));
  g.addColorStop(1, shade(color, -0.3));
  ctx.fillStyle = g;
  ctx.fill(body);

  // cross-wound layers
  ctx.save();
  ctx.clip(body);
  ctx.lineWidth = Math.max(0.6, w * 0.012);
  const rows = 14;
  for (let i = 0; i < rows; i++) {
    const y = yBot - (i / (rows - 1)) * h;
    const dir = i % 2 ? 1 : -1;
    ctx.strokeStyle = i % 2 ? shade(color, -0.32) : shade(color, 0.3);
    ctx.globalAlpha = 0.55 + rnd() * 0.3;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, y);
    ctx.quadraticCurveTo(cx, y + h * 0.05, x0 + w + 4, y + dir * h * 0.14);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = shade(color, -0.4);
  ctx.lineWidth = 0.8;
  ctx.stroke(body);
  return { img: c, w: W, h: H, tube: tube + pad };
}

/* ---------------- cotton tuft (piñata pieces) ---------------- */
export function cottonTuft(r: number, seed = 1): Sprite {
  const pad = r * 0.5;
  const S = r * 2 + pad * 2;
  const { c, ctx } = canvas(S, S);
  const cx = S / 2;
  const cy = S / 2;
  let s = seed * 4801 + 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // fibre wisps
  ctx.strokeStyle = 'rgb(255 252 244 / 0.55)';
  ctx.lineWidth = Math.max(0.4, r * 0.05);
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6);
    ctx.quadraticCurveTo(cx + Math.cos(a + 0.3) * r * 1.2, cy + Math.sin(a + 0.3) * r * 1.2, cx + Math.cos(a + 0.15) * r * 1.4, cy + Math.sin(a + 0.15) * r * 1.4);
    ctx.stroke();
  }
  // puffs
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd() * 0.6;
    const d = r * (0.3 + rnd() * 0.25);
    const pr = r * (0.5 + rnd() * 0.2);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    const g = ctx.createRadialGradient(x - pr * 0.3, y - pr * 0.35, pr * 0.1, x, y, pr);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.7, '#F6F0E4');
    g.addColorStop(1, 'rgb(226 214 192 / 0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  return { img: c, w: S, h: S };
}
