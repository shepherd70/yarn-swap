/*
 * YarnSwap — scoring engine and yarn data (pure, no DOM).
 *
 * Loaded as a classic script in the browser (exposes a global `YarnSwap`) and
 * as a CommonJS module in Node for the test suite (`tests/scoring.test.js`).
 * Keeping all the pure logic here lets the same code be unit-tested without a
 * browser and lets index.html stay openable directly from file:// (no build).
 */
(function (root) {
  "use strict";

  // ---------- Yarn database (starter set — specs approximate, per ball) ----------
  // b: brand, n: name, w: weight class, f: fiber %s, yds/g: per ball,
  // ga: typical sts per 4in, mw: machine washable, p: price tier 1-3
  const WEIGHTS = ["Lace","Fingering","Sport","DK","Worsted","Aran","Bulky","Super Bulky"];
  const FIBERS = ["wool","merino","alpaca","mohair","silk","cashmere","cotton","linen","bamboo","viscose","acrylic","nylon","polyester"];
  const FAMILY = { wool:"animal", merino:"animal", alpaca:"animal", mohair:"animal", silk:"animal", cashmere:"animal",
                   cotton:"plant", linen:"plant", bamboo:"plant", viscose:"plant",
                   acrylic:"synthetic", nylon:"synthetic", polyester:"synthetic" };
  // surface texture — drives the texture term in score() (mohair halo vs a smooth
  // plied yarn knit up very differently even at the same weight and fiber).
  const TEXTURES = ["smooth","tweed","chainette","roving","halo","chenille"];

  const YARNS = [
   {b:"Cascade", n:"220", w:"Worsted", f:{wool:100}, yds:220, g:100, ga:20, mw:false, p:2, t:"smooth"},
   {b:"Cascade", n:"220 Superwash", w:"Worsted", f:{wool:100}, yds:220, g:100, ga:20, mw:true, p:2, t:"smooth"},
   {b:"Patons", n:"Classic Wool Worsted", w:"Worsted", f:{wool:100}, yds:194, g:100, ga:20, mw:false, p:1, t:"smooth"},
   {b:"Knit Picks", n:"Wool of the Andes", w:"Worsted", f:{wool:100}, yds:110, g:50, ga:19, mw:false, p:1, t:"smooth"},
   {b:"Malabrigo", n:"Rios", w:"Worsted", f:{merino:100}, yds:210, g:100, ga:18, mw:true, p:3, t:"smooth"},
   {b:"Lion Brand", n:"Wool-Ease", w:"Worsted", f:{acrylic:80, wool:20}, yds:197, g:85, ga:18, mw:true, p:1, t:"smooth"},
   {b:"Plymouth", n:"Encore Worsted", w:"Worsted", f:{acrylic:75, wool:25}, yds:200, g:100, ga:20, mw:true, p:2, t:"smooth"},
   {b:"Berroco", n:"Vintage", w:"Worsted", f:{acrylic:52, wool:40, nylon:8}, yds:218, g:100, ga:19, mw:true, p:2, t:"smooth"},
   {b:"Red Heart", n:"Super Saver", w:"Worsted", f:{acrylic:100}, yds:364, g:198, ga:17, mw:true, p:1, t:"smooth"},
   {b:"Caron", n:"Simply Soft", w:"Worsted", f:{acrylic:100}, yds:315, g:170, ga:18, mw:true, p:1, t:"smooth"},
   {b:"Knit Picks", n:"Brava Worsted", w:"Worsted", f:{acrylic:100}, yds:218, g:100, ga:18, mw:true, p:1, t:"smooth"},
   {b:"Berroco", n:"Ultra Alpaca", w:"Worsted", f:{alpaca:50, wool:50}, yds:215, g:100, ga:20, mw:false, p:2, t:"smooth"},
   {b:"Lily", n:"Sugar'n Cream", w:"Worsted", f:{cotton:100}, yds:120, g:71, ga:20, mw:true, p:1, t:"smooth"},
   {b:"Cascade", n:"Ultra Pima", w:"DK", f:{cotton:100}, yds:220, g:100, ga:22, mw:true, p:2, t:"smooth"},
   {b:"Stylecraft", n:"Special DK", w:"DK", f:{acrylic:100}, yds:322, g:100, ga:22, mw:true, p:1, t:"smooth"},
   {b:"Paintbox", n:"Simply DK", w:"DK", f:{acrylic:100}, yds:302, g:100, ga:22, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Karisma", w:"DK", f:{wool:100}, yds:109, g:50, ga:21, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Merino Extra Fine", w:"DK", f:{merino:100}, yds:114, g:50, ga:21, mw:true, p:1, t:"smooth"},
   {b:"Sirdar", n:"Snuggly DK", w:"DK", f:{nylon:55, acrylic:45}, yds:179, g:50, ga:22, mw:true, p:1, t:"smooth"},
   {b:"Rowan", n:"Felted Tweed", w:"DK", f:{wool:50, alpaca:25, viscose:25}, yds:191, g:50, ga:23, mw:false, p:3, t:"tweed"},
   {b:"Knit Picks", n:"Swish DK", w:"DK", f:{merino:100}, yds:123, g:50, ga:22, mw:true, p:2, t:"smooth"},
   {b:"Scheepjes", n:"Catona", w:"Sport", f:{cotton:100}, yds:137, g:50, ga:26, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Alpaca", w:"Sport", f:{alpaca:100}, yds:182, g:50, ga:24, mw:false, p:1, t:"smooth"},
   {b:"Cascade", n:"220 Sport", w:"Sport", f:{wool:100}, yds:164, g:50, ga:24, mw:false, p:2, t:"smooth"},
   {b:"Knit Picks", n:"Brava Sport", w:"Sport", f:{acrylic:100}, yds:340, g:100, ga:24, mw:true, p:1, t:"smooth"},
   {b:"Debbie Bliss", n:"Baby Cashmerino", w:"Sport", f:{merino:55, acrylic:33, cashmere:12}, yds:137, g:50, ga:25, mw:true, p:2, t:"smooth"},
   {b:"Knit Picks", n:"Palette", w:"Fingering", f:{wool:100}, yds:231, g:50, ga:28, mw:false, p:1, t:"smooth"},
   {b:"Drops", n:"Fabel", w:"Fingering", f:{wool:75, nylon:25}, yds:224, g:50, ga:26, mw:true, p:1, t:"smooth"},
   {b:"Malabrigo", n:"Sock", w:"Fingering", f:{merino:100}, yds:440, g:100, ga:28, mw:true, p:3, t:"smooth"},
   {b:"Lion Brand", n:"Sock-Ease", w:"Fingering", f:{wool:75, nylon:25}, yds:438, g:100, ga:30, mw:true, p:1, t:"smooth"},
   {b:"Cascade", n:"Heritage", w:"Fingering", f:{merino:75, nylon:25}, yds:437, g:100, ga:28, mw:true, p:2, t:"smooth"},
   {b:"Rowan", n:"Kidsilk Haze", w:"Lace", f:{mohair:70, silk:30}, yds:229, g:25, ga:25, mw:false, p:3, t:"halo"},
   {b:"Drops", n:"Kid-Silk", w:"Lace", f:{mohair:75, silk:25}, yds:230, g:25, ga:24, mw:false, p:2, t:"halo"},
   {b:"Malabrigo", n:"Lace", w:"Lace", f:{merino:100}, yds:470, g:50, ga:32, mw:false, p:3, t:"smooth"},
   {b:"Knit Picks", n:"Shadow", w:"Lace", f:{merino:100}, yds:440, g:50, ga:30, mw:false, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Wool-Ease Thick & Quick", w:"Super Bulky", f:{acrylic:80, wool:20}, yds:106, g:170, ga:9, mw:true, p:1, t:"smooth"},
   {b:"Cascade", n:"Magnum", w:"Super Bulky", f:{wool:100}, yds:123, g:250, ga:8, mw:false, p:2, t:"roving"},
   {b:"Malabrigo", n:"Rasta", w:"Super Bulky", f:{merino:100}, yds:90, g:150, ga:8, mw:false, p:3, t:"roving"},
   {b:"Bernat", n:"Blanket", w:"Super Bulky", f:{polyester:100}, yds:220, g:300, ga:8, mw:true, p:1, t:"chenille"},
   {b:"Bernat", n:"Softee Chunky", w:"Bulky", f:{acrylic:100}, yds:108, g:100, ga:12, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Andes", w:"Super Bulky", f:{wool:65, alpaca:35}, yds:98, g:100, ga:10, mw:false, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Hue + Me", w:"Bulky", f:{acrylic:80, wool:20}, yds:137, g:125, ga:14, mw:true, p:1, t:"roving"},
   {b:"Drops", n:"Paris", w:"Aran", f:{cotton:100}, yds:82, g:50, ga:17, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Nepal", w:"Aran", f:{wool:65, alpaca:35}, yds:82, g:50, ga:17, mw:false, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Heartland", w:"Aran", f:{acrylic:100}, yds:251, g:142, ga:16, mw:true, p:1, t:"smooth"},

   // ---- June 2026 focused gap-fill --------------------------------------------------
   // Fills options that were selectable in the UI but matched zero yarns (linen,
   // bamboo, chainette) plus chenille depth and Aran/cashmere/Bulky depth. Specs
   // sourced June 2026 (approximate/per-ball, pending task-30 sign-off):
   //   Quince & Co Sparrow ......... yarnsub.com (100% linen, fingering, mach. wash 30C)
   //   Rowan Creative Linen ........ yarnsub.com (cotton/linen, DK, hand wash)
   //   Lion Brand Truboo ........... lionbrand.com (rayon-from-bamboo, DK, mach. wash)
   //   Lion Brand Coboo ............ yarnsub.com (bamboo/cotton, DK, mach. wash 40C)
   //   Knit Picks Comfy Worsted .... yarnsub.com specs; chainette per Knit Picks product desc.
   //   Debbie Bliss Cashmerino Aran  yarnsub.com (33% microfiber recorded as acrylic,
   //                                 matching the existing Baby Cashmerino sibling)
   //   Bernat Velvet ............... yarnspirations.com (#5 bulky, hand wash)
   //   Bernat Baby Blanket ......... yarnspirations.com (#6 super bulky chenille, 100g/72yd,
   //                                 machine wash) — a same-weight match for Bernat Blanket
   //                                 (near-twin, like Cascade 220 vs 220 Superwash)
   {b:"Quince & Co", n:"Sparrow", w:"Fingering", f:{linen:100}, yds:164, g:50, ga:24, mw:true, p:2, t:"smooth"},
   {b:"Rowan", n:"Creative Linen", w:"DK", f:{cotton:50, linen:50}, yds:219, g:100, ga:21, mw:false, p:2, t:"smooth"},
   {b:"Lion Brand", n:"Truboo", w:"DK", f:{bamboo:100}, yds:241, g:100, ga:23, mw:true, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Coboo", w:"DK", f:{bamboo:50, cotton:50}, yds:232, g:100, ga:23, mw:true, p:1, t:"smooth"},
   {b:"Knit Picks", n:"Comfy Worsted", w:"Worsted", f:{cotton:75, acrylic:25}, yds:109, g:50, ga:19, mw:true, p:1, t:"smooth"},
   {b:"Debbie Bliss", n:"Cashmerino Aran", w:"Aran", f:{merino:55, acrylic:33, cashmere:12}, yds:98, g:50, ga:18, mw:true, p:2, t:"smooth"},
   {b:"Bernat", n:"Velvet", w:"Bulky", f:{polyester:100}, yds:315, g:300, ga:12, mw:false, p:1, t:"chenille"},
   {b:"Bernat", n:"Baby Blanket", w:"Super Bulky", f:{polyester:100}, yds:72, g:100, ga:8, mw:true, p:1, t:"chenille"},

   // ---- June 2026 spec-verification pass (task 30) ------------------------------------
   // Added while verifying records against ball-band sources: Knit Picks Lindy Chain is
   // the genuine chainette yarn (Comfy Worsted, previously tagged chainette, is a plied
   // 3-ply and was corrected to smooth). Sourced yarnsub.com / Knit Picks blog / Ravelry:
   // 70% linen / 30% cotton, fingering, hand wash, 50 g / 180 yd, 28-32 sts -> ga 30.
   {b:"Knit Picks", n:"Lindy Chain", w:"Fingering", f:{linen:70, cotton:30}, yds:180, g:50, ga:30, mw:false, p:1, t:"chainette"},

   // ---- June 2026 thin-cell expansion (tracker 19) -----------------------------------
   // Targets the sparsest cells (Bulky & Lace depth, more Aran, a 2nd/3rd tweed) with
   // ball-band-verified specs (manufacturer pages + Ravelry/yarnsub, June 2026). Sources
   // & judgment calls, in the task-30 style:
   //   Tahki Donegal Tweed ..... yarn.com / Ravelry (100% wool, Aran, single-ply tweed;
   //                             feltable single-ply -> mw:false)
   //   Drops Soft Tweed ........ garnstudio.com / Ravelry. DK per ball band (21 sts), NOT
   //                             Aran; 50 merino / 25 alpaca / 25 viscose ("Merino Wool" on
   //                             the band -> merino). Gives the DK Felted Tweed a same-
   //                             weight tweed twin.
   //   Cascade 128 Superwash ... cascadeyarns.com (100% superwash merino, Bulky, 14 sts)
   //   Malabrigo Chunky ........ malabrigoyarn.com (100% merino, Bulky, 3-ply -> smooth;
   //                             hand wash / NOT superwash -> mw:false)
   //   Drops Lace .............. garnstudio.com / yarnsub (70 baby alpaca / 30 silk, 437 yd /
   //                             50 g). ga set to 28 (typical laceweight tension, grist-twin
   //                             of Knit Picks Shadow) rather than DROPS's loose 23-st shawl
   //                             recommendation.
   //   Stylecraft Special Aran . Wool Warehouse / LoveCrafts (100% acrylic, Aran, machine
   //                             wash; the plain Special Aran, NOT "...with Wool")
   // Considered but NOT added after verification: Berroco Modern Cotton & Cascade Sarasota
   // (both plied, not chainette); Patons Classic Wool Roving (discontinued); DROPS Brushed
   // Alpaca Silk (weight class genuinely ambiguous between Lace grist and Aran ball-band
   // gauge). Chainette stays a single fingering entry (Lindy Chain) — a fine-weight
   // chainette to pair with it is rare, and a heavier one would be weight-excluded anyway.
   {b:"Tahki", n:"Donegal Tweed", w:"Aran", f:{wool:100}, yds:183, g:100, ga:18, mw:false, p:2, t:"tweed"},
   {b:"Drops", n:"Soft Tweed", w:"DK", f:{merino:50, alpaca:25, viscose:25}, yds:142, g:50, ga:21, mw:false, p:2, t:"tweed"},
   {b:"Cascade", n:"128 Superwash", w:"Bulky", f:{merino:100}, yds:128, g:100, ga:14, mw:true, p:2, t:"smooth"},
   {b:"Malabrigo", n:"Chunky", w:"Bulky", f:{merino:100}, yds:104, g:100, ga:14, mw:false, p:3, t:"smooth"},
   {b:"Drops", n:"Lace", w:"Lace", f:{alpaca:70, silk:30}, yds:437, g:50, ga:28, mw:false, p:2, t:"smooth"},
   {b:"Stylecraft", n:"Special Aran", w:"Aran", f:{acrylic:100}, yds:214, g:100, ga:18, mw:true, p:1, t:"smooth"},
  ];

  // ---------- helpers ----------
  // escape any string before it goes into innerHTML. all current data is static,
  // but routing interpolation through this keeps the app safe once free-text
  // fields (e.g. a custom yarn name) are added.
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ypg = y => y.yds / y.g;
  const famPct = f => {
    const out = {animal:0, plant:0, synthetic:0};
    for (const [fib, pct] of Object.entries(f)) out[FAMILY[fib]] += pct;
    return out;
  };
  const fiberLabel = f => Object.entries(f).sort((a,b)=>b[1]-a[1])
    .map(([fib,pct]) => `${pct}% ${fib}`).join(", ");

  // representative swatch colour for a yarn's result card. This is a fiber-FAMILY
  // indicator (warm = animal, green = plant, blue = synthetic), blended by the
  // yarn's blend proportions — not a claim about any specific colorway. It gives
  // the cards a yarn-toned palette while encoding real, scannable information.
  const FAMILY_COLOR = { animal:[182,120,84], plant:[122,160,108], synthetic:[104,138,178] };
  function swatchColor(y) {
    const fam = famPct(y.f);                 // {animal, plant, synthetic}, sums to 100
    let r = 0, g = 0, b = 0;
    for (const k of ["animal","plant","synthetic"]) {
      const w = fam[k] / 100;
      r += FAMILY_COLOR[k][0] * w; g += FAMILY_COLOR[k][1] * w; b += FAMILY_COLOR[k][2] * w;
    }
    const hex = n => Math.round(n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  // When the dataset was last verified against manufacturer/retailer specs.
  // June 2026: full per-record verification pass — all 54 records checked against
  // manufacturer ball-band pages + yarnsub.com / Ravelry. Corrections applied to
  // Encore Worsted, Sugar'n Cream, Sock-Ease, Hue + Me (gauge), Sparrow (yardage),
  // Drops Andes (reclassified Super Bulky), Felted Tweed (fiber -> viscose), Comfy
  // Worsted (texture -> smooth), Softee Chunky (gauge); Knit Picks Lindy Chain added
  // as the chainette example. Changelog + residual notes: docs/spec-verification-2026-06.md.
  // Expanded to 60 (tracker 19): +6 ball-band-verified yarns filling the thinnest
  // Bulky/Lace/Aran/tweed cells — see the dated block at the end of YARNS above.
  const SPECS_REVIEWED = "June 2026";

  // ---------- scoring ----------
  // term weights: full-match points per term
  // (weight + thickness + fiber + gauge + texture + care = 100). A soft-gate
  // multiplier (see gateFactor) can then scale the final score below this when the
  // candidate is a fiber-family or distinctive-texture mismatch.
  const PTS = {
    weight: 32,         // same weight class
    weightAdjacent: 16, // one class away
    thickness: 22,      // yards-per-gram closeness
    fiber: 18,          // fiber content overlap
    gauge: 13,          // stitch-gauge closeness
    gaugeUnknown: 7,    // neutral credit when the target's gauge isn't known
    texture: 10,        // surface-texture match
    textureUnknown: 5,  // neutral credit when the target's texture isn't known
    care: 5,            // not losing machine-washability
  };
  const THICKNESS_SLOPE = 3;     // thickness term reaches 0 at a 33% relative difference
  const GAUGE_SLOPE = 3;         // points lost per stitch (per 4 in) of gauge difference
  const FIBER_EXACT_SHARE = 0.6; // exact-fiber vs fiber-family mix in the fiber term
  const MIN_SCORE = 55;          // candidates scoring below this are hidden
  const MAX_RESULTS = 10;        // show at most this many matches
  // Soft-gate floors (see gateFactor): the fraction of the score a candidate keeps at
  // zero fiber-family overlap / maximum distinctive-texture mismatch. Below 1 so they
  // only ever pull a mismatch down — never push a pair above 100.
  const FAMILY_FLOOR = 0.65;
  const TEXTURE_FLOOR = 0.60;

  // pairwise texture similarity 0..1 (each pair listed once; both orders looked
  // up). Identical textures score 1; unlisted pairs fall back to 0.4.
  const TEXTURE_SIM = {
    "smooth|tweed":0.85, "smooth|chainette":0.75, "smooth|roving":0.6, "smooth|halo":0.25, "smooth|chenille":0.2,
    "tweed|chainette":0.6, "tweed|roving":0.6, "tweed|halo":0.3, "tweed|chenille":0.2,
    "chainette|roving":0.55, "chainette|halo":0.3, "chainette|chenille":0.3,
    "roving|halo":0.45, "roving|chenille":0.35,
    "halo|chenille":0.2,
  };
  // returns 0..1, or null when texture is unknown on either side
  function textureSimilarity(t1, t2) {
    if (!t1 || !t2) return null;
    if (t1 === t2) return 1;
    const sim = TEXTURE_SIM[`${t1}|${t2}`] ?? TEXTURE_SIM[`${t2}|${t1}`];
    return sim === undefined ? 0.4 : sim;
  }

  // relative thickness difference, symmetric: measured against the mean of the
  // two values so A-vs-B always equals B-vs-A
  function thicknessDiff(target, cand) {
    const a = ypg(target), b = ypg(cand);
    return Math.abs(a - b) / ((a + b) / 2);
  }

  // 0-100 fiber similarity: blend of exact-fiber overlap and family overlap.
  // used by both score() and whyText() so the rationale matches the number.
  function fiberSimilarity(target, cand) {
    let exact = 0;
    for (const fib of FIBERS) exact += Math.min(target.f[fib]||0, cand.f[fib]||0);
    // treat wool & merino as near-equivalent for the exact-overlap part
    const tw = (target.f.wool||0)+(target.f.merino||0), cw = (cand.f.wool||0)+(cand.f.merino||0);
    exact = Math.max(exact, exact + Math.min(tw,cw) - Math.min(target.f.wool||0,cand.f.wool||0) - Math.min(target.f.merino||0,cand.f.merino||0));
    const tf = famPct(target.f), cf = famPct(cand.f);
    let fam = 0;
    for (const k of ["animal","plant","synthetic"]) fam += Math.min(tf[k], cf[k]);
    return FIBER_EXACT_SHARE * exact + (1 - FIBER_EXACT_SHARE) * fam;
  }

  // Soft gates (multiplicative, 0..1) applied to the additive score. The additive
  // terms reward structural closeness (weight/thickness/gauge), so on their own they
  // let a gauge-perfect but fiber- or texture-wrong yarn rank as a "match" (a wool
  // roving for a chenille, a smooth merino for a mohair-halo). Expert substitution
  // sources (yarnsub) treat fiber family and a distinctive texture as near-gates; we
  // model that as a multiplier so it scales the whole score without ever pushing a
  // pair above 100. Symmetric (so score() stays order-independent bar the care term)
  // and 1.0 for identical yarns, so self-match stays exactly 100.
  //   - family: disjoint families (e.g. wool vs cotton) keep FAMILY_FLOOR.
  //   - texture: when EITHER side has a distinctive (non-smooth) texture, a texture
  //     mismatch keeps TEXTURE_FLOOR (matching/near textures keep ~1).
  function gateFactor(target, cand) {
    const tf = famPct(target.f), cf = famPct(cand.f);
    let fam = 0;
    for (const k of ["animal", "plant", "synthetic"]) fam += Math.min(tf[k], cf[k]);
    let factor = FAMILY_FLOOR + (1 - FAMILY_FLOOR) * (fam / 100);
    const tsim = textureSimilarity(target.t, cand.t);
    if (tsim !== null && (target.t !== "smooth" || cand.t !== "smooth"))
      factor *= TEXTURE_FLOOR + (1 - TEXTURE_FLOOR) * tsim;
    return factor;
  }

  function score(target, cand) {
    const wDiff = Math.abs(WEIGHTS.indexOf(target.w) - WEIGHTS.indexOf(cand.w));
    if (wDiff > 1) return null;                       // too far apart in weight
    let pts = wDiff === 0 ? PTS.weight : PTS.weightAdjacent;

    // thickness: yards per gram
    pts += Math.max(0, PTS.thickness * (1 - thicknessDiff(target, cand) * THICKNESS_SLOPE));

    // gauge
    if (target.ga && cand.ga) pts += Math.max(0, PTS.gauge - GAUGE_SLOPE * Math.abs(target.ga - cand.ga));
    else pts += PTS.gaugeUnknown;

    // fiber
    pts += fiberSimilarity(target, cand) * PTS.fiber / 100;

    // texture: neutral credit when the target's texture is unknown (custom specs)
    const tsim = textureSimilarity(target.t, cand.t);
    pts += tsim === null ? PTS.textureUnknown : PTS.texture * tsim;

    // care: only penalize losing machine-washability
    pts += (target.mw && !cand.mw) ? 0 : PTS.care;

    // soft-gate: scale down fiber-family / distinctive-texture mismatches (factor <= 1)
    return Math.round(pts * gateFactor(target, cand));
  }

  function whyText(target, cand) {
    const bits = [];
    bits.push(target.w === cand.w ? "same weight class" : "adjacent weight class — swatch carefully");
    const d = Math.round(100 * thicknessDiff(target, cand));  // same measure score() uses
    bits.push(d <= 5 ? "nearly identical thickness" : `${d}% thickness difference`);
    const fiber = fiberSimilarity(target, cand);              // same measure score() uses
    bits.push(fiber >= 75 ? "similar fiber character" : "different fiber character — drape will change");
    const tsim = textureSimilarity(target.t, cand.t);        // same measure score() uses
    if (tsim !== null) {
      if (tsim === 1 && cand.t !== "smooth") bits.push(`matching ${cand.t} texture`);
      else if (tsim < 0.6) bits.push(`${cand.t} texture — look will change`);
    }
    if (target.mw && !cand.mw) bits.push("NOT machine washable");
    return bits.join(" · ");
  }

  // displayed score is capped at 99: this is a heuristic matcher, so it never
  // advertises a "perfect" 100% substitute (see the gauge-swatch disclaimer). The
  // true score still drives the great/good badge and the MIN_SCORE cutoff.
  const displayScore = s => Math.min(s, 99);

  // ---------- buy links ----------
  // Retailers are grouped by shopper region so links point to a store that ships
  // locally and prices in the local currency. Canada is the default (DEFAULT_REGION).
  // Per-retailer query tuning: the general catalogs (Michaels, Amazon) get an extra
  // "yarn" keyword to disambiguate; the yarn-only stores search their catalogs directly.
  // Each store declares an affiliate `aff.network`; affiliateUrl() (below) turns a
  // destination into that network's tracked link. Publisher IDs in AFFILIATE_IDS start
  // empty, so links stay plain until real tags are added (docs/affiliate-candidates.md).
  const REGIONS = [
    { code: "CA", label: "Canada" },
    { code: "US", label: "United States" },
  ];
  const DEFAULT_REGION = "CA";
  const RETAILERS = {
    // Canadian stores — price in CAD and ship within Canada. Yarnspirations
    // (Spinrite, Listowel ON) and Mary Maxim (Paris ON) cover the mass brands;
    // Michaels Canada (canada.michaels.com) adds big-box craft breadth; Amazon.ca
    // covers the premium/long tail. Search-URL formats verified live (2026-06).
    CA: [
      { name: "Yarnspirations",  search: q => `https://www.yarnspirations.com/search?q=${q}`,  aff: { network: "cj" } },
      { name: "Mary Maxim",      search: q => `https://marymaxim.ca/search?q=${q}`,             aff: { network: "awin", mid: "40388" } },
      { name: "Michaels Canada", search: q => `https://canada.michaels.com/search?q=${q}+yarn`, aff: { network: "cj" } },
      { name: "Amazon.ca",       search: q => `https://www.amazon.ca/s?k=${q}+yarn`,            aff: { network: "amazon", market: "CA" } },
    ],
    US: [
      { name: "LoveCrafts", search: q => `https://www.lovecrafts.com/en-us/search?term=${q}`, aff: { network: "awin", mid: "" } }, // MID from Awin (LoveCrafts also runs a direct program)
      { name: "Hobbii",     search: q => `https://hobbii.com/catalogsearch/result/?q=${q}`,    aff: { network: "cj" } },
      { name: "Amazon",     search: q => `https://www.amazon.com/s?k=${q}+yarn`,               aff: { network: "amazon", market: "US" } },
    ],
  };

  // Affiliate-network click wrapping (tracker 26). Each retailer's `aff.network` selects
  // how a destination (search or product URL) becomes a tracked link. Publisher IDs live
  // here and start EMPTY — every branch then returns the URL unchanged, so links work with
  // zero tracking until real tags are dropped in. Amazon (?tag=) and Awin (cread.php) are
  // verified formats; CJ is a scaffold — confirm its automated-deep-link format in the CJ
  // dashboard before enabling. New networks (ShareASale, Impact) get their own case when a
  // retailer adopts one; see docs/affiliate-candidates.md.
  const AFFILIATE_IDS = {
    amazon: { CA: "", US: "" }, // Amazon Associates store IDs per marketplace, e.g. "yourtag-20"
    cj:     "",                 // Commission Junction publisher ID (PID)
    awin:   "",                 // Awin publisher ID (affid)
  };
  function affiliateUrl(url, aff) {
    if (!aff) return url;
    const dest = encodeURIComponent(url);
    switch (aff.network) {
      case "amazon": {                                  // append ?tag= on the destination itself
        const tag = AFFILIATE_IDS.amazon[aff.market];
        return tag ? url + (url.includes("?") ? "&" : "?") + `tag=${tag}` : url;
      }
      case "awin":                                      // wrap: per-merchant mid + your global affid
        return (AFFILIATE_IDS.awin && aff.mid)
          ? `https://www.awin1.com/cread.php?awinmid=${aff.mid}&awinaffid=${AFFILIATE_IDS.awin}&ued=${dest}`
          : url;
      case "cj":                                        // CJ automated deep link — verify format in dashboard
        return AFFILIATE_IDS.cj
          ? `https://www.anrdoezrs.net/links/${AFFILIATE_IDS.cj}/type/dlg/${dest}`
          : url;
      default:                                          // unconfigured / not-yet-handled network: leave plain
        return url;
    }
  }

  // Direct product-page URLs, curated per yarn × retailer. DECOUPLED from YARNS to keep
  // records terse and because product URLs rot on a different cadence than specs (see
  // docs/product-link-verification-2026-06.md). SPARSE BY DESIGN: any (yarn, retailer)
  // absent here falls back to the retailer SEARCH in buyLinks() below.
  //   key     = `${b}|${n}` — the same canonical identity the share-URL uses in app.js.
  //   sub-key = retailer `name` (globally unique across regions).
  //   value   = a static, trusted, absolute https URL (shape enforced by tests/products.test.js).
  // Seeded June 2026 with the Amazon listings that passed live verification. The pass
  // found that Amazon sells yarn lines almost entirely as per-COLORWAY child ASINs —
  // a color-agnostic "pick your color" parent listing is the exception, and amazon.com
  // had none at all — so only clean parents are seeded and everything else stays on
  // search (which shows all colorways). Amazon `/dp/<ASIN>?tag=` composes cleanly with
  // the affiliate tag (task 26).
  const PRODUCTS = {
    "Red Heart|Super Saver":              { "Amazon.ca": "https://www.amazon.ca/dp/B0017342OY" },
    "Lily|Sugar'n Cream":                 { "Amazon.ca": "https://www.amazon.ca/dp/B01CUX75I4" },
    "Lion Brand|Wool-Ease Thick & Quick": { "Amazon.ca": "https://www.amazon.ca/dp/B06Y3YT9RG" },
    "Bernat|Baby Blanket":                { "Amazon.ca": "https://www.amazon.ca/dp/B004WQPM60" },
  };
  const PRODUCTS_VERIFIED = "June 2026"; // batch re-verify date for PRODUCTS (mirrors SPECS_REVIEWED)

  function buyLinks(y, region) {
    const list = RETAILERS[region] || RETAILERS[DEFAULT_REGION];
    const q = encodeURIComponent(`${y.b} ${y.n}`);
    const direct = PRODUCTS[`${y.b}|${y.n}`];          // { retailerName: url } | undefined
    return list.map(r => {
      const hit = direct && direct[r.name];            // curated product URL | undefined
      let url = hit || r.search(q);                    // direct product page, else search fallback
      url = affiliateUrl(url, r.aff);                  // wrap in the store's affiliate link (no-op until IDs set)
      const kind = hit ? "direct" : "search";
      const label = hit ? "product page" : "search results";
      return `<a target="_blank" rel="noopener" data-buy="${kind}" title="${r.name} — ${label}" href="${url}">${r.name}</a>`;
    }).join("");
  }

  // ---------- exports ----------
  const YarnSwap = {
    WEIGHTS, FIBERS, FAMILY, TEXTURES, YARNS, SPECS_REVIEWED,
    PTS, THICKNESS_SLOPE, GAUGE_SLOPE, FIBER_EXACT_SHARE, MIN_SCORE, MAX_RESULTS, FAMILY_FLOOR, TEXTURE_FLOOR, TEXTURE_SIM, RETAILERS, REGIONS, DEFAULT_REGION, PRODUCTS, PRODUCTS_VERIFIED, AFFILIATE_IDS,
    escapeHtml, ypg, famPct, fiberLabel, swatchColor,
    thicknessDiff, fiberSimilarity, textureSimilarity, score, whyText, displayScore, buyLinks, affiliateUrl,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = YarnSwap;
  else root.YarnSwap = YarnSwap;
})(typeof globalThis !== "undefined" ? globalThis : this);
