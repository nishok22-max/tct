/**
 * AKR Spinning Mills — single source of copy and facts.
 * Every fact below comes from TCT/CONTENT_ALL_PAGES.md or TCT/SITE_REPORT.md.
 * Edit copy here; components only render it.
 */
import type { ImageMetadata } from 'astro';

import about from '../assets/images/about.webp';
import infrastructure from '../assets/images/infrastructure.webp';
import blowroom from '../assets/images/infrastructure/blowroom-line.webp';
import carding from '../assets/images/infrastructure/carding-machine.webp';
import drawFrame from '../assets/images/infrastructure/draw-frame.webp';
import roving from '../assets/images/infrastructure/roving-frame.webp';
import ringFrame from '../assets/images/infrastructure/LMW-RF-1.webp';
import autoconer from '../assets/images/infrastructure/autoconer.webp';
import lab from '../assets/images/infrastructure/yarn-testing-lab.webp';
import pcImg from '../assets/images/products/polyester-cotton.webp';
import cpImg from '../assets/images/products/cotton-polyester.webp';
import kardedImg from '../assets/images/products/karded-cotton-yarn.webp';
import kardedHeroImg from '../assets/images/products/karded-yarn.webp';
import combedImg from '../assets/images/products/combed-cotton-yarn.webp';

/* ------------------------------------------------------------------ */
/* Launch switches                                                     */
/* ------------------------------------------------------------------ */
export const config = {
  /** Show dashed "Placeholder — replace before launch" boxes for missing content. Set false to hide them all. */
  showPlaceholders: false,
};

/* ------------------------------------------------------------------ */
/* Company                                                             */
/* ------------------------------------------------------------------ */
export const company = {
  name: 'AKR Spinning Mills',
  short: 'AKR',
  url: 'https://akrmills.com',
  tagline: '3rd-Generation Family Mill · Pollachi, Tamil Nadu, India',
  description:
    'A three-generation family-run mill rooted in cotton trading and ginning, producing premium 100% cotton karded, combed, and blended yarns from Tamil Nadu, India.',
  foundingDate: '1998', // JSON-LD only — see assumptions; not shown as copy.
  email: 'info@akrmills.com',
  address: {
    street: 'No. 85/16 Palakkad Road, Gandhi Nagar',
    locality: 'Pollachi',
    postalCode: '642001',
    district: 'Coimbatore',
    region: 'Tamil Nadu',
    country: 'India',
    countryCode: 'IN',
    full: 'No. 85/16 Palakkad Road, Gandhi Nagar, Pollachi - 642001, Coimbatore, Tamil Nadu, India',
  },
  hours: { days: 'Monday – Saturday', time: '9:00 AM – 6:00 PM IST', short: 'Mon–Sat, 9:00 AM – 6:00 PM IST' },
  gstin: '33ACPFA1219G1ZP',
  mapsUrl: 'https://maps.app.goo.gl/uazSDGGynKSW3vef8?g_st=iw',
  pillars: ['People', 'Quality', 'Community', 'Craftsmanship'],
  knowsAbout: [
    'Cotton Yarn Manufacturing',
    'Karded Cotton Yarn',
    'Ring Spinning',
    'Textile Processing',
    'Polyester Cotton Blended Yarns',
  ],
};

export const seo = {
  home: {
    title: 'AKR Spinning Mills | Ring-Spun Cotton & Blended Yarn, Pollachi',
    description:
      'Three-generation family spinning mill in Pollachi, Tamil Nadu. Ring-spun 100% cotton, polyester cotton and blended yarns for knitters, weavers and manufacturers.',
  },
};

export const why = {
  eyebrow: 'Why it matters',
  title: 'A weak cone stops a loom.',
  intro:
    'Every buyer knows the cost of inconsistent yarn: fabric weight that drifts, breaks on high-speed frames, streaks after dyeing. Here is how the mill answers each one.',
  rows: [
    {
      problem: 'Count drift',
      answer: 'CV control',
      detail:
        'Count variation (CV%) is controlled at drawing and roving, and monitored at the ring frame and in testing. Consistent count means consistent fabric weight.',
    },
    {
      problem: 'Yarn breakage',
      answer: 'Tenacity testing',
      detail:
        'Tenacity and elongation are tested on finished yarn so each lot has the mechanical performance your knitting or weaving application needs.',
    },
    {
      problem: 'Neps and streaks',
      answer: 'Electronic clearers',
      detail:
        'Electronic yarn clearers at winding scan every centimetre, cutting out thick places, thin places and neps and replacing them with knot-free splices.',
    },
    {
      problem: 'Middlemen',
      answer: 'Direct access to the MD and JMD',
      detail:
        'No corporate bureaucracy or impersonal account reps. Buyers discuss specifications and commercial terms directly with the leadership.',
    },
  ],
};

export const family = {
  eyebrow: 'Three-generation heritage',
  title: 'Traders. Ginners. Spinners.',
  intro:
    "We didn't start in spinning. We started as raw cotton traders under N. Srinivasan, expanded into ginners, and grew into ring spinners under MD Asok Kumar and JMD Keerthan Asok Kumar.",
  generations: [
    {
      gen: 'First generation',
      name: 'N. Srinivasan',
      role: 'Founder',
      chapter: 'Raw cotton trading, then ginning',
      body:
        'Built the enterprise as a raw cotton trader in the cotton heartlands of Tamil Nadu — business forged on word of mouth, a sharp eye for staple length, and fair dealing with local growers. The family then expanded into ginning, taking control of separating lint from seed for cleaner fibre.',
      focus: ['Cotton trading roots', 'Ginning expansion', 'Purity & integrity'],
      image: null as null | { src: ImageMetadata; alt: string },
      placeholder: 'Archive photograph of the trading / ginning era',
    },
    {
      gen: 'Second generation',
      name: 'Asok Kumar',
      role: 'Managing Director (MD)',
      chapter: 'Ginning into ring spinning',
      body:
        'Expanded into ginning and made the leap into manufacturing, establishing AKR Spinning Mills. He oversaw the acquisition and commissioning of ring spinning machinery from LMW, Trützschler, Rieter, Saurer and Muratec.',
      focus: ['Spinning mill establishment', 'Machinery modernisation', 'Operational excellence'],
      image: null as null | { src: ImageMetadata; alt: string },
      placeholder: 'Portrait of MD Asok Kumar',
    },
    {
      gen: 'Third generation',
      name: 'Keerthan Asok Kumar',
      role: 'Joint Managing Director (JMD)',
      chapter: 'Modernisation & diversification',
      body:
        'Spearheads technical modernisation — benchmarking production to international Uster standards and expanding beyond karded cotton into 100% combed cotton, polyester cotton (PC) and cotton polyester (CP / CVC) blends.',
      focus: ['Product diversification', 'Uster quality standards', 'Strategic client partnerships'],
      // Photo removed: it duplicated the People section image. Add a portrait of the JMD here if one is supplied.
      image: null as null | { src: ImageMetadata; alt: string },
      placeholder: 'Portrait of JMD Keerthan Asok Kumar',
    },
  ],
};

export type Stage = {
  n: string;
  name: string;
  machinery: string;
  origin: string;
  purpose: string;
  body: string;
  checkpoint: string;
  image: ImageMetadata;
  alt: string;
  lowRes?: boolean;
};

export const processScene = {
  eyebrow: 'How it is made',
  title: 'From bale to cone in seven stages.',
  intro:
    'Every cone passes through a structured, seven-stage ring spinning process. Understanding how we make it helps you understand why you can rely on it.',
  stages: [
    {
      n: '01', name: 'Opening & Cleaning', machinery: 'LMW & Trützschler full blowroom line', origin: 'India & Germany',
      purpose: 'Remove impurities and open raw cotton and blend fibres.',
      body: 'A synchronised sequence of coarse and fine openers, dust extractors and micro-cleaners separates fibres gently while removing leaf particles, seed coats and micro-dust without fibre degradation.',
      checkpoint: 'Trash content and fibre tuft regularity monitored continuously at blowroom exit.',
      image: blowroom, alt: 'Blowroom line with bale opening and cleaning machinery',
    },
    {
      n: '02', name: 'Carding', machinery: 'Trützschler & LMW high-production cards', origin: 'Germany & India',
      purpose: 'Individualise fibres and extract remaining neps and short fibres.',
      body: 'Revolving wire flats turn tangled clumps into single parallel fibres, removing neps and short fly waste to deliver a clean, uniform sliver.',
      checkpoint: 'Sliver weight (hank), nep count and short fibre percentage tested at card delivery.',
      image: carding, alt: 'Carding machine producing a cotton sliver', lowRes: true,
    },
    {
      n: '03', name: 'Drawing & Doubling', machinery: 'LMW & Rieter autoleveller draw frames', origin: 'India & Switzerland',
      purpose: 'Improve sliver evenness, parallelise fibres and blend components.',
      body: 'Multiple card slivers are combined and drafted. Digital autolevelling compensates for sliver mass variation, giving uniform blend distribution for 100% cotton, PC and CP yarns.',
      checkpoint: 'Sliver evenness (CV% < 0.6%) and linear density verified with continuous autoleveller monitoring.',
      image: drawFrame, alt: 'Draw frame combining several slivers into cans', lowRes: true,
    },
    {
      n: '04', name: 'Roving', machinery: 'LMW speed frames', origin: 'India',
      purpose: 'Attenuate the sliver and apply a protective twist for ring spinning.',
      body: 'The drawn sliver is drafted into a slender roving with controlled twist. Bobbins ride overhead creel tracks to avoid handling shocks before ring drafting.',
      checkpoint: 'Roving count (hank), twist factor and bobbin tension uniformity verified.',
      image: roving, alt: 'Roving frame with rows of roving bobbins',
    },
    {
      n: '05', name: 'Ring Spinning', machinery: 'LMW ring spinning fleet', origin: 'India',
      purpose: 'Draft, insert final twist and spin into finished yarn — Ne 16s to Ne 60s.',
      body: 'Ring frames draft the roving to the exact count and insert the final twist. Spindle speeds and drafting zones are tailored to each count for tenacity and low hairiness.',
      checkpoint: 'Count (Ne), twist per inch, breaking tenacity (cN/tex) and elongation tested regularly on spindle doffs.',
      image: ringFrame, alt: 'LMW ring spinning frame with a long row of spindles',
    },
    {
      n: '06', name: 'Autoconer Winding', machinery: 'Saurer & Muratec autoconers', origin: 'Switzerland & Japan',
      purpose: 'Transfer to export cones, clear defects and thermo-splice.',
      body: 'Electronic yarn clearers scan every centimetre, cutting out thick spots, thin places and neps and replacing them with knot-free splices.',
      checkpoint: 'Clearer settings verified, splice strength tested, cone density checked for high-speed knitting and warping.',
      image: autoconer, alt: 'Automatic cone winding machine with yarn cones',
    },
    {
      n: '07', name: 'Testing & Quality Release', machinery: 'Climate-controlled lab · 20°C, 65% RH', origin: 'Benchmarked to Uster',
      purpose: 'Verify lot-to-lot parameters before dispatch.',
      body: 'Packages from each lot are conditioned and tested for count variation, tensile strength, elongation, mass evenness, imperfections and hairiness before release.',
      checkpoint: 'Full Uster testing, tenacity testing and lot test certificates generated for buyer inspection.',
      image: lab, alt: 'Yarn testing laboratory with testing instruments', lowRes: true,
    },
  ] satisfies Stage[],
};

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */
export type Product = {
  slug: string;
  name: string;
  formValue: string; // must match <option value> in the enquiry form
  short: string;
  badge: string;
  tagline: string;
  composition: string;
  compositionShort: string;
  count: string;
  rkm: string;
  handle: string;
  shrinkage: string;
  spinning: string;
  intro: string;
  tags: string[];
  image: ImageMetadata;
  heroImage: ImageMetadata;
  alt: string;
  lowRes?: boolean;
  keyFacts: { label: string; value: string }[];
  benefits: { title: string; body: string }[];
  specs: { label: string; value: string }[];
  applications: string[];
  metaTitle: string;
  metaDescription: string;
};

export const products: Product[] = [
  {
    slug: 'polyester-cotton',
    name: 'Polyester Cotton Yarn',
    formValue: 'Polyester Cotton Yarn',
    short: 'Polyester Cotton (PC)',
    badge: 'PC blend',
    tagline: 'High tenacity & durable',
    composition: '65% Polyester / 35% Cotton (custom ratios available)',
    compositionShort: '65% Poly / 35% Cotton',
    count: 'Ne 20s – 45s',
    rkm: 'Very high (Rkm > 16.5)',
    handle: 'Smooth & crisp',
    shrinkage: 'Minimal (< 2%)',
    spinning: 'Ring spun · Z-twist',
    intro:
      'Combines high-tenacity polyester fibres with premium natural cotton. Engineered for heavy-duty performance, this ring-spun blend offers durability, crease recovery and dimensional stability.',
    tags: ['Industrial uniforms', 'Workwear', 'Shirting', 'Circular knitting'],
    image: pcImg,
    heroImage: pcImg,
    alt: 'Polyester cotton blend yarn cones',
    lowRes: true,
    keyFacts: [
      { label: 'Standard blend', value: '65% Poly / 35% Cotton' },
      { label: 'Count range', value: 'Ne 20s to Ne 45s' },
      { label: 'Spinning type', value: 'Ring spun' },
      { label: 'Target end-use', value: 'Uniforms & knitwear' },
    ],
    benefits: [
      { title: 'Superior tensile strength', body: 'Virgin polyester staple fibres provide high breaking tenacity (Rkm > 16.5), preventing warp breakage during high-speed weaving and circular knitting.' },
      { title: 'Crease recovery & low shrinkage', body: 'The synthetic component helps garments resist wrinkling, dry quickly and keep their shape after repeated commercial washes.' },
      { title: 'Consistent ring-spun evenness', body: 'Precision blending in the blowroom and carding stages ensures uniform fibre distribution, low CV% and minimal neps.' },
      { title: 'Economical performance', body: 'The durability of polyester with the natural handle of cotton — a cost-efficient yarn for mass apparel and uniform markets.' },
    ],
    specs: [
      { label: 'Fibre composition', value: '65% Polyester / 35% Cotton (custom 52/48 & 50/50 available)' },
      { label: 'Yarn type', value: 'PC blend ring spun' },
      { label: 'Count range', value: 'Ne 20s to Ne 45s (single & plied/double)' },
      { label: 'Twist direction', value: 'Z-twist (S-twist on custom request)' },
      { label: 'Tenacity / Rkm', value: '> 16.5 cN/tex' },
      { label: 'Elongation at break', value: '5.5% – 7.0%' },
      { label: 'Evenness (Uster U%)', value: 'Benchmarked to Uster 25% – 50% global standards' },
      { label: 'Packaging', value: 'Standard paper cones (1.89 kg net) / carton boxes or palletised' },
    ],
    applications: [
      'Corporate & industrial uniforms',
      'Institutional & healthcare workwear',
      'Circular knitted T-shirts & polos',
      'Warp & weft shirting / suiting',
      'Durable bed linens & hospitality textiles',
      'Interlock & rib knitted fabrics',
    ],
    metaTitle: 'Polyester Cotton Yarn (PC 65/35, Ne 20s–45s) | AKR Spinning Mills',
    metaDescription:
      'Ring-spun Polyester Cotton (PC) yarn, 65/35, Ne 20s–45s, Rkm > 16.5 — for uniforms, workwear, shirting and knitwear. Direct from AKR Spinning Mills, Pollachi.',
  },
  {
    slug: 'cotton-polyester',
    name: 'Cotton Polyester Yarn',
    formValue: 'Cotton Polyester Yarn',
    short: 'Cotton Polyester (CP / CVC)',
    badge: 'CP / CVC blend',
    tagline: 'Chief Value Cotton',
    composition: '60% Cotton / 40% Polyester (cotton-rich)',
    compositionShort: '60% Cotton / 40% Poly',
    count: 'Ne 20s – 40s',
    rkm: 'High (Rkm > 15.0)',
    handle: 'Soft & breathable',
    shrinkage: 'Low (< 3%)',
    spinning: 'Ring spun · Z-twist',
    intro:
      'For brands that need the breathable softness of natural cotton with the tensile strength and shape retention of polyester. With cotton as the dominant fibre, it offers next-to-skin comfort.',
    tags: ['Casual T-shirts', 'Athleisure', 'Bed linens', 'Fashion knits'],
    image: cpImg,
    heroImage: cpImg,
    alt: 'Cotton polyester CVC blend yarn cones',
    lowRes: true,
    keyFacts: [
      { label: 'Standard blend', value: '60% Cotton / 40% Poly' },
      { label: 'Count range', value: 'Ne 20s to Ne 40s' },
      { label: 'Feel & touch', value: 'Cotton-soft hand' },
      { label: 'Target end-use', value: 'Apparel & linens' },
    ],
    benefits: [
      { title: 'Cotton-rich comfort', body: 'Formulated with 60% or more natural cotton for moisture absorption, skin-friendly softness and all-day comfort.' },
      { title: 'Reduced pilling & low shrinkage', body: 'The blended polyester component reduces fabric shrinkage and surface fuzzing across repeated domestic washes.' },
      { title: 'Vibrant colour fastness', body: 'Good affinity for cross-dyeing and reactive dyes, yielding rich, enduring colours with strong wash and light fastness.' },
      { title: 'Smooth knit & weave efficiency', body: 'Even drafting on ring frames gives uniform yarn mass and low hairiness for high-speed circular knitting.' },
    ],
    specs: [
      { label: 'Fibre composition', value: '60% Cotton / 40% Polyester (CVC) or 80/20 cotton-rich' },
      { label: 'Yarn type', value: 'Chief Value Cotton (CP/CVC) ring spun' },
      { label: 'Count range', value: 'Ne 20s to Ne 40s (single & plied/double)' },
      { label: 'Twist direction', value: 'Z-twist (knitting and weaving twist options)' },
      { label: 'Tenacity / Rkm', value: '> 15.0 cN/tex' },
      { label: 'Elongation at break', value: '5.0% – 6.5%' },
      { label: 'Uster evenness (U%)', value: 'Benchmarked to Uster 25% – 50% international standards' },
      { label: 'Packaging', value: 'Cones (1.89 kg net) / carton boxes or palletised export packing' },
    ],
    applications: [
      'Premium knitted casual T-shirts',
      'Athleisure & sportswear polos',
      'High-thread-count bed linens & pillowcases',
      'Fashion shirting & blouse fabrics',
      'Underwear & loungewear knits',
      'Hoodies & lightweight French terry',
    ],
    metaTitle: 'Cotton Polyester Yarn (CP / CVC 60/40, Ne 20s–40s) | AKR Spinning Mills',
    metaDescription:
      'Cotton-rich CP / CVC yarn, 60/40, Ne 20s–40s, Rkm > 15.0 — breathable softness with polyester durability for T-shirts, athleisure and linens. AKR Spinning Mills.',
  },
  {
    slug: 'karded-yarn',
    name: '100% Cotton Karded Yarn',
    formValue: '100% Cotton Karded Yarn',
    short: '100% Karded Cotton',
    badge: '100% natural cotton',
    tagline: 'Full bulk & authentic value',
    composition: '100% pure virgin cotton',
    compositionShort: '100% Virgin Cotton',
    count: 'Ne 16s – 40s',
    rkm: 'Good (Rkm > 13.5)',
    handle: 'Natural, textured bulk',
    shrinkage: 'Standard cotton (~4–5%)',
    spinning: 'Karded ring spun · Z-twist',
    intro:
      'Ring-spun karded cotton yarn produced through the complete seven-stage process — retaining natural fibre character, full-bodied bulk and high absorbency. A dependable foundation for circular knitting, fleece and terry.',
    tags: ['Single jersey T-shirts', 'Terry towels', 'Fleece', 'Everyday apparel'],
    image: kardedImg,
    heroImage: kardedHeroImg,
    alt: 'Cones of 100% karded cotton yarn',
    keyFacts: [
      { label: 'Fibre', value: '100% virgin cotton' },
      { label: 'Count range', value: 'Ne 16s to Ne 40s' },
      { label: 'Yarn type', value: 'Karded ring spun' },
      { label: 'Target end-use', value: 'Knits, terry & fleece' },
    ],
    benefits: [
      { title: 'Natural handle', body: 'A broader mix of fibre lengths gives a slightly bulkier, softer feel — preferred for comfortable everyday garments and towels.' },
      { title: 'Cost efficiency', body: 'No combing step means no noil removal and a shorter process path — the economical choice when a combed finish is not required.' },
      { title: 'Reliable consistency', body: 'Carding and drawing are carefully managed to deliver consistent count, controlled evenness and minimal imperfections, lot after lot.' },
      { title: 'Versatile application', body: 'Performs from knitted garments and jerseys to towels and shirting — versatile for manufacturers with varied production needs.' },
    ],
    specs: [
      { label: 'Fibre composition', value: '100% pure virgin cotton' },
      { label: 'Yarn type', value: 'Karded ring spun' },
      { label: 'Count range', value: 'Ne 16s to Ne 40s (single & plied)' },
      { label: 'Twist direction', value: 'Z-twist (S-twist on enquiry)' },
      { label: 'Tenacity / Rkm', value: '> 13.5' },
      { label: 'Evenness / Uster', value: 'Tested to Uster Statistics 25–50% standards' },
      { label: 'Packaging', value: 'Cones / 24-cone woven export bags or carton boxes' },
    ],
    applications: [
      'Knitted T-shirts & single jersey',
      'Terry bath & hand towels',
      'Fleece sweatshirts & hoodies',
      'Heavy weaving & denims',
    ],
    metaTitle: '100% Karded Cotton Yarn (Ne 16s–40s) | AKR Spinning Mills',
    metaDescription:
      'Ring-spun 100% karded cotton yarn, Ne 16s–40s, benchmarked to Uster standards — for single jersey, terry, fleece and everyday apparel. AKR Spinning Mills, Tamil Nadu.',
  },
  {
    slug: 'combed-yarn',
    name: '100% Combed Cotton Yarn',
    formValue: '100% Combed Cotton Yarn',
    short: '100% Combed Cotton',
    badge: '100% long-staple',
    tagline: 'Ultra-smooth & lustrous',
    composition: '100% premium long-staple cotton',
    compositionShort: '100% Long-Staple',
    count: 'Ne 24s – 60s',
    rkm: 'High (Rkm > 16.0)',
    handle: 'Silky smooth & lustrous',
    shrinkage: 'Controlled (< 3.5%)',
    spinning: 'Precision combed ring spun',
    intro:
      'Cotton slivers run through an intensive combing cycle to extract short fibres and neps — leaving aligned long-staple fibres for a lustrous, silky-smooth yarn for fine fabrics.',
    tags: ['Luxury shirting', 'Fine knits', 'Underwear & intimates', 'Export textiles'],
    image: combedImg,
    heroImage: combedImg,
    alt: 'Cones of 100% combed cotton yarn',
    keyFacts: [
      { label: 'Fibre', value: '100% long-staple' },
      { label: 'Count range', value: 'Ne 24s to Ne 60s' },
      { label: 'Surface finish', value: 'Silky & lustrous' },
      { label: 'Target end-use', value: 'Luxury apparel & knits' },
    ],
    benefits: [
      { title: 'Silky smooth hand & lustre', body: 'Combing removes short fibres and parallelises long-staple cotton for a smooth, reflective surface and fine drape.' },
      { title: 'Minimal hairiness (low H-value)', body: 'Fewer protruding fibres give crisp stitch clarity in knitwear, a smoother handle and less pilling.' },
      { title: 'Superior tensile strength', body: 'Long, interlocked fibres give high breaking strength and elongation for high-speed circular and warp knitting.' },
      { title: 'Low imperfections & neps', body: 'Combing removes up to 18% noil (short fibres, trash and neps) for clean yarn that dyes without streaks.' },
    ],
    specs: [
      { label: 'Fibre composition', value: '100% premium long-staple cotton' },
      { label: 'Yarn type', value: 'Precision combed ring spun' },
      { label: 'Count range', value: 'Ne 24s to Ne 60s (single & double/plied)' },
      { label: 'Twist direction', value: 'Z-twist (knitting & weaving twist multipliers)' },
      { label: 'Tenacity / strength', value: '> 16.0 – 19.0 cN/tex (count dependent)' },
      { label: 'Elongation at break', value: '5.5% – 6.8%' },
      { label: 'Evenness (Uster U%)', value: 'Benchmarked to Uster 5% – 25%' },
      { label: 'Imperfections (IPI)', value: 'Ultra-low thin, thick and nep count' },
      { label: 'Packaging', value: 'Precision-wound paper cones with protective netting' },
    ],
    applications: [
      'High-thread-count luxury shirting',
      'Premium single jersey & rib knits',
      'Fine-gauge underwear & intimates',
      'Export-grade polo shirts & tops',
      'Fine interlock & jacquard fabrics',
      'High-end bed linens & sheeting',
    ],
    metaTitle: '100% Combed Cotton Yarn (Ne 24s–60s) | AKR Spinning Mills',
    metaDescription:
      'Precision-combed 100% long-staple cotton yarn, Ne 24s–60s, Rkm > 16.0 — smooth, lustrous, low-hairiness yarn for luxury shirting and fine knits. AKR Spinning Mills.',
  },
];

export const productsScene = {
  eyebrow: 'Four yarn lines',
  title: 'Four yarns. Made for every fabric.',
  intro:
    'From resilient synthetic blends to smooth combed cotton — each line ring-spun in Pollachi and benchmarked to Uster standards.',
  tableCaption: 'Side-by-side comparison of the four AKR yarn lines',
};

/* ------------------------------------------------------------------ */
/* Quality & People                                                    */
/* ------------------------------------------------------------------ */
export const quality = {
  eyebrow: 'Commitment to consistency',
  title: 'Tested before it travels.',
  intro:
    'Every lot is conditioned and tested in a climate-controlled laboratory before it is released. Quality data for a lot is available for discussion when you enquire.',
  metrics: [
    { prefix: '± ', value: 1.5, decimals: 1, suffix: '%', label: 'Tight count CV', sr: 'Count CV held within plus or minus 1.5 percent', note: 'Across single and plied yarns' },
    { prefix: '', value: 100, decimals: 0, suffix: '%', label: 'Lot traceability', sr: '100 percent lot traceability', note: 'From raw cotton bale to finished cone' },
    { prefix: '', value: 48, decimals: 0, suffix: ' h', label: 'Sample dispatch', sr: 'Sample cones and lab sheets dispatched within 48 hours', note: 'Sample cones & lab sheets to serious buyers' },
    { prefix: '', value: 6, decimals: 0, suffix: '', label: 'Tested parameters', sr: 'Six tested parameters', note: 'On every production lot' },
  ],
  parameters: [
    { name: 'Count (Ne)', body: 'Actual vs. target count; count variation (CV%).' },
    { name: 'Tenacity', body: 'Force required to break the yarn, in cN/tex.' },
    { name: 'Elongation', body: 'How far the yarn stretches before breaking.' },
    { name: 'Evenness (U%)', body: 'Mass variation measured on an Uster tester.' },
    { name: 'Imperfections', body: 'Thin places, thick places and neps per 1000 m.' },
    { name: 'Hairiness', body: 'Fibre hairs extending from the yarn body (Uster H).' },
  ],
  honesty:
    'We do not publish specific Uster percentile claims without confirmed, current lot data — ask us for the lot sheet.',
};

export const people = {
  eyebrow: 'People & community',
  title: 'The people behind the yarn.',
  intro:
    'A spinning mill runs on people — people who know how to set a ring frame, recognise a quality deviation, or manage a shift change without disrupting production. Our commitment to them is not a CSR statement. It is how we operate.',
  image: { src: about, alt: 'Cotton cones on a winding frame, with a mill worker at a machine in the background' },
  commitments: [
    { title: 'Employee upskilling', body: 'Training production staff — from machine operators to quality technicians — to work confidently with the equipment and processes we run.' },
    { title: 'Trainee programmes', body: 'Entry pathways for young people, working alongside experienced staff to build practical skills in spinning, winding and quality control.' },
    { title: 'Benefits & support', body: 'Fair wages, safe working conditions and, where possible, access to basic welfare provisions.' },
    { title: 'Community initiatives', body: 'As a family business rooted in Tamil Nadu, our involvement is guided by what is genuine and useful — not what looks good on paper.' },
  ],
  honesty:
    'We do not publish CSR programme claims or impact numbers we have not verified. Less said accurately is better than more said loosely.',
};

/* ------------------------------------------------------------------ */
/* Proof & scale                                                       */
/* ------------------------------------------------------------------ */
export const scale = {
  eyebrow: 'Machinery partners',
  title: 'Built on machines the world trusts.',
  intro:
    'Seven precision stages, from blowroom bale opening to the on-site testing lab — every machine calibrated for minimal fibre stress and lot-to-lot consistency.',
  partners: [
    { name: 'LMW', country: 'India', role: 'Blowroom, cards, draw frames, roving & ring spinning' },
    { name: 'Trützschler', country: 'Germany', role: 'Blowroom line & precision carding machines' },
    { name: 'Rieter', country: 'Switzerland', role: 'High-speed autoleveller draw frames' },
    { name: 'Saurer', country: 'Switzerland', role: 'Automatic cone winding & electronic clearing' },
    { name: 'Muratec', country: 'Japan', role: 'High-efficiency autoconer winding' },
  ],
  image: { src: infrastructure, alt: 'Wide view of the spinning mill infrastructure with long rows of machinery' },
  audit:
    'Detailed technical sheets, autoconer clearer settings and Uster testing certificates are available for buyer audits — or schedule a factory visit.',
  placeholders: {
    capacity: 'Spindle count and monthly capacity (kg) — awaiting confirmed figures from the mill',
    testimonial: 'Buyer testimonial with name, company and permission to publish',
    certifications: 'Certifications (only if held and verifiable)',
  },
};

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */
export const contact = {
  eyebrow: "Let's talk business",
  title: "Tell us the count. We'll tell you what we can spin.",
  intro:
    'Speak directly with our management. Tell us your required count, blend and application — we will respond with availability, test data and pricing. No intermediaries.',
  messageHint: 'Include the count (Ne), application (e.g. knitting T-shirts, weaving towels) and approximate quantity.',
  generalOption: 'General Enquiry',
  success: { title: 'Enquiry sent.', body: 'Thank you for reaching out. The family leadership will get back to you shortly.' },
};

/* ------------------------------------------------------------------ */
/* Legal                                                               */
/* ------------------------------------------------------------------ */
export const legal = {
  privacy: {
    title: 'Privacy Policy',
    description: 'Privacy Policy of AKR Spinning Mills detailing how we collect, use, and safeguard customer and website visitor information.',
    intro: 'At AKR Spinning Mills, we are committed to protecting your privacy and ensuring transparent handling of your business enquiries.',
    sections: [
      { h: '1. Information We Collect', p: ['We collect information provided directly by you when submitting business enquiries, sample requests, or communications with our team. This includes your name, company name, email address, and specific yarn requirements.'] },
      { h: '2. How We Use Your Information', p: ['We use collected details exclusively for legitimate B2B operations:'], list: ['Responding to price enquiries and count availability requests.', 'Processing sample shipments and specification sheets.', 'Fulfilling orders and delivering ongoing customer support.', 'Improving our website performance and buyer experience.'] },
      { h: '3. Data Protection & Security', p: ['We employ industry-standard data protection measures to keep your business communications confidential. We do not sell, rent, or trade customer contact details with any third parties.'] },
      { h: '4. Analytics', p: ["We use Google Analytics to understand website traffic and visitor interactions and to improve our website. Google Analytics may use cookies and similar technologies to collect usage information. For more details, please refer to Google's Privacy Policy (https://policies.google.com/privacy)."] },
      { h: '5. Contact Us', p: ['If you have any questions regarding this Privacy Policy or your personal data, please email us at info@akrmills.com.'] },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    description: 'Terms and conditions governing the use of the AKR Spinning Mills website and general B2B enquiry standards.',
    intro: 'General guidelines and conditions applicable to browsing our catalogue and communicating with AKR Spinning Mills.',
    sections: [
      { h: '1. Website Usage', p: ['The content on this website is for informational purposes regarding yarn specifications, product counts, manufacturing processes, and mill capabilities. Reproduction of imagery, logos, or copy without written authorization is strictly prohibited.'] },
      // Source text says "20s to 40s Karded & Combed"; kept verbatim pending client confirmation (see assumptions).
      { h: '2. Product Specifications & Availability', p: ['Product counts (e.g. 20s to 40s Karded & Combed cotton yarn), CSP figures, and technical metrics listed on the website represent baseline standards. Official commercial contracts and proforma invoices provide exact agreed parameters for individual yarn lots.'] },
      { h: '3. Enquiries & Quotations', p: ['Submitting an enquiry via our web forms or email does not constitute a binding contract. Formal quotes, delivery schedules, and payment terms will be issued directly by AKR Spinning Mills management.'] },
      { h: '4. Intellectual Property', p: ['All brand trademarks, trade names, logo assets, and technical documentation displayed on this platform are the property of AKR Spinning Mills.'] },
      { h: '5. Governing Law', p: ['These terms are governed by the laws of India. Any legal disputes arising from business transactions shall be subject to the jurisdiction of the courts in Pollachi / Coimbatore, Tamil Nadu, India.'] },
    ],
  },
};

export const nav = [
  { href: '/#story', label: 'Our Story' },
  { href: '/#manufacturing', label: 'Manufacturing' },
  { href: '/#products', label: 'Products' },
  { href: '/#quality', label: 'Quality' },
];
export const navCta = { href: '/#contact', label: 'Contact Us' };

/* ------------------------------------------------------------------ */
/* Cinematic opening (home) — copy supplied in the creative brief       */
/* ------------------------------------------------------------------ */
export const film = {
  hero: {
    eyebrow: 'A legacy rooted in nature',
    lines: ['From the earth.', 'Into every thread.'],
    sub: 'Discover the journey of cotton, craftsmanship and generations of textile excellence.',
    cta: { label: 'Discover our story', href: '#origin' },
    skip: { label: 'Skip to the mill', href: '#manufacturing' },
    posterAlt: 'A lone tree on a hill at golden hour, overlooking open countryside',
  },
  origin: {
    posterAlt: 'Mature cotton plants with open white bolls swaying against a golden evening sky',
    eyebrow: 'Chapter one · The field',
    title: 'Rooted in nature.',
    sub: 'Every remarkable journey begins with something small.',
  },
  bloom: {
    eyebrow: 'Chapter two · The bloom',
    title: 'Nature creates something extraordinary.',
    posterAlt: 'A fully opened cotton boll, its white fibres lit by low golden sunlight',
  },
  // Source: Gemini-generated clip supplied by AKR (media-source/gemini-cotton-landscape-original.mp4),
  // split at 4.75 s: landscape → cotton rows (hero) and the macro boll (bloom). Re-encoded for scrubbing.
  video: {
    hero: { wide: '/video/film-hero-wide.mp4', tall: '/video/film-hero-tall.mp4' },
    bloom: { wide: '/video/film-bloom-wide.mp4', tall: '/video/film-bloom-tall.mp4' },
    // Live-action field: Pexels video 13943183 "Cotton Plants under Clear Sky" by Lio Voo (Pexels License),
    // sky replaced with a golden-hour plate, warm-graded, looped. See media-source/pexels-13943183/LICENSE-NOTES.md.
    field: { wide: '/video/field-wind-wide.mp4', tall: '/video/field-wind-tall.mp4' },
  },
  // Phones scrub pre-decoded stills instead of seeking video (480×640 WebP, 15 fps, portrait crop).
  // bloom frames start at 2.0 s into the bloom clip — the part the scroll actually uses.
  frames: {
    hero: { base: '/frames/hero', count: 71 },
    bloom: { base: '/frames/bloom', count: 49, fromClipSeconds: 2.0 },
  },
};

export const fibre = {
  eyebrow: 'From fibre to yarn',
  title: 'Every fibre deserves precision.',
  body: 'Raw cotton is opened, cleaned, carded, drawn, roved and ring-spun in Pollachi — each fibre aligned, drafted and twisted until it holds together as one consistent strand.',
};

export const reveal = {
  lines: ['From cotton fields', 'to spinning frames.'],
  sub: 'A legacy of cotton. A future of possibilities.',
  primary: { label: 'Explore our yarns', href: '#products' },
  secondary: { label: 'Contact us', href: '#contact' },
};
