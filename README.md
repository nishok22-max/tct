# AKR Spinning Mills — scroll-story website

Astro 7 (static) · TypeScript · GSAP 3 + ScrollTrigger + SplitText (lazy, motion-only) · Canvas 2D cotton-field engine · @astrojs/sitemap · self-hosted Instrument Serif + Instrument Sans.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run og         # regenerate trimmed logo, OG image, favicons (sharp)
```

---

## 1. Assumptions & content conflicts (client must confirm)

| # | Conflict / gap | Source evidence | What the site does |
|---|---|---|---|
| 1 | **Heritage length** | Home "35+ Yrs"; JSON-LD `foundingDate: 1998`; milestones "over six decades" | Copy says only "three generations". `1998` is kept in JSON-LD as published; remove it if wrong. |
| 2 | **Count range** | Home "30s – 40s"; product pages Ne 16s–60s; Terms "20s to 40s" | Per-product ranges are used everywhere. Hero shows Ne 16s–60s (the union of the four lines). The Terms text is kept verbatim, with a code comment. |
| 3 | **Karded vs combed** | Karded page: "AKR currently produces karded yarn…" and "We produce 100% cotton karded yarn", yet a combed product page exists | All four products are treated as current. That sentence is not reused. |
| 4 | **Missing content** | No portraits, client names, testimonials, spindle count, capacity or certifications | Dashed placeholders: "Placeholder — replace before launch". Turn them all off with `config.showPlaceholders` in `src/data/site.ts`. |
| 5 | **Image authenticity** | Several images look like stock or AI images (e.g. hero.webp, about.webp) | Client must confirm they show the real mill. |
| 6 | **Low-resolution images** | carding-machine 447px, draw-frame 500px, yarn-testing-lab 516px, polyester-cotton 447px, cotton-polyester 499px | Never full-bleed. They render at native width only, with `object-fit: contain` in frames (`lowRes: true` in data). |
| 7 | **Favicon** | `favicon.png` is a JPEG with a .png extension | Real PNG icons are generated from the logo mark (`npm run og`). |
| 8 | **Fake Product offer** | Karded JSON-LD has `price: "0"` | Dropped. Product JSON-LD has no `offers`. |
| 9 | **Combed "Uster 5%–25%"**, "elite" claims | Combed spec page vs. the karded page's "we do not publish Uster percentile claims without current lot data" | Spec values are shown as the source states them. Confirm they are backed by current lot data. |
| 10 | **CP composition** | Card "60/40" vs spec "60/40 or 80/20" | Both shown where the source shows them. |
| 11 | **Muratec in MD bio** | Management page lists LMW, Trützschler, Rieter, Saurer; History adds Muratec | Uses the full five-partner list from the infrastructure page. |
| 12 | **Leadership hours / phone** | No phone number in the source | No phone shown. The form's phone field is optional. |
| 13 | **Insights, about and manufacturing sub-pages** | 23 live URLs; the brief asks for a single-page home plus products and legal | Not rebuilt. **Add 301 redirects** for old URLs (e.g. `/contact → /#contact`, `/manufacturing/process → /#manufacturing`) in Cloudflare `_redirects` before launch, or the SEO equity is lost. |

## 2. Cinematic scroll-story (Nov 2026 rebuild of the home page)

Story: NATURE → COTTON FIELD → BLOOM → FIBRE → MANUFACTURING → YARN → AKR. Business content is unchanged and still comes only from `src/data/site.ts`.

| Order | Section (`src/components/cinema/`) | Technique |
|---|---|---|
| 1–3 | `Film.astro` — hero `#top`, field `#origin`, bloom `#bloom` | One GSAP-pinned 100svh stage inside a tall container (`--film-len` in CSS). The hero footage is scroll-scrubbed. A sun flare and feathered mask reveal the **live-action field**: a seamless 12 s wind loop that plays in real time while scroll pulls the camera back (scale 1.22 → 1). The shot then **zooms out** into a framed print (→ 0.4) that recedes, revealing the next frame: real out-of-focus field (`field-bokeh.webp`) with the featured cotton plant (canvas engine, `field: false` plant-only mode). Its scroll-driven boll opening, macro bloom and fibre wash are unchanged. |
| 4 | `FibreToYarn.astro` `#fibre` | SVG fibres converge into a two-ply strand, stroke-drawn by scroll. No pin. |
| — | `EnquiryBand.astro` | Unobtrusive enquiry prompt after the opening. |
| 5 | `Story.astro` `#story` | Three generations (real heritage copy). |
| 6 | `Manufacturing.astro` `#manufacturing`, `#machinery` | The seven documented stages with AKR's own infrastructure photos; machinery partners. |
| 7 | `Quality.astro` `#quality`, `#people` | Published quality metrics/parameters, "why it matters", people commitments. |
| 8 | `Products.astro` `#products` | Four yarn lines, spec facts, "View specifications" and "Request a sample" (prefills the form). |
| 9 | `BrandReveal.astro` `#reveal` | Cones → pull back → cream → logo. Pinned on desktop only. |
| 10 | `scenes/Contact.astro` `#contact` | Existing enquiry form (unchanged behaviour). |

**Video.** Source: `media-source/gemini-cotton-landscape-original.mp4` (1280×720, 24 fps, 10.03 s, H.264, one keyframe only, 7.3 MB — unsuitable for seeking). Re-encoded copies in `public/video/` (H.264 High, keyframe every 6 frames, no B-frames, faststart, no audio): `film-hero-*.mp4` = 0–4.75 s (tree landscape → cotton rows → focal plant), `film-bloom-*.mp4` = 4.75–10 s (macro boll). `-wide` 1280×720, `-tall` 540×720 centre crop for portrait screens. Posters in `src/assets/film/`. Re-encode with: `ffmpeg -ss 0 -to 4.75 -i <source> -an -c:v libx264 -preset slow -crf 25 -tune film -pix_fmt yuv420p -g 6 -keyint_min 6 -bf 0 -sc_threshold 0 -movflags +faststart public/video/film-hero-wide.mp4` (add `-vf crop=540:720:(iw-540)/2:0` for `-tall`; bloom uses `-ss 4.75 -to 10.03 -crf 24`).

**Scrubbing** (`src/scripts/cinema/scrubber.ts`): paused element, one seek in flight, latest target applied on `seeked`, 600 ms watchdog, last frame held, metadata-driven duration, poster stays on error, Save-Data/2G keeps posters only.

**Cotton field** (`src/lib/cotton-field/engine.ts`): the original component's drawing functions, kept and extended (`// [ext]`): ground-plane dolly camera (`cameraProgress` + `cameraDepth`), sun position, palmate leaves on near plants, a featured plant whose boll opening is a scroll value (closed capsule → split seams → burr + locks), imperative controller (`setCamera`, `setFeatured`, `set`, `setRunning`), IntersectionObserver-gated RAF, adaptive DPR, sprite-cached ambient bolls, batched grass, cached sky. `src/components/react/AKRMillsCottonField.tsx` keeps the original React API (plus `controllerRef`) for React consumers; the Astro site uses the engine directly (no React runtime shipped). `?debug` on the home page exposes `__akrField.ctl.stats()`.

**Motion** (`src/scripts/cinema/motion.ts`): everything inside `gsap.matchMedia()` (desktop ≥64rem / mobile), reverted on breakpoint or reduced-motion change. `html.cine` is set before first paint (Base.astro) so the film's scroll length exists before hash jumps and scroll restoration. Reduced motion / no JS: stacked static scenes, canvas still frame, all copy visible.

### Performance architecture (hosting)

- **Canvas off the main thread.** `src/lib/cotton-field/offthread.ts` transfers both canvases to a Web Worker (`field.worker.ts`, OffscreenCanvas). The worker rasterises on the CPU (`willReadFrequently`), so the GPU receives one finished bitmap per frame instead of replaying thousands of path/gradient commands, which had been starving page compositing. Measured at 1440×900 on an AMD integrated GPU: 50–77 ms page frames in the canvas chapters became a steady ~7 ms (144 Hz) with 0 long tasks. Browsers without OffscreenCanvas lazy-load the main-thread engine instead.
- **Rendering budget.** Ambient wind renders at ~30 fps, scroll changes render on the next frame, and nothing renders off-screen or in a hidden tab. While defocused, the field drops to ~45 % resolution (it is blurred anyway). Adaptive pixel ratio applies, phones cap at 1×, ambient bolls come from a sprite cache, and the grass is batched.
- **Loading.** LCP is the hero poster: AVIF, responsive, `fetchpriority=high`. The two hero fonts are preloaded. The initial page script is 3.5 KB gzipped, and GSAP is a separate 51 KB chunk. The hero clip downloads after `load` (or on first scroll), because its first frame is the poster. The bloom clip downloads when the field chapter approaches. Everything below the film is lazy-loaded.
- **Caching.** `public/_headers` (Cloudflare Pages / Netlify) makes `/_astro/*` immutable for 1 year, `/video/*` cached for 30 days (rename a clip when re-encoding), and HTML revalidates. On Vercel, put the same rules in `vercel.json` `headers`.

### Media inventory

| Need | Asset used | Status |
|---|---|---|
| Live-action field (wind loop) | Pexels 13943183 "Cotton Plants under Clear Sky" by Lio Voo — Pexels License; sky replaced and graded (`scripts/footage/grade-field.sh`) | Free, no attribution required; must not be presented as AKR's own field. See `media-source/pexels-13943183/LICENSE-NOTES.md` |
| Opening landscape → cotton | Gemini clip (supplied) | AI-generated; shows a Gemini ✦ mark bottom-right — supply a clean export if available |
| Bloom macro | Same clip, 4.75–10 s | AI-generated, illustrative |
| Heritage | `about.webp` (cones on winding frame) | No archive photos or portraits exist — needed |
| Opening & cleaning | `infrastructure/blowroom-line.webp` | OK |
| Carding | `infrastructure/carding-machine.webp` | 447 px — shown at native size on a mat; replace |
| Drawing | `infrastructure/draw-frame.webp` | 500 px — replace |
| Roving | `infrastructure/roving-frame.webp` | OK |
| Spinning | `infrastructure/LMW-RF-1.webp`, `hero.webp` (aisle) | Confirm `hero.webp` shows the real mill |
| Winding | `infrastructure/autoconer.webp` | OK |
| Testing | `infrastructure/yarn-testing-lab.webp` | 516 px — replace |
| Products | `products/*.webp` | PC and CP photos are 447/499 px — replace |
| Finished cones (reveal) | `products/combed-cotton-yarn.webp` | 1024 px; confirm it is AKR stock |
| Logo | `brand/akr-logo-alpha.png` (white keyed out of the supplied source by `scripts/make-logo-alpha.mjs`) | Supply a vector/transparent master if one exists |

Legacy clips from the previous version (WhatsApp/Gemini "journey") are kept, unused, in `media-source/legacy-video/`; they depict generic AI machinery, so they are not presented as AKR's facility.

## 5. Build workflow (each step has a done-check)

1. **Scaffold.** `npm install` → done when `node_modules` exists with no errors.
2. **Assets.** `npm run og` → done when `src/assets/brand/akr-logo.png`, `public/og.jpg` and the favicons exist.
3. **Content.** Edit `src/data/site.ts` → done when `npm run check` reports 0 errors.
4. **Dev.** `npm run dev` → done when all 8 scenes render with JS off, with the OS setting at reduced motion, and on desktop.
5. **Env.** Copy `.env.example` → `.env` and set the endpoint, Turnstile and GTM → done when a test enquiry arrives at `info@akrmills.com`.
6. **Build.** `npm run build` → done when 8 pages are built, `dist/sitemap-index.xml` exists, and there are no warnings.
7. **Audit.** Run Lighthouse and axe on `npm run preview` → done when all four categories are ≥95 and axe reports 0 violations.
8. **Deploy (Cloudflare Pages).** Build command `npm run build`, output `dist`, env vars set, `/api/enquiry` Function kept, `_redirects` added for old URLs → done when the preview URL passes steps 5–7.
9. **Go live.** Point akrmills.com at the project and submit `sitemap-index.xml` in Search Console → done when the sitemap is accepted.

## 6. Verified in this build (2026-11-25)

- `npm run build`: 8 pages, sitemap generated. `npm run check` (astro check): 0 errors, 0 warnings, 0 hints. The project has no ESLint/test setup.
- Browser-tested at 1440×900, 1366×768 and 390×844: scrubbing forward/back (40 alternating jumps land on the exact frame, element never plays), transitions, boll opening/reversal, anchors (`/#story` direct load, `#origin` CTA), mobile menu (Esc returns focus), enquiry validation, `?product=` prefill, mailto fallback.
- Canvas cost at 1440×900: ~30 ms → ~14–16 ms per frame after sprite caching and blade batching; zero frames rendered while off-screen.

## 7. Quality checklist

**Performance:** LCP < 2.5s (on 4G mobile; the LCP element is the H1 text, not an image), CLS < 0.1 (all media have aspect ratios), INP < 200ms, home JS < 60 KB gz, Lighthouse ≥ 95 ×4.

**Accessibility:**
- axe DevTools: 0 violations.
- Keyboard-only pass: skip link, menu Esc, rail, product focus swaps the image, table scroll region, form errors focus the first invalid field.
- NVDA + Firefox and VoiceOver + Safari: landmarks, one H1, stage "n of 7", metric sr-only values, live status.
- 200% and 400% zoom with no loss of content.
- Reduced motion on: no pin, no scrub, everything visible.
- JS disabled: all content is visible and the form posts natively.

**Cross-browser:** Chrome, Edge, Firefox, Safari macOS/iOS, Samsung Internet; widths 360, 390, 768, 1024, 1280, 1440 and 1920px. Check the family pin and the process sticky at the 1024px boundary.

**Launch:**
- [ ] Replace or remove the placeholders (`config.showPlaceholders = false`).
- [ ] Client confirms the photos show the real mill, and supplies higher-resolution images for the five low-resolution files.
- [ ] Confirm the heritage years, count ranges, Terms wording, combed Uster claim and `foundingDate`.
- [ ] Verify the `/api/enquiry` endpoint and Turnstile key on the production domain; test the success path and the mailto fallback.
- [ ] Set `PUBLIC_GTM_ID` only if analytics stays. The privacy policy mentions Google Analytics, so keep the two consistent.
- [ ] Add 301 redirects for the 23 legacy URLs.
- [ ] Submit the sitemap in Search Console and run the Rich Results test on a product page.
