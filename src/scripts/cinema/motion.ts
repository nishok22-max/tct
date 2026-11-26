// All scroll choreography. Loaded only when prefers-reduced-motion is "no-preference".
// Everything is created inside gsap.matchMedia(), so changing the OS setting or crossing the
// desktop/mobile breakpoint reverts every tween, ScrollTrigger, pin, class and listener.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { VideoScrubber, lowData } from './scrubber';
import { FrameSequence } from './sequence';
import type { Field } from './index';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const q = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
const qa = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

/* ------------------------------------------------------------------ */
/* Film timeline — positions are in "screens" of scroll on desktop.    */
/* ------------------------------------------------------------------ */
// The same choreography is used on mobile, compressed into a shorter scroll (--film-len in CSS).
const T = {
  heroVideo: [0, 2.4],
  heroCopyOut: [0, 0.55],
  push: [2.0, 2.95],
  flareIn: [2.3, 2.72],
  flareOut: [2.72, 3.3],
  reveal: [2.42, 3.0],
  // Live-action field: wind plays in real time; scroll only moves the camera.
  pullBack: [2.45, 4.55],      // steady, unhurried camera pull-back through the plants
  originIn: [3.1, 3.5],
  originOut: [4.15, 4.45],
  zoomOut: [4.5, 5.5],         // the shot pulls back into a framed print and recedes…
  frameOut: [5.25, 5.6],       // …revealing the next frame behind it
  approach: [5.05, 6.4],
  open: [5.5, 6.9],
  glow: [6.4, 7.0],
  bloomIn: [6.8, 7.3],
  bloomVideo: [6.8, 8.6],
  bloomCopyIn: [7.0, 7.4],
  bloomCopyOut: [8.1, 8.5],
  fibres: [8.25, 9.2],
  wash: [8.8, 9.4],
  end: 9.4,
} as const;

// Where the bloom clip's boll matches the canvas boll (centred, radius ≈ 240 px at 720 p).
const BLOOM_MATCH_T = 2.0;
const BLOOM_BOLL_R = 240;

const span = ([a, b]: readonly [number, number]) => ({ at: a, d: b - a });

function buildFibres(group: SVGGElement, count: number) {
  if (group.childElementCount) return;
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const r0 = 40 + r() * 120;
    const r1 = 520 + r() * 520;
    const bend = (r() - 0.5) * 2.2;
    const x0 = 800 + Math.cos(a) * r0;
    const y0 = 450 + Math.sin(a) * r0;
    const cx = 800 + Math.cos(a + bend) * r1 * 0.55;
    const cy = 450 + Math.sin(a + bend) * r1 * 0.55;
    const x1 = 800 + Math.cos(a + bend * 0.4) * r1;
    const y1 = 450 + Math.sin(a + bend * 0.4) * r1;
    const p = document.createElementNS(NS, 'path');
    // A soft S-curve with a slight curl at the tip, like a single lint fibre.
    const c2x = 800 + Math.cos(a - bend * 0.5) * r1 * 0.82;
    const c2y = 450 + Math.sin(a - bend * 0.5) * r1 * 0.82;
    p.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)} C${cx.toFixed(1)} ${cy.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    p.setAttribute('pathLength', '1');
    p.setAttribute('stroke-width', (0.35 + r() * 1.1).toFixed(2));
    p.setAttribute('opacity', (0.35 + r() * 0.6).toFixed(2));
    group.appendChild(p);
  }
}

function registerFilm(ctx: gsap.Context, field: Field | null, mobile: boolean) {
  const film = q('[data-film]');
  const stage = q('[data-film-stage]');
  if (!film || !stage) return;

  // Layout (scroll length, stacked layers) comes from `html.cine` in CSS; see Base.astro.
  document.documentElement.classList.add('cine');
  film.classList.add('is-live');
  ctx.add(() => () => {
    film.classList.remove('is-live');
    document.documentElement.classList.remove('cine');
  });

  const heroScene = q('[data-scene="hero"]', film)!;
  const originScene = q('[data-scene="origin"]', film)!;
  const bloomScene = q('[data-scene="bloom"]', film)!;
  const focusScene = q('[data-scene="focus"]', film)!;
  const heroMedia = q('[data-hero-media]', film)!;
  const liveFrame = q('[data-live-frame]', film)!;
  const bokeh = q('[data-focus-bokeh]', film) ?? q('.focus__bokeh', film);
  const flare = q('[data-flare]', film)!;
  const fibres = q<SVGSVGElement>('[data-fibres]', film)!;
  const strands = q<SVGGElement>('[data-fibre-strands]', fibres)!;
  const wash = q('[data-wash]', film)!;
  buildFibres(strands, mobile ? 36 : 150);

  /* ---- Anchor marks (#top, #origin, #bloom) sit at their chapter's scroll position ---- */
  const marks = qa('[data-mark]', film);
  const homes = marks.map((m) => m.parentElement!);
  marks.forEach((m) => film.appendChild(m));
  const placeMarks = () => {
    const travel = film.offsetHeight - innerHeight;
    // Each mark sits inside its chapter's 'hold', where the headline is fully visible.
    const pos: Record<string, number> = { top: 0, origin: (T.originIn[1] + 0.15) / T.end, bloom: (T.bloomCopyIn[1] + 0.15) / T.end };
    marks.forEach((m) => { m.style.top = `${Math.round((pos[m.id] ?? 0) * travel)}px`; });
  };
  ctx.add(() => () => marks.forEach((m, i) => { homes[i]!.prepend(m); m.style.top = ''; }));

  /* ---- Video scrubbers ---- */
  // Desktop seeks real video; phones scrub pre-decoded stills (see sequence.ts for why).
  const seq = (name: string) => {
    const c = q<HTMLCanvasElement>(`[data-seq="${name}"]`, film)!;
    return new FrameSequence(c, c.dataset.base ?? '', Number(c.dataset.count ?? 0));
  };
  const useFrames = mobile;
  film.classList.toggle('uses-frames', useFrames);
  ctx.add(() => () => film.classList.remove('uses-frames'));
  const heroVideo = useFrames ? seq('hero') : new VideoScrubber(q<HTMLVideoElement>('[data-film-video="hero"]', film)!, () => ScrollTrigger.refresh());
  const bloomVideo = useFrames ? seq('bloom') : new VideoScrubber(q<HTMLVideoElement>('[data-film-video="bloom"]', film)!);
  // The bloom stills begin where the canvas boll hands over (BLOOM_MATCH_T into the clip).
  const bloomFrom = BLOOM_MATCH_T / 5.25;
  const bloomProgress = (p: number) => (useFrames ? (p - bloomFrom) / (1 - bloomFrom) : p);
  // The poster is the clip's first frame, so nothing visible waits on the video. Start downloading
  // after the page's own load (fonts, LCP image), or immediately if the visitor starts scrolling.
  const startHero = () => heroVideo.load();
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 300));
  if (document.readyState === 'complete') idle(startHero);
  else addEventListener('load', () => idle(startHero), { once: true });
  addEventListener('scroll', startHero, { once: true, passive: true });
  ctx.add(() => () => removeEventListener('scroll', startHero));
  ctx.add(() => () => { heroVideo.destroy(); bloomVideo.destroy(); });

  /* ---- Live-action field: a seamless 12 s wind loop that plays in real time ---- */
  // Not scrubbed — wind should move at its own natural pace. It loads during the hero, plays only
  // while its chapter is on screen, and pauses otherwise (no hidden decoding).
  const fieldVideo = q<HTMLVideoElement>('[data-field-video]', film);
  let fieldLoaded = false;
  let fieldPlaying = false;
  const loadField = () => {
    if (fieldLoaded || !fieldVideo || lowData()) return;
    fieldLoaded = true;
    fieldVideo.src = (matchMedia('(max-aspect-ratio: 3/4)').matches ? fieldVideo.dataset.srcTall : fieldVideo.dataset.srcWide) ?? '';
    fieldVideo.preload = 'auto';
    fieldVideo.addEventListener('playing', () => fieldVideo.classList.add('is-ready'), { once: true });
    fieldVideo.addEventListener('error', () => { fieldVideo.removeAttribute('src'); fieldVideo.classList.remove('is-ready'); }, { once: true });
    fieldVideo.load();
  };
  const setFieldPlaying = (want: boolean) => {
    if (!fieldVideo || !fieldLoaded || want === fieldPlaying) return;
    fieldPlaying = want;
    if (want) fieldVideo.play().catch(() => { fieldPlaying = false; }); // poster stays if autoplay is refused
    else fieldVideo.pause();
  };
  ctx.add(() => () => { fieldVideo?.pause(); fieldPlaying = false; });

  /* ---- Live values pushed to the canvas + videos once per tick (never React/DOM state) ---- */
  const s = { hero: 0, approach: 0, boll: 0, glow: 0, bloom: BLOOM_MATCH_T / 5.25 };
  const plantWindow = [T.zoomOut[0] - 0.1, T.bloomIn[1] + 0.1];
  let plantOn = false;
  let masked = true;

  const targetRadius = () => {
    const w = innerWidth;
    const h = innerHeight;
    const vw = matchMedia('(max-aspect-ratio: 3/4)').matches ? 540 : 1280;
    const r = BLOOM_BOLL_R * Math.max(w / vw, h / 720) * 0.96;
    // On narrow portrait screens the footage crops tighter than the canvas can draw well; keep the boll inside the frame.
    return Math.min(r, Math.min(w, h) * 0.46);
  };
  let tR = targetRadius();

  const push = (progress: number) => {
    const t = progress * T.end;
    heroVideo.setProgress(s.hero);
    // Phones: wait until the hero is well under way so its frames don't compete for bandwidth.
    if (t > (mobile ? 1.7 : 0.6)) loadField();
    setFieldPlaying(t >= T.reveal[0] - 0.15 && t <= T.frameOut[1] && !document.hidden);
    if (t > T.zoomOut[0] - 1) bloomVideo.load();
    bloomVideo.setProgress(bloomProgress(s.bloom));
    // The feathered reveal mask costs compositing on a full-screen layer; drop it once fully open.
    const needMask = !mobile && t < T.reveal[1];
    if (needMask !== masked) { masked = needMask; originScene.classList.toggle('is-masked', needMask); }
    if (!field) return;
    const on = t >= plantWindow[0]! && t <= plantWindow[1]!;
    if (on !== plantOn) {
      plantOn = on;
      field.ctl.setRunning(on); // the plant's wind only runs while it is on screen
    }
    if (!on) return;
    field.ctl.setFeatured({ boll: s.boll, approach: s.approach, glow: s.glow, targetRadius: tR });
  };
  const onVisibility = () => push(tl.progress());
  document.addEventListener('visibilitychange', onVisibility);
  ctx.add(() => () => document.removeEventListener('visibilitychange', onVisibility));
  if (field) {
    field.ctl.setRunning(false);
    ctx.add(() => () => field.ctl.setRunning(true));
  }

  gsap.set([originScene, focusScene, bloomScene], { autoAlpha: 0 });
  gsap.set(liveFrame, { scale: 1.22, transformOrigin: '50% 46%' });
  // Feathered radial mask, opened from the sun's position (see .scene--origin in CSS).
  if (!mobile) {
    gsap.set(originScene, { '--reveal': '0%' });
    originScene.classList.add('is-masked');
  }
  ctx.add(() => () => { originScene.classList.remove('is-masked'); originScene.style.removeProperty('--reveal'); });
  gsap.set(fibres, { autoAlpha: 0 });
  gsap.set(qa('path', strands), { strokeDasharray: 1, strokeDashoffset: 1 });

  // Values are pushed from the timeline's own render (not the ScrollTrigger callback), so the
  // canvas and videos follow the scrubbed playhead exactly, in both directions.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: () => push(tl.progress()),
    scrollTrigger: {
      trigger: film,
      start: 'top top',
      end: 'bottom bottom',
      // Desktop: GSAP pin. Phones: the stage is position: sticky in CSS — native, compositor-driven,
      // and unaffected by the address bar showing/hiding (a JS pin re-positions on every resize).
      pin: mobile ? false : stage,
      pinSpacing: false, // the film's own height (CSS --film-len) provides the scroll distance
      scrub: mobile ? true : 0.3,
      invalidateOnRefresh: true,
      onRefresh: () => { tR = targetRadius(); placeMarks(); push(tl.progress()); },
    },
  });

  const add = (target: gsap.TweenTarget | object, vars: gsap.TweenVars, w: readonly [number, number]) => {
    const { at, d } = span(w);
    tl.to(target, { ...vars, duration: d }, at);
  };

  // 1 · NATURE — footage scrubbed, copy drifts away, camera pushes into the foreground plant
  add(s, { hero: 1 }, T.heroVideo);
  add(q('[data-hero-copy]', film), { autoAlpha: 0, y: -70 }, T.heroCopyOut);
  add(q('[data-scroll-cue]', film), { autoAlpha: 0 }, [0, 0.18]);
  add(heroMedia, { scale: 1.42, transformOrigin: '50% 82%', ease: 'power2.in' }, T.push);

  // Transition — low sun flares across the lens and the cotton field opens out of the light
  add(flare, { autoAlpha: 1, scale: 1.15, ease: 'power1.in' }, T.flareIn);
  add(flare, { autoAlpha: 0, scale: 1.35, ease: 'power1.out' }, T.flareOut);
  if (mobile) {
    // Phones: a plain dissolve (a full-screen animated mask is expensive to composite on mobile GPUs).
    add(originScene, { autoAlpha: 1, ease: 'power1.inOut' }, T.reveal);
  } else {
    tl.set(originScene, { autoAlpha: 1 }, T.reveal[0]);
    add(originScene, { '--reveal': '170%', ease: 'power2.inOut' }, T.reveal);
  }

  // 2 · ORIGIN — live footage; the camera pulls back steadily while the wind plays on its own
  add(liveFrame, { scale: 1 }, T.pullBack);
  tl.fromTo(q('[data-origin-copy]', film), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: span(T.originIn).d, ease: 'power2.out' }, T.originIn[0]);
  add(q('[data-origin-copy]', film), { autoAlpha: 0, y: -40 }, T.originOut);

  // Zoom-out — the shot keeps pulling back until it becomes a framed print that recedes, revealing
  // the next frame: the same field, now out of focus, with one cotton plant stepping forward.
  tl.set(focusScene, { autoAlpha: 1 }, T.zoomOut[0]);
  tl.set(heroScene, { autoAlpha: 0 }, T.zoomOut[0]);
  add(liveFrame, { scale: mobile ? 0.5 : 0.4, borderRadius: mobile ? 14 : 18, yPercent: -4, ease: 'power2.inOut' }, T.zoomOut);
  if (bokeh) tl.fromTo(bokeh, { scale: 1.16 }, { scale: 1, duration: span(T.zoomOut).d + 0.4, ease: 'power1.out' }, T.zoomOut[0]);
  add(originScene, { autoAlpha: 0, ease: 'power1.in' }, T.frameOut);

  // 3 · BLOOM — unchanged cotton treatment: one boll is singled out, opens, catches the light
  add(s, { approach: 1 }, T.approach);
  add(s, { boll: 1 }, T.open);
  add(s, { glow: 1 }, T.glow);
  add(bloomScene, { autoAlpha: 1 }, T.bloomIn);
  add(s, { bloom: 1 }, T.bloomVideo);
  tl.set(focusScene, { autoAlpha: 0 }, T.bloomIn[1]);
  tl.fromTo(q('[data-bloom-copy]', film), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: span(T.bloomCopyIn).d, ease: 'power2.out' }, T.bloomCopyIn[0]);
  add(q('[data-bloom-copy]', film), { autoAlpha: 0, y: -40 }, T.bloomCopyOut);

  // Fibres fill the screen and settle into the cream of the next chapter
  tl.set(fibres, { autoAlpha: 1 }, T.fibres[0]);
  // Scaling a full-screen SVG re-rasterises it every frame; phones draw the strands without the push-in.
  if (!mobile) tl.fromTo(fibres, { scale: 0.7 }, { scale: 1.6, duration: span(T.fibres).d, ease: 'power1.in' }, T.fibres[0]);
  tl.to(qa('path', strands), { strokeDashoffset: 0, duration: span(T.fibres).d * 0.8, stagger: { each: 0.0025, from: 'random' } }, T.fibres[0]);
  tl.fromTo(q('[data-fibre-core]', fibres), { opacity: 0 }, { opacity: 1, duration: span(T.fibres).d }, T.fibres[0]);
  add(wash, { autoAlpha: 1 }, T.wash);

  placeMarks();
  push(0);

  // A #hash in the URL was resolved before the film had its final layout; resolve it again.
  const hash = location.hash.slice(1);
  if (hash) {
    const go = () => document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    requestAnimationFrame(() => { ScrollTrigger.refresh(); go(); });
  }
}

/* ------------------------------------------------------------------ */
/* Editorial sections (normal scroll)                                   */
/* ------------------------------------------------------------------ */
function registerSections(desktop: boolean) {
  // Masked line reveals on section headings.
  qa('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110, duration: 1, ease: 'power3.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none reverse' },
      }),
    });
  });

  // Yarn winding: the thread draws in through the eyelet, then cross-wound layers build up on the cone
  // while the feed point traverses up and down it (like an autoconer's winding drum).
  const fs = q('[data-fibre-section]');
  const feed = fs && q<SVGLineElement>('[data-wind-feed]', fs);
  if (fs && feed) {
    const thread = q<SVGPathElement>('[data-wind-thread]', fs);
    const wraps = qa<SVGPathElement>('[data-wind-wrap]', fs);
    const body = q('[data-wind-body]', fs);
    const eye = q('[data-wind-eye]', fs);
    const n = (k: string) => Number(feed.dataset[k]);
    const g = { top: n('top'), bottom: n('bottom'), cx: n('cx'), th: n('topHalf'), bh: n('bottomHalf'), ct: n('coneTop'), cb: n('coneBottom') };
    const wind = { p: 0 };
    gsap.set([thread, ...wraps], { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(feed, { autoAlpha: 0 });
    const traverse = () => {
      // 7 full traverses over the scroll range; the feed meets the cone's left flank at that height.
      const s = 0.5 - 0.5 * Math.cos(wind.p * Math.PI * 14);
      const y = g.bottom - s * (g.bottom - g.top);
      const half = g.th + ((y - g.ct) / (g.cb - g.ct)) * (g.bh - g.th);
      feed.setAttribute('x2', (g.cx - half).toFixed(1));
      feed.setAttribute('y2', y.toFixed(1));
    };
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: fs, start: 'top 75%', end: desktop ? 'bottom 40%' : 'bottom 65%', scrub: true } })
      .to(thread, { strokeDashoffset: 0, duration: 0.3 }, 0)
      .fromTo(eye, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.06 }, 0.27)
      .set(feed, { autoAlpha: 1 }, 0.3)
      .to(wind, { p: 1, duration: 0.7, onUpdate: traverse }, 0.3)
      .to(wraps, { strokeDashoffset: 0, duration: 0.08, stagger: 0.62 / Math.max(1, wraps.length) }, 0.32)
      .fromTo(body, { opacity: 0.15 }, { opacity: 1, duration: 0.6 }, 0.35);
    traverse();
  }

  // Manufacturing opener: the aisle opens from a framed print to full bleed.
  const opener = q('[data-opener-frame]');
  if (opener) {
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: opener, start: 'top 90%', end: 'bottom 60%', scrub: true } })
      .fromTo(opener, { clipPath: desktop ? 'inset(0% 14% 0% 14%)' : 'inset(0% 5% 0% 5%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }, 0)
      .fromTo(q('img', opener), { scale: 1.22 }, { scale: 1 }, 0);
  }

  // Stage images: reveal from below with a slow settle; copy rises in.
  qa('[data-stage]').forEach((st) => {
    const media = q('[data-stage-media]', st);
    const img = media && q('img', media);
    if (media && img) {
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: st, start: 'top 88%', end: 'top 35%', scrub: true } })
        .fromTo(media, { clipPath: 'inset(18% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }, 0)
        .fromTo(img, { scale: 1.16 }, { scale: 1 }, 0);
    }
    const copy = q('[data-stage-copy]', st);
    if (copy) gsap.from(copy.children, { y: 34, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: copy, start: 'top 84%', toggleActions: 'play none none reverse' } });
  });

  // Restrained parallax inside framed images.
  qa('[data-parallax-img]').forEach((img) => {
    const frame = img.closest('[data-parallax-frame]') ?? img;
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  qa('[data-yarn-img]').forEach((img) => {
    gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('[data-yarn]') ?? img, start: 'top bottom', end: 'center 55%', scrub: true } });
  });

  // Staggered entrances.
  const batch = (sel: string) => ScrollTrigger.batch(sel, {
    start: 'top 90%',
    onEnter: (els) => gsap.fromTo(els, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });
  gsap.set('[data-partner], [data-gen], [data-yarn] .yarn__copy', { autoAlpha: 0 });
  batch('[data-partner]');
  batch('[data-gen]');
  batch('[data-yarn] .yarn__copy');

  // Metric count-up (real values are in sr-only text and in the initial HTML).
  qa('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const d = Number(el.dataset.decimals ?? 0);
    const o = { v: 0 };
    el.textContent = (0).toFixed(d);
    gsap.to(o, {
      v: end, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = o.v.toFixed(d); },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Final brand reveal                                                   */
/* ------------------------------------------------------------------ */
function registerReveal(ctx: gsap.Context, desktop: boolean) {
  const sec = q('[data-reveal]');
  const stage = q('[data-reveal-stage]');
  const frame = q('[data-reveal-frame]');
  if (!sec || !stage || !frame) return;
  const img = q('img', frame);
  const lines = qa('.line > span', sec);
  const logo = q('[data-reveal-logo]', sec);
  const subs = qa('[data-reveal-sub]', sec);
  sec.classList.add('is-live');
  ctx.add(() => () => sec.classList.remove('is-live'));

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: desktop
      ? { trigger: sec, start: 'top top', end: '+=170%', pin: stage, scrub: 0.3, invalidateOnRefresh: true }
      : { trigger: sec, start: 'top 70%', end: 'bottom 85%', scrub: true },
  });
  // Rows of cones fill the frame → the camera pulls back → the print recedes into cream.
  tl.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1 }, 0)
    .fromTo(frame, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: desktop ? 'inset(20% 30% 34% 30% round 4px)' : 'inset(14% 12% 52% 12% round 4px)', duration: 1, ease: 'power2.inOut' }, 0.6)
    .to(frame, { autoAlpha: 0, duration: 0.5 }, 1.35)
    .fromTo(logo, { autoAlpha: 0, y: 30, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }, 1.45)
    .fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 1.55)
    .fromTo(subs, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }, 1.8)
    .to({}, { duration: 0.3 });
}

export function initMotion(field: Field | null) {
  const mm = gsap.matchMedia();
  mm.add(
    {
      desktop: '(min-width: 64rem) and (prefers-reduced-motion: no-preference)',
      mobile: '(max-width: 63.99rem) and (prefers-reduced-motion: no-preference)',
    },
    (ctx) => {
      const { desktop, mobile } = ctx.conditions as { desktop: boolean; mobile: boolean };
      if (!desktop && !mobile) return;
      document.documentElement.classList.add('motion-on');
      ctx.add(() => () => document.documentElement.classList.remove('motion-on'));
      registerFilm(ctx, field, mobile);   // page order: film, sections, reveal
      registerSections(desktop);
      registerReveal(ctx, desktop);
      // Late layout changes (fonts, lazy images) → recompute once everything has loaded.
      const onLoad = () => ScrollTrigger.refresh();
      if (document.readyState === 'complete') requestAnimationFrame(onLoad);
      else addEventListener('load', onLoad, { once: true });
      document.fonts?.ready.then(onLoad);
      return () => removeEventListener('load', onLoad);
    },
  );
  return mm;
}
