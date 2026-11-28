// Khadi wheel: drag it round (with inertia); the spindle turns ~8× faster and the thread shivers with
// speed. Arrow keys turn it too. The hand-drawn hint fades out after the first turn.
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(Draggable, InertiaPlugin);

const RATIO = 8;

export function mountCharkha(root: HTMLElement) {
  const handle = root.querySelector<HTMLElement>('[data-charkha-handle]')!;
  const wheel = root.querySelector<SVGGElement>('[data-charkha-wheel]')!;
  const stripes = root.querySelector<SVGPatternElement>('[data-charkha-stripes]')!;
  const thread = root.querySelector<SVGPathElement>('[data-charkha-thread]')!;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const threadD = thread.getAttribute('d') ?? '';

  // hint draws itself in when the wheel comes into view
  const io = new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) { root.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.5 });
  io.observe(root);

  gsap.set(wheel, { svgOrigin: '118 128', rotation: 0 });
  let last = 0;
  let spun = 0;
  const update = () => {
    const rot = Number(gsap.getProperty(wheel, 'rotation')) || 0;
    const d = rot - last;
    last = rot;
    // spindle: the cop's stripes slide as it turns
    stripes.setAttribute('patternTransform', `translate(${((rot * RATIO) / 12) % 8} 0)`);
    // the thread shivers with speed
    const v = Math.min(1, Math.abs(d) / 12);
    const jitter = (Math.random() - 0.5) * 10 * v;
    thread.setAttribute('d', threadD.replace(/Q ([\d.]+) ([\d.]+)/, (_, x, y) => `Q ${(Number(x) + jitter).toFixed(1)} ${y}`));
    const deg = ((Math.round(rot) % 360) + 360) % 360;
    handle.setAttribute('aria-valuenow', String(deg));
    handle.setAttribute('aria-valuetext', `${deg} degrees`);
    spun += Math.abs(d);
    if (spun > 90 && !root.classList.contains('is-spun')) root.classList.add('is-spun');
  };

  const [drag] = Draggable.create(wheel, {
    type: 'rotation',
    inertia: !still,
    // only the wheel itself is grabbable, so a swipe over the rest of the drawing still scrolls the page
    onDrag: update,
    onThrowUpdate: update,
    onPress: () => root.classList.add('is-grabbing'),
    onRelease: () => root.classList.remove('is-grabbing'),
  });

  handle.addEventListener('keydown', (e) => {
    const k = e.key;
    const dir = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const to = (Number(gsap.getProperty(wheel, 'rotation')) || 0) + dir * 120;
    gsap.to(wheel, { rotation: to, duration: still ? 0 : 1.1, ease: 'power3.out', onUpdate: update, overwrite: true });
  });

  return () => {
    drag?.kill();
    io.disconnect();
  };
}
