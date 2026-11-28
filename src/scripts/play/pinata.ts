// Cone piñata: sways on its thread; each tap swings it away from the tap and cracks it further; the 4th
// tap bursts it into cotton that falls to the floor of the green section (a physics sandbox spanning the
// section, drawn on a viewport-sized fixed canvas). "Hang another cone" clears it and starts again.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Playground, prefersStill, isPhone, type Item } from './physics';
import { cottonStickers, cottonTuft } from './sprites';

const TAPS = 4;
const NOTES = ['Tap to burst!', 'Again!', 'Harder!', 'One more!'];

export function mountPinata(root: HTMLElement) {
  const section = root.closest<HTMLElement>('section') ?? document.body;
  const swing = root.querySelector<HTMLElement>('[data-pinata-swing]')!;
  const cone = root.querySelector<HTMLButtonElement>('[data-pinata-cone]')!;
  const note = root.querySelector<HTMLElement>('[data-pinata-note]')!;
  const again = root.querySelector<HTMLButtonElement>('[data-pinata-again]')!;
  const pop = root.querySelector<HTMLElement>('[data-pinata-pop]')!;
  const cracks = [...root.querySelectorAll<SVGGElement>('[data-crack]')];
  const still = prefersStill();
  const phone = isPhone();
  let taps = 0;
  let pg: Playground | null = null;

  const io = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) { root.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.4 });
  io.observe(root);

  gsap.set(swing, { transformOrigin: '50% 0%' });
  let sway: gsap.core.Tween | null = null;
  const startSway = () => {
    if (still) return;
    sway?.kill();
    sway = gsap.fromTo(swing, { rotation: -2.5 }, { rotation: 2.5, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  };
  startSway();

  const layer = () => {
    if (pg) return pg;
    const canvas = document.createElement('canvas');
    canvas.className = 'play-layer';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    pg = new Playground(section, canvas, { fixedCanvas: canvas, input: section, still, maxDpr: phone ? 1.5 : 2, restitution: 0.25 });
    section.classList.add('has-sandbox');
    // the floor opens below the cone (CSS transition); re-measure the scroll animations further down
    const floor = section.querySelector('.play-floor');
    floor?.addEventListener('transitionend', () => ScrollTrigger.refresh(), { once: true });
    if (!floor || still) requestAnimationFrame(() => ScrollTrigger.refresh());
    if (location.search.includes('debug')) ((window as unknown as { __play?: Playground[] }).__play ??= []).push(pg);
    return pg;
  };

  const burst = async () => {
    root.classList.add('is-burst');
    note.textContent = 'Play with it!';
    sway?.kill();
    const sr = section.getBoundingClientRect();
    const cr = cone.getBoundingClientRect();
    const cx = cr.left + cr.width / 2 - sr.left;
    const cy = cr.top + cr.height * 0.6 - sr.top;
    gsap.to(swing, { scale: 1.18, autoAlpha: 0, duration: still ? 0 : 0.18, ease: 'power2.out' });
    gsap.fromTo(pop, { scale: 0.2, autoAlpha: 1 }, { scale: 2.4, autoAlpha: 0, duration: still ? 0 : 0.55, ease: 'power2.out' });

    const p = layer();
    const stickers = await cottonStickers();
    const n = phone ? 40 : 70;
    let s = 29;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const items: Item[] = [];
    for (let i = 0; i < n; i++) {
      const r = (phone ? 9 : 12) + rnd() * (phone ? 8 : 11);
      const a = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.5; // mostly upward and outward
      const v = 5 + rnd() * 11;
      const x = cx + (rnd() - 0.5) * cr.width * 0.5;
      const y = cy + (rnd() - 0.5) * cr.height * 0.4;
      if (i % 3 === 0) {
        const sp = stickers[i % stickers.length]!;
        const k = (r * 2.3) / Math.max(sp.w, sp.h);
        items.push({ sprite: sp, shape: { kind: 'circle', r }, draw: { w: sp.w * k, h: sp.h * k }, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: (rnd() - 0.5) * 0.4 });
      } else {
        const sp = cottonTuft(r, i + 1);
        items.push({ sprite: sp, shape: { kind: 'circle', r: r * 0.92 }, draw: { w: sp.w, h: sp.h }, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: (rnd() - 0.5) * 0.4 });
      }
    }
    p.add(items);
    again.hidden = false;
  };

  cone.addEventListener('click', (e) => {
    if (taps >= TAPS) return;
    taps += 1;
    cracks.forEach((c, i) => c.classList.toggle('is-on', i < taps));
    if (taps >= TAPS) { void burst(); return; }
    note.textContent = NOTES[taps] ?? NOTES[0]!;
    if (still) return;
    // swing away from where it was hit (keyboard: alternate sides)
    const r = cone.getBoundingClientRect();
    const side = e.detail === 0 ? (taps % 2 ? 1 : -1) : e.clientX < r.left + r.width / 2 ? 1 : -1;
    sway?.kill();
    gsap.timeline({ onComplete: startSway })
      .to(swing, { rotation: side * (10 + taps * 4), duration: 0.14, ease: 'power2.out' })
      .to(swing, { rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.35)' });
    gsap.fromTo(cone, { scaleX: 1.06, scaleY: 0.93 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 0%' });
  });

  again.addEventListener('click', () => {
    pg?.clear();
    taps = 0;
    cracks.forEach((c) => c.classList.remove('is-on'));
    root.classList.remove('is-burst');
    note.textContent = NOTES[0]!;
    again.hidden = true;
    gsap.fromTo(swing, { y: -60, scale: 1, autoAlpha: 1, rotation: 0 }, { y: 0, duration: still ? 0 : 1.1, ease: 'elastic.out(1, 0.45)', onComplete: startSway });
    cone.focus({ preventScroll: true });
  });
}
