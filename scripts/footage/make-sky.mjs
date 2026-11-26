// Warm golden-hour sky plate (1920×1080) used behind the keyed Pexels cotton footage.
// Colours are taken from the site's sky (engine drawSky) and the Gemini hero so the shots match.
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../media-source/pexels-13943183/sky-golden-hour.png');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#C98A63"/>
      <stop offset="0.35" stop-color="#EBA877"/>
      <stop offset="0.62" stop-color="#F7C891"/>
      <stop offset="0.8" stop-color="#FFE2B3"/>
      <stop offset="1" stop-color="#FFE9C4"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.56" cy="0.72" r="0.55">
      <stop offset="0" stop-color="#FFF6DE" stop-opacity="1"/>
      <stop offset="0.08" stop-color="#FFEBC2" stop-opacity="0.95"/>
      <stop offset="0.3" stop-color="#FFC98A" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#FFB070" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="haze" cx="0.2" cy="0.15" r="0.6">
      <stop offset="0" stop-color="#B98466" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#B98466" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <rect width="1920" height="1080" fill="url(#haze)"/>
  <rect width="1920" height="1080" fill="url(#sun)"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('sky written', out);
