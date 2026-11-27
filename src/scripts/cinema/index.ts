// Home page cinema entry.
//  • Motion allowed: lazily loads GSAP + the choreography (./motion), which owns everything
//    inside a gsap.matchMedia() context and reverts cleanly if the OS setting changes.
//  • Reduced motion (or the chunk failing to load): the film renders as stacked, static scenes.
// The AKRMillsCottonField engine (src/lib/cotton-field) is kept in the repo but no longer used on
// the home page: the hero now zooms straight into the close-up footage.

export async function initCinema() {
  const film = document.querySelector<HTMLElement>('[data-film]');
  if (!film) return;
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)');

  let loading = false;
  const boot = () => {
    if (!motionOK.matches || loading) return;
    loading = true;
    import('./motion')
      .then((m) => m.initMotion())
      .catch(() => {
        // Motion chunk unavailable: drop the pre-applied film layout so the static scenes show.
        document.documentElement.classList.remove('cine');
      });
  };
  boot();
  motionOK.addEventListener('change', boot);
}
