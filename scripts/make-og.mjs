// Prepares derived brand assets. Run with `npm run og` (needs sharp).
// 1. Trims the 4872px logo to a small, padded-free source in src/assets/brand/akr-logo.png
// 2. Builds a 1200x630 Open Graph image (hero.webp + navy scrim + logo) at public/og.jpg
// 3. Builds real PNG favicons (the supplied favicon.png is actually a JPEG)
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(root, ...s);

const logo = await sharp(p('src/assets/brand/akr-logo-source.webp'))
  .flatten({ background: '#ffffff' })
  .trim({ threshold: 12 })
  .resize({ width: 640 })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();
await sharp(logo).toFile(p('src/assets/brand/akr-logo.png'));

// Mark only (left cone) for favicons: crop left ~36% of trimmed logo.
const meta = await sharp(logo).metadata();
const mark = await sharp(logo)
  .extract({ left: 0, top: 0, width: Math.round(meta.width * 0.36), height: meta.height })
  .toBuffer();
async function icon(size, out) {
  const inner = await sharp(mark)
    .resize(Math.round(size * 0.82), Math.round(size * 0.82), { fit: 'contain', background: '#EFEBE2' })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#EFEBE2' } })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(p('public', out));
}
await icon(32, 'favicon-32.png');
await icon(180, 'apple-touch-icon.png');
await icon(512, 'icon-512.png');

// OG image
const W = 1200, H = 630;
const bg = await sharp(p('src/assets/images/hero.webp')).resize(W, H, { fit: 'cover' }).toBuffer();
const scrim = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#191714" stop-opacity=".94"/><stop offset=".62" stop-color="#191714" stop-opacity=".72"/><stop offset="1" stop-color="#191714" stop-opacity=".2"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="72" y="360" font-family="Georgia, serif" font-size="64" fill="#EFEBE2">Three generations.</text>
    <text x="72" y="436" font-family="Georgia, serif" font-size="64" fill="#EFEBE2">One consistent yarn.</text>
    <text x="72" y="516" font-family="Arial, sans-serif" font-size="26" fill="#E0A82E">Ring-spun cotton &amp; blended yarns · Pollachi, Tamil Nadu</text>
  </svg>`
);
const card = await sharp({ create: { width: 420, height: 150, channels: 4, background: '#EFEBE2' } })
  .composite([{ input: await sharp(logo).resize(380, 120, { fit: 'contain', background: '#EFEBE2' }).toBuffer(), gravity: 'center' }])
  .png()
  .toBuffer();
await sharp(bg)
  .composite([{ input: scrim }, { input: card, left: 72, top: 96 }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(p('public/og.jpg'));

console.log('Brand assets generated.');
