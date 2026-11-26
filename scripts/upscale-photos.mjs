// Upscales the mill's own low-resolution photos (Lanczos3 + gentle unsharp mask) so they render
// crisply at their display size. Originals are copied to media-source/original-images/ first and
// never overwritten there. Interpolation adds no new detail; it removes pixelation and softness.
import sharp from 'sharp';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'src/assets/images';
const BAK = 'media-source/original-images';
const TARGET = 1600;
const files = [
  'about.webp',
  'infrastructure/autoconer.webp', 'infrastructure/blowroom-line.webp', 'infrastructure/draw-frame.webp',
  'infrastructure/LMW-RF-1.webp', 'infrastructure/yarn-testing-lab.webp',
  'products/combed-cotton-yarn.webp', 'products/cotton-polyester.webp', 'products/karded-cotton-yarn.webp',
  'products/karded-yarn.webp', 'products/polyester-cotton.webp',
];

for (const f of files) {
  const src = join(SRC, f);
  const bak = join(BAK, f);
  mkdirSync(dirname(bak), { recursive: true });
  if (!existsSync(bak)) copyFileSync(src, bak);
  const meta = await sharp(bak).metadata();
  const w = Math.max(meta.width, Math.min(TARGET, meta.width * 3));
  // Upscale in two passes (≤2× each) — less ringing than one big jump.
  let buf = await sharp(bak).toBuffer();
  let cur = meta.width;
  while (cur < w) {
    const next = Math.min(w, cur * 2);
    buf = await sharp(buf).resize({ width: next, kernel: 'lanczos3' }).sharpen({ sigma: 0.6, m1: 0.4, m2: 1.2 }).toBuffer();
    cur = next;
  }
  const out = await sharp(buf).webp({ quality: 88, effort: 6 }).toFile(src);
  console.log(f, `${meta.width}x${meta.height} -> ${out.width}x${out.height}`, out.size);
}
