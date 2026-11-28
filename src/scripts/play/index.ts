// Interactive bits (Story containers, khadi wheel, cone piñata). Each one's code — and the physics
// library — is fetched only when it comes near the screen, so none of it costs anything on first load.
const near = (el: Element, load: () => void) => {
  const io = new IntersectionObserver(([e]) => {
    if (!e?.isIntersecting) return;
    io.disconnect();
    load();
  }, { rootMargin: '600px 0px' });
  io.observe(el);
};

/** Parse/evaluate the physics code while the page is idle, so it never lands in the middle of a scroll. */
const warm = () => {
  const go = () => { void import('./jar'); void import('./pinata'); void import('./charkha'); };
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));
  if (document.readyState === 'complete') idle(go);
  else addEventListener('load', () => idle(go), { once: true });
};

export function initPlay() {
  if (document.querySelector('[data-play-jar], [data-charkha], [data-pinata]')) warm();
  document.querySelectorAll<HTMLElement>('[data-play-jar]').forEach((el) =>
    near(el, () => void import('./jar').then((m) => m.mountJar(el)).catch(() => el.classList.add('is-off'))),
  );
  document.querySelectorAll<HTMLElement>('[data-charkha]').forEach((el) =>
    near(el, () => void import('./charkha').then((m) => m.mountCharkha(el))),
  );
  document.querySelectorAll<HTMLElement>('[data-pinata]').forEach((el) =>
    near(el, () => void import('./pinata').then((m) => m.mountPinata(el))),
  );
}
