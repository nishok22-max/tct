// Story containers: Generation I real-cotton stickers, II yarn balls, III yarn cones.
// Items drop in from the top when the container scrolls into view; then they can be dragged,
// thrown and stacked.
import { Playground, prefersStill, isPhone, type Item } from './physics';
import { cottonStickers, yarnBall, yarnCone, YARN } from './sprites';

type Kind = 'cotton' | 'yarn-ball' | 'cone';

/** How many items fill about `fill` of the tray, for items of a given footprint (px²). */
const countFor = (w: number, h: number, footprint: number, fill: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round((w * h * fill) / footprint)));

async function itemsFor(kind: Kind, w: number, h: number): Promise<Item[]> {
  const phone = isPhone();
  const items: Item[] = [];
  let s = 17;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const xAt = (r: number) => r + rnd() * (w - r * 2);
  const short = Math.min(w, h * 1.4);

  if (kind === 'cotton') {
    const variants = await cottonStickers();
    const size = short * (phone ? 0.3 : 0.27); // longest side of a boll
    const n = countFor(w, h, size * size * 0.72, 0.5, 6, 16);
    for (let i = 0; i < n; i++) {
      const sp = variants[(i * 5) % variants.length]!;
      const k = (size * (0.85 + rnd() * 0.3)) / Math.max(sp.w, sp.h);
      const points = (sp.hull ?? []).map((p) => ({ x: p.x * k, y: p.y * k }));
      const shape: Item['shape'] = points.length >= 3 ? { kind: 'poly', points } : { kind: 'circle', r: Math.min(sp.w, sp.h) * k * 0.45 };
      items.push({ sprite: sp, shape, draw: { w: sp.w * k, h: sp.h * k }, x: xAt((sp.w * k) / 2), y: 0, angle: (rnd() - 0.5) * 0.9 });
    }
  } else if (kind === 'yarn-ball') {
    const base = short * (phone ? 0.12 : 0.105);
    const n = countFor(w, h, Math.PI * base * base * 1.25, 0.5, 6, 14);
    for (let i = 0; i < n; i++) {
      const r = base * (0.85 + rnd() * 0.35);
      const sp = yarnBall(YARN[i % YARN.length]!, r, i + 1);
      items.push({ sprite: sp, shape: { kind: 'circle', r }, draw: { w: sp.w, h: sp.h }, x: xAt(r), y: 0, angle: rnd() * 6 });
    }
  } else {
    const base = short * (phone ? 0.2 : 0.18);
    const n = countFor(w, h, base * base * 1.3 * 0.75, 0.48, 5, 11);
    for (let i = 0; i < n; i++) {
      const bw = base * (0.9 + rnd() * 0.2);
      const bh = bw * 1.18;
      const tw = bw * 0.46;
      const sp = yarnCone(YARN[(i * 3) % YARN.length]!, bw, bh, tw, i + 1);
      // Matter centres a trapezoid on its centroid; shift the sprite so the drawing lines up with it.
      const fromBottom = (bh * (bw + 2 * tw)) / (3 * (bw + tw));
      const centroidY = bh / 2 - fromBottom; // relative to the body box centre (y down)
      const dy = -centroidY - sp.tube / 2 + 1.5; // the tube sits above the body box
      items.push({ sprite: sp, shape: { kind: 'trapezoid', w: bw, h: bh, topW: tw }, draw: { w: sp.w, h: sp.h, dy }, x: xAt(bw / 2), y: 0, angle: (rnd() - 0.5) * 1.2 });
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
