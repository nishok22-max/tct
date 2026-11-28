// Photo cutouts of real cotton bolls for the Generation I playground (and the piñata burst).
// Source: the site's own cotton footage (media-source/gemini-cotton-landscape-original.mp4).
//
//   node scripts/play/make-cotton.mjs
//
// Matting (trimap method) — soft, natural fibre edges, no outline:
//  1. key the bright, low-saturation cotton inside an ellipse around one boll; take its convex hull
//  2. certain cotton  = the keyed cotton closed (fills the bract lines between lobes, follows the lobes'
//     round outline — no straight hull edges); certain background = beyond a thin band around it
//  3. in the band between, alpha = projection of the pixel onto the line from the local background
//     colour B to the local cotton colour F (both estimated by normalised convolution)
//  4. decontaminate edge colours (solve I = αF + (1-α)B for F), add a soft centred contact shadow
// Output: public/play/cotton-N.webp (alpha WebP, ≤ 320 px). The three large, sharp bolls are used; side views
// from the field shots were too small and too close to neighbouring bolls to cut cleanly.
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'media-source/gemini-cotton-landscape-original.mp4';
const WM = 'scripts/footage/gemini-watermark-mask.png';
const OUT = 'public/play';
const SIZE = 320;

// t: frame (s); crop: region around one boll; roi: ellipse [cx, cy, rx, ry] in crop coords; lum: key threshold
const BOLLS = [
  { t: 9.6, crop: { left: 270, top: 40, width: 740, height: 660 }, roi: [365, 315, 335, 300], lum: 170 },
  { t: 7.0, crop: { left: 360, top: 100, width: 580, height: 520 }, roi: [282, 255, 250, 235], lum: 140 },
  { t: 5.5, crop: { left: 455, top: 225, width: 370, height: 330 }, roi: [186, 140, 140, 132], lum: 138 },
];

const tmp = mkdtempSync(join(tmpdir(), 'cotton-'));
mkdirSync(OUT, { recursive: true });

const raw1 = (buf, w, h) => sharp(Buffer.from(buf), { raw: { width: w, height: h, channels: 1 } });
const blur1 = async (m, w, h, sigma) => raw1(m, w, h).blur(sigma).extractChannel(0).raw().toBuffer();
const thresh = (b, t) => { const o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = b[i] >= t ? 255 : 0; return o; };
const dilate = async (m, w, h, r) => thresh(await blur1(m, w, h, r), 12);
const erode = async (m, w, h, r) => thresh(await blur1(m, w, h, r), 243);

/** Normalised convolution: average colour of the pixels where mask = 255, spread over a radius. */
async function localColour(rgb, mask, w, h, sigma) {
  const masked = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) if (mask[i]) { masked[i * 3] = rgb[i * 3]; masked[i * 3 + 1] = rgb[i * 3 + 1]; masked[i * 3 + 2] = rgb[i * 3 + 2]; }
  const num = await sharp(masked, { raw: { width: w, height: h, channels: 3 } }).blur(sigma).raw().toBuffer();
  const den = await blur1(mask, w, h, sigma);
  const out = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const d = Math.max(den[i], 1) / 255;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = num[i * 3 + c] / 255 / d * 255;
  }
  return out;
}

function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

let n = 0;
for (const b of BOLLS) {
  n += 1;
  const frame = join(tmp, `f${n}.png`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(b.t), '-i', SRC, '-frames:v', '1', '-vf', `removelogo=${WM}`, frame]);
  if (r.status !== 0) throw new Error(String(r.stderr));
  const { width: w, height: h } = b.crop;
  const rgb = await sharp(frame).extract(b.crop).removeAlpha().raw().toBuffer();
  const scale = Math.max(w, h) / 400; // radii below are tuned for a ~400 px boll

  // 1 · key + hull
  const [ex, ey, erx, ery] = b.roi;
  const key = new Uint8Array(w * h);
  const pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (((x - ex) / erx) ** 2 + ((y - ey) / ery) ** 2 > 1) continue;
    const i = y * w + x;
    const R = rgb[i * 3], G = rgb[i * 3 + 1], B = rgb[i * 3 + 2];
    const L = 0.299 * R + 0.587 * G + 0.114 * B;
    if (L > b.lum && Math.max(R, G, B) - Math.min(R, G, B) < 80) { key[i] = 255; if (!(x % 2) && !(y % 2)) pts.push([x, y]); }
  }
  const poly = hull(pts).map((p) => p.join(',')).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}"/><polygon points="${poly}" fill="#fff"/></svg>`;
  const hullM = await sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer();

  // 2 · trimap: a deep core inside the hull (keeps the bracts between the lobes) plus the keyed cotton;
  //     a wide band around the hull outline is decided by colour, so the edge follows the real lobes
  const core = await erode(hullM, w, h, 30 * scale);
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg[i] = core[i] || (key[i] && hullM[i]) ? 255 : 0;
  const outer = await dilate(hullM, w, h, 6 * scale);
  const bg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bg[i] = outer[i] ? 0 : 255;

  // 3 · alpha in the unknown band
  const F = await localColour(rgb, key, w, h, 14 * scale); // cotton colour nearby
  const Bc = await localColour(rgb, bg, w, h, 22 * scale); // background colour nearby
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (fg[i]) { alpha[i] = 255; continue; }
    if (bg[i]) { alpha[i] = 0; continue; }
    let num = 0, den = 0;
    for (let c = 0; c < 3; c++) {
      const d = F[i * 3 + c] - Bc[i * 3 + c];
      num += (rgb[i * 3 + c] - Bc[i * 3 + c]) * d;
      den += d * d;
    }
    let a = den > 400 ? num / den : 0;
    a = Math.min(1, Math.max(0, (a - 0.12) / 0.76)); // ramp: ignore faint background, keep wisps
    alpha[i] = Math.round(a * a * (3 - 2 * a) * 255); // smoothstep
  }
  // keep only the largest connected piece (the boll) — drops specks of background and bract debris
  {
    const lab = new Int32Array(w * h).fill(-1);
    const sizes = [];
    for (let i0 = 0; i0 < w * h; i0++) {
      if (lab[i0] >= 0 || alpha[i0] <= 40) continue;
      const id = sizes.length;
      let count = 0;
      const st = [i0];
      lab[i0] = id;
      while (st.length) {
        const i = st.pop(); count++;
        const x = i % w; const y = (i / w) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
          if (j >= 0 && lab[j] < 0 && alpha[j] > 40) { lab[j] = id; st.push(j); }
        }
      }
      sizes.push(count);
    }
    const big = sizes.indexOf(Math.max(...sizes));
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = lab[i] === big ? 255 : 0;
    const keep = await blur1(await dilate(m, w, h, 1.5), w, h, 1);
    for (let i = 0; i < w * h; i++) alpha[i] = Math.round((alpha[i] * keep[i]) / 255);
  }
  const aSoft = await blur1(alpha, w, h, 0.6);

  // 4 · decontaminate edges, add a centred soft shadow, compose
  const pad = Math.round(18 * scale);
  const W = w + pad * 2, H = h + pad * 2;
  const aP = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) aP.set(aSoft.subarray(y * w, y * w + w), (y + pad) * W + pad);
  const shadow = await blur1(aP, W, H, 9 * scale);
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = y * W + x;
    const sA = (shadow[o] / 255) * 0.32;
    let pr = 40, pg = 30, pb = 18, pa = sA; // shadow colour (warm dark)
    pr *= pa; pg *= pa; pb *= pa;
    const cx = x - pad, cy = y - pad;
    if (cx >= 0 && cy >= 0 && cx < w && cy < h) {
      const i = cy * w + cx;
      const a = aSoft[i] / 255;
      if (a > 0) {
        const cols = [0, 1, 2].map((c) => {
          const I = rgb[i * 3 + c];
          if (a > 0.97) return I;
          const f = (I - (1 - a) * Bc[i * 3 + c]) / Math.max(a, 0.05); // solve I = aF + (1-a)B
          const est = Math.min(255, Math.max(0, f));
          return est * 0.6 + F[i * 3 + c] * 0.4; // lean on the local cotton colour at the very edge
        });
        pr = cols[0] * a + pr * (1 - a); pg = cols[1] * a + pg * (1 - a); pb = cols[2] * a + pb * (1 - a); pa = a + pa * (1 - a);
      }
    }
    const k = pa > 0 ? 1 / pa : 0;
    out[o * 4] = Math.round(pr * k); out[o * 4 + 1] = Math.round(pg * k); out[o * 4 + 2] = Math.round(pb * k); out[o * 4 + 3] = Math.round(pa * 255);
  }
  const file = join(OUT, `cotton-${n}.webp`);
  const info = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 2 })
    .resize({ width: SIZE, height: SIZE, fit: 'inside', withoutEnlargement: false, kernel: 'lanczos3' })
    .modulate({ brightness: 1.04 })
    .webp({ quality: 90, alphaQuality: 95, effort: 6 })
    .toFile(file);
  console.log(file, `${info.width}x${info.height}`, info.size);
}
rmSync(tmp, { recursive: true, force: true });
