# akrmills.com — Site Report (for redesign)

## Overview
- Company: AKR Spinning Mills — 3-generation family cotton yarn mill, Pollachi, Tamil Nadu, India (founded 1998 per JSON-LD)
- Stack: Astro v7.3.4 static site, Tailwind CSS (single bundle `/_astro/MainLayout.BoPCNeG3.css`), Lucide icons (inline SVG), hosted on Cloudflare
- Analytics: GTM `GTM-W4BVFWGN`, GA4 `G-GWFH5G696Q`
- Contact form: POST `/api/enquiry` (FormData), Cloudflare Turnstile sitekey `0x4AAAAAAFLcYcZtHXWmvIMh`; `?product=` query param pre-selects product dropdown
- robots.txt: allow all, disallow /admin/ /api/; sitemap at /sitemap-index.xml -> /sitemap-0.xml
- Note: unknown URLs return the 404 page with HTTP 200 (soft 404)

## Contact data
- Address: No. 85/16 Palakkad Road, Gandhi Nagar, Pollachi - 642001, Coimbatore, Tamil Nadu, India
- Email: info@akrmills.com
- Hours: Mon–Sat 9:00 AM – 6:00 PM IST
- GSTIN: 33ACPFA1219G1ZP
- Map: https://maps.app.goo.gl/uazSDGGynKSW3vef8?g_st=iw (+ Google Maps embed iframe)

## Sitemap (23 pages)
/ · /about · /about/history · /about/management · /about/milestones · /manufacturing · /manufacturing/process · /manufacturing/infrastructure · /products · /products/karded-yarn · /products/combed-yarn · /products/polyester-cotton · /products/cotton-polyester · /insights · /insights/what-is-karded-yarn · /insights/karded-vs-combed-which-is-right · /insights/ring-spinning-explained · /insights/understanding-yarn-count · /insights/warp-vs-weft-yarn-weaving-standards · /people-and-csr · /contact · /privacy · /terms (+ 404)

## Navigation
Top bar (desktop): "3rd-Generation Family Mill · Pollachi, Tamil Nadu, India" | info@akrmills.com | Request a Sample
Main: Home · About (Overview, History, Management, Milestones) · Manufacturing (Overview, Our Process, Infrastructure) · Products · Insights · People & CSR · [Enquire Now CTA]
Mobile adds Contact + Privacy/Terms. Footer pillars strip: PEOPLE | QUALITY | COMMUNITY | CRAFTSMANSHIP

## Design tokens (from CSS)
Colors: navy #12366b (primary), navy-dark #0d2a54, gold #c68420, gold-light #d9a04a, green #145638 (secondary), green-dark #0e3f28, red #ab1308, charcoal #1f2937, deep-charcoal #111827, muted #6b7280, border-gray #e5e7eb, soft-gray #f5f6f7, warm-white #fcfcf9
Fonts: headings Playfair Display (400–800 + italics); body Plus Jakarta Sans (300–800) — Google Fonts, files in assets/fonts
Buttons: pill (radius 9999px), btn-primary navy, btn-secondary green, btn-outline, btn-ghost; Cards: white, 1px border, radius .75rem
Effects: scroll-reveal (.reveal -> .visible via IntersectionObserver), back-to-top button after 500px, sticky header, hero decorative radial/diagonal-stripe gradients

## Structured data
JSON-LD Organization+WebSite on home, about, products/karded-yarn (see CONTENT_ALL_PAGES.md).

## Folder layout
- CONTENT_ALL_PAGES.md — every page's text, meta, JSON-LD, form fields, links, image refs
- akrmills_raw/pages/ — original HTML of all 23 pages
- akrmills_raw/text/ — per-page extracted text
- akrmills_raw/assets/images/ ... (see assets/images) — all 22 images (webp originals), logo, favicon
- akrmills_raw/assets/css, assets/fonts — site CSS, Google Fonts CSS + 15 woff2 files
