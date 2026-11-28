// Story containers: Generation I real-cotton stickers, II yarn balls, III yarn cones.
// Items drop in from the top when the container scrolls into view; then they can be dragged,
// thrown and stacked.
import { Playground, prefersStill, isPhone, type Item } from './physics';
import { cottonStickers, yarnBall, yarnCone, YARN } from './sprites';

type Kind = 'cotton' | 'yarn-ball' | 'cone';

async function itemsFor(kind: Kind, w: number, h: number): Promise<Item[]> {
  const phone = isPhone();
  const items: Item[] = [];
  let s = 17;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const xAt = (r: number) => r + rnd() * (w - r * 2);
  const yAt = (i: number, n: number) => -h * 0.05 + (i / n) * h * 0.55; // stacked above, inside the ceiling

  if (kind === 'cotton') {
    const stickers = await cottonStickers();
    const n = phone ? 10 : 14;
    for (let i = 0; i < n; i++) {
      const sp = stickers[i % stickers.length]!;
      const size = Math.min(w, 520) * (0.2 + rnd() * 0.07); // sticker's longest side
      const k = size / Math.max(sp.w, sp.h);
      const dw = sp.w * k;
      const dh = sp.h * k;
      items.push({ sprite: sp, shape: { kind: 'circle', r: Math.min(dw, dh) * 0.47 }, draw: { w: dw, h: dh }, x: xAt(dw / 2), y: yAt(i, n) + 20, angle: (rnd() - 0.5) * 0.8 });
    }
  } else if (kind === 'yarn-ball') {
    const n = phone ? 9 : 12;
    for (let i = 0; i < n; i++) {
      const r = Math.min(w, 520) * (0.085 + rnd() * 0.04);
      const sp = yarnBall(YARN[i % YARN.length]!, r, i + 1);
      items.push({ sprite: sp, shape: { kind: 'circle', r }, draw: { w: sp.w, h: sp.h }, x: xAt(r), y: yAt(i, n) + 20, angle: rnd() * 6 });
    }
  } else {
    const n = phone ? 7 : 9;
    for (let i = 0; i < n; i++) {
      const bw = Math.min(w, 520) * (0.16 + rnd() * 0.04);
      const bh = bw * 1.18;
      const tw = bw * 0.46;
      const sp = yarnCone(YARN[(i * 3) % YARN.length]!, bw, bh, tw, i + 1);
      // Matter centres a trapezoid on its centroid; shift the sprite so the drawing lines up with it.
      const fromBottom = (bh * (bw + 2 * tw)) / (3 * (bw + tw));
      const centroidY = bh / 2 - fromBottom; // relative to the body box centre (y down)
      const dy = -centroidY - sp.tube / 2 + 1.5; // the tube sits above the body box
      items.push({ sprite: sp, shape: { kind: 'trapezoid', w: bw, h: bh, topW: tw }, draw: { w: sp.w, h: sp.h, dy }, x: xAt(bw / 2), y: yAt(i, n) + 30, angle: (rnd() - 0.5) * 1.2 });
    }
  }
  return items;
}

export async function mountJar(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const kind = (host.dataset.playJar ?? 'cotton') as Kind;
  const still = prefersStill();
  const pg = new Playground(host, canvas, { still, maxDpr: isPhone() ? 1.5 : 2 });
  const { w, h } = pg.size;
  const items = await itemsFor(kind, w, h);
  if (still) {
    pg.add(items);
  } else {
    // drop in one at a time so they visibly fall and pile up
    items.forEach((it, i) => setTimeout(() => pg.add([{ ...it, y: it.draw.h / 2 + 4 }]), i * 130));
  }
  host.classList.add('is-ready');
  // `?debug` exposes the playgrounds for inspection: __play[0].engine
  if (location.search.includes('debug')) ((window as unknown as { __play?: Playground[] }).__play ??= []).push(pg);
  return pg;
}
