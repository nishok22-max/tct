// Transparent, trimmed copy of the supplied AKR logo (the artwork sits on solid white).
// Only near-white pixels are made transparent, with a narrow anti-aliased ramp at the edges:
//   min(R,G,B) ≤ 200 → fully opaque, colour untouched (all of the thimble, the gold AKR, the green text)
//   200 < min < 246  → partially transparent edge pixel, colour un-matted from white so no white fringe
//   min ≥ 246        → transparent (background and the white gaps between the thimble bands)
// An earlier version used a much wider ramp, which re-saturated light gold and made the logo look like
// it was glowing; this keeps the artwork's colours exactly as supplied.
// Run: node scripts/make-logo-alpha.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/assets/brand/akr-logo-source.webp');
const LO = 200;
const HI = 246;

const { data, info } = await sharp(src).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const m = Math.min(r, g, b);
  let a = m <= LO ? 1 : m >= HI ? 0 : (HI - m) / (HI - LO);
  if (a >= 1) { out[j] = r; out[j + 1] = g; out[j + 2] = b; out[j + 3] = 255; continue; }
  if (a <= 0) { out[j] = out[j + 1] = out[j + 2] = out[j + 3] = 0; continue; }
  // Edge pixel: remove the white it was blended with, but never push it past the original colour range.
  const un = (c) => Math.max(0, Math.min(255, Math.round(255 - (255 - c) / a)));
  out[j] = un(r); out[j + 1] = un(g); out[j + 2] = un(b); out[j + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize({ width: 800 })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'src/assets/brand/akr-logo-alpha.png'));
console.log('written', info.width, info.height);
