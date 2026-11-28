// Die-cut "real cotton" stickers for the Generation I playground.
// Cotton bolls are cut out of the site's own close-up footage (the same shot the film uses), given a
// white sticker border and a soft shadow, and written as alpha WebP to public/play/.
//
//   node scripts/play/make-cotton-stickers.mjs
//
// Method: key the bright, low-saturation cotton inside an ellipse around one boll, take the convex hull
// of those pixels (a boll is roughly convex, so this keeps every lobe and the bracts between them),
// smooth it, and dilate it for the white sticker border.
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'media-source/gemini-cotton-landscape-original.mp4';
const MASK = 'scripts/footage/gemini-watermark-mask.png';
const OUT = 'public/play';
const SIZE = 220; // longest side of the finished sticker, px (drawn at ≤ ~90 CSS px, 2× DPR)

// t: frame time (s); crop: region around one boll; roi: ellipse [cx, cy, rx, ry] around it (crop coords).
const STICKERS = [
  { name: 'cotton-1', t: 9.6, crop: { left: 270, top: 40, width: 740, height: 660 }, roi: [365, 315, 335, 300], lum: 170 },
  { name: 'cotton-2', t: 5.5, crop: { left: 455, top: 225, width: 370, height: 330 }, roi: [186, 140, 140, 132], lum: 138 },
  { name: 'cotton-3', t: 7.0, crop: { left: 360, top: 100, width: 580, height: 520 }, roi: [282, 255, 250, 235], lum: 140 },
];

function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

const tmp = mkdtempSync(join(tmpdir(), 'stk-'));
mkdirSync(OUT, { recursive: true });

const blurMask = async (m, w, h, sigma, thr) => {
  const b = await sharp(Buffer.from(m), { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
  if (thr == null) return b;
  const o = new Uint8Array(w * h);
  for (let i = 0; i < o.length; i++) o[i] = b[i] >= thr ? 255 : 0;
  return o;
};

for (const s of STICKERS) {
  const frame = join(tmp, `${s.name}.png`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(s.t), '-i', SRC, '-frames:v', '1', '-vf', `removelogo=${MASK}`, frame]);
  if (r.status !== 0) throw new Error(String(r.stderr));
  const { width: w, height: h } = s.crop;
  const rgb = await sharp(frame).extract(s.crop).removeAlpha().raw().toBuffer();

  // 1 · key the cotton inside the ellipse: bright and nearly neutral
  const [ex, ey, erx, ery] = s.roi;
  const pts = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (((x - ex) / erx) ** 2 + ((y - ey) / ery) ** 2 > 1) continue;
    const i = y * w + x;
    const R = rgb[i * 3], G = rgb[i * 3 + 1], B = rgb[i * 3 + 2];
    const L = 0.299 * R + 0.587 * G + 0.114 * B;
    if (L > s.lum && Math.max(R, G, B) - Math.min(R, G, B) < 80) pts.push([x, y]);
  }
  // 2 · convex hull of the cotton → body mask, eroded slightly so no background halo shows
  const poly = hull(pts).map((p) => p.join(',')).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}"/><polygon points="${poly}" fill="#fff" stroke="#000" stroke-width="10" stroke-linejoin="round"/></svg>`;
  // round off the hull's corners
  const body = await blurMask(await sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer(), w, h, Math.max(4, w / 70), 150);
  const soft = await blurMask(body, w, h, 1.2); // anti-aliased photo edge
  // 3 · sticker border = dilated body
  const pad = 26;
  const W = w + pad * 2, H = h + pad * 2;
  const padMask = (m) => {
    const o = new Uint8Array(W * H);
    for (let y = 0; y < h; y++) o.set(m.subarray(y * w, y * w + w), (y + pad) * W + pad);
    return o;
  };
  const bodyP = padMask(body);
  const border = await blurMask(bodyP, W, H, 9, 28);
  const borderSoft = await blurMask(border, W, H, 1);
  const shadow = await blurMask(border, W, H, 7);

  // compose RGBA: shadow → white border → photo
  const out = Buffer.alloc(W * H * 4);
  const softP = padMask(soft);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // premultiplied "over": shadow (offset 3,5) → white border → photo
    const sA = y >= 5 && x >= 3 ? (shadow[(y - 5) * W + (x - 3)] / 255) * 0.3 : 0;
    let r = 18 * sA, g = 12 * sA, b = 6 * sA, a = sA;
    const bA = borderSoft[i] / 255;
    r = 255 * bA + r * (1 - bA); g = 252 * bA + g * (1 - bA); b = 246 * bA + b * (1 - bA); a = bA + a * (1 - bA);
    const pA = softP[i] / 255;
    if (pA > 0) {
      const j = ((y - pad) * w + (x - pad)) * 3;
      r = rgb[j] * pA + r * (1 - pA); g = rgb[j + 1] * pA + g * (1 - pA); b = rgb[j + 2] * pA + b * (1 - pA); a = pA + a * (1 - pA);
    }
    const k = a > 0 ? 1 / a : 0;
    out[i * 4] = Math.round(r * k); out[i * 4 + 1] = Math.round(g * k); out[i * 4 + 2] = Math.round(b * k); out[i * 4 + 3] = Math.round(a * 255);
  }
  // trim to content and scale
  const file = join(OUT, `${s.name}.webp`);
  const info = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width: SIZE, height: SIZE, fit: 'inside', kernel: 'lanczos3' })
    .webp({ quality: 88, alphaQuality: 90, effort: 6 })
    .toFile(file);
  console.log(file, `${info.width}x${info.height}`, info.size);
}
rmSync(tmp, { recursive: true, force: true });
