// Mobile menu: disclosure pattern. Esc closes and returns focus to the toggle; the page behind
// does not scroll while the full-screen menu is open.
const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const menu = document.getElementById('primary-nav');
const label = toggle?.querySelector<HTMLElement>('.nav-toggle__label');

if (toggle && menu) {
  const setOpen = (open: boolean, restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close' : 'Menu';
    menu.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (open) menu.querySelector<HTMLAnchorElement>('a')?.focus();
    if (!open && restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  window.matchMedia('(min-width: 64rem)').addEventListener('change', (e) => e.matches && setOpen(false));
}
