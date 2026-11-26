// Transparent, trimmed copy of the supplied AKR logo. The supplied artwork sits on solid white,
// so white is keyed out with an un-matte (colour = 255 - (255 - c) / alpha) to keep clean edges.
// Used by the header (colour version, and a white mono version over the footage) and the brand reveal.
// Run: node scripts/make-logo-alpha.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/assets/brand/akr-logo-source.webp');
const { data, info } = await sharp(src).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const d = (255 - Math.min(r, g, b)) / 255;
  const a = Math.min(1, d / 0.3);
  const un = (c) => (a > 0 ? Math.max(0, Math.min(255, Math.round(255 - (255 - c) / a))) : 0);
  out[j] = un(r); out[j + 1] = un(g); out[j + 2] = un(b); out[j + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize({ width: 800 })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'src/assets/brand/akr-logo-alpha.png'));
console.log('written', info.width, info.height);
