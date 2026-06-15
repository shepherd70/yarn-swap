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
  const FIBERS = ["wool","merino","alpaca","mohair","silk","cashmere","cotton","linen","bamboo","acrylic","nylon","polyester"];
  const FAMILY = { wool:"animal", merino:"animal", alpaca:"animal", mohair:"animal", silk:"animal", cashmere:"animal",
                   cotton:"plant", linen:"plant", bamboo:"plant",
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
   {b:"Plymouth", n:"Encore Worsted", w:"Worsted", f:{acrylic:75, wool:25}, yds:200, g:100, ga:18, mw:true, p:2, t:"smooth"},
   {b:"Berroco", n:"Vintage", w:"Worsted", f:{acrylic:52, wool:40, nylon:8}, yds:218, g:100, ga:19, mw:true, p:2, t:"smooth"},
   {b:"Red Heart", n:"Super Saver", w:"Worsted", f:{acrylic:100}, yds:364, g:198, ga:17, mw:true, p:1, t:"smooth"},
   {b:"Caron", n:"Simply Soft", w:"Worsted", f:{acrylic:100}, yds:315, g:170, ga:18, mw:true, p:1, t:"smooth"},
   {b:"Knit Picks", n:"Brava Worsted", w:"Worsted", f:{acrylic:100}, yds:218, g:100, ga:18, mw:true, p:1, t:"smooth"},
   {b:"Berroco", n:"Ultra Alpaca", w:"Worsted", f:{alpaca:50, wool:50}, yds:215, g:100, ga:20, mw:false, p:2, t:"smooth"},
   {b:"Lily", n:"Sugar'n Cream", w:"Worsted", f:{cotton:100}, yds:120, g:71, ga:18, mw:true, p:1, t:"smooth"},
   {b:"Cascade", n:"Ultra Pima", w:"DK", f:{cotton:100}, yds:220, g:100, ga:22, mw:true, p:2, t:"smooth"},
   {b:"Stylecraft", n:"Special DK", w:"DK", f:{acrylic:100}, yds:322, g:100, ga:22, mw:true, p:1, t:"smooth"},
   {b:"Paintbox", n:"Simply DK", w:"DK", f:{acrylic:100}, yds:302, g:100, ga:22, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Karisma", w:"DK", f:{wool:100}, yds:109, g:50, ga:21, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Merino Extra Fine", w:"DK", f:{merino:100}, yds:114, g:50, ga:21, mw:true, p:1, t:"smooth"},
   {b:"Sirdar", n:"Snuggly DK", w:"DK", f:{nylon:55, acrylic:45}, yds:179, g:50, ga:22, mw:true, p:1, t:"smooth"},
   {b:"Rowan", n:"Felted Tweed", w:"DK", f:{wool:50, alpaca:25, polyester:25}, yds:191, g:50, ga:23, mw:false, p:3, t:"tweed"},
   {b:"Knit Picks", n:"Swish DK", w:"DK", f:{merino:100}, yds:123, g:50, ga:22, mw:true, p:2, t:"smooth"},
   {b:"Scheepjes", n:"Catona", w:"Sport", f:{cotton:100}, yds:137, g:50, ga:26, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Alpaca", w:"Sport", f:{alpaca:100}, yds:182, g:50, ga:24, mw:false, p:1, t:"smooth"},
   {b:"Cascade", n:"220 Sport", w:"Sport", f:{wool:100}, yds:164, g:50, ga:24, mw:false, p:2, t:"smooth"},
   {b:"Knit Picks", n:"Brava Sport", w:"Sport", f:{acrylic:100}, yds:340, g:100, ga:24, mw:true, p:1, t:"smooth"},
   {b:"Debbie Bliss", n:"Baby Cashmerino", w:"Sport", f:{merino:55, acrylic:33, cashmere:12}, yds:137, g:50, ga:25, mw:true, p:2, t:"smooth"},
   {b:"Knit Picks", n:"Palette", w:"Fingering", f:{wool:100}, yds:231, g:50, ga:28, mw:false, p:1, t:"smooth"},
   {b:"Drops", n:"Fabel", w:"Fingering", f:{wool:75, nylon:25}, yds:224, g:50, ga:26, mw:true, p:1, t:"smooth"},
   {b:"Malabrigo", n:"Sock", w:"Fingering", f:{merino:100}, yds:440, g:100, ga:28, mw:true, p:3, t:"smooth"},
   {b:"Lion Brand", n:"Sock-Ease", w:"Fingering", f:{wool:75, nylon:25}, yds:438, g:100, ga:28, mw:true, p:1, t:"smooth"},
   {b:"Cascade", n:"Heritage", w:"Fingering", f:{merino:75, nylon:25}, yds:437, g:100, ga:28, mw:true, p:2, t:"smooth"},
   {b:"Rowan", n:"Kidsilk Haze", w:"Lace", f:{mohair:70, silk:30}, yds:229, g:25, ga:25, mw:false, p:3, t:"halo"},
   {b:"Drops", n:"Kid-Silk", w:"Lace", f:{mohair:75, silk:25}, yds:230, g:25, ga:24, mw:false, p:2, t:"halo"},
   {b:"Malabrigo", n:"Lace", w:"Lace", f:{merino:100}, yds:470, g:50, ga:32, mw:false, p:3, t:"smooth"},
   {b:"Knit Picks", n:"Shadow", w:"Lace", f:{merino:100}, yds:440, g:50, ga:30, mw:false, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Wool-Ease Thick & Quick", w:"Super Bulky", f:{acrylic:80, wool:20}, yds:106, g:170, ga:9, mw:true, p:1, t:"smooth"},
   {b:"Cascade", n:"Magnum", w:"Super Bulky", f:{wool:100}, yds:123, g:250, ga:8, mw:false, p:2, t:"roving"},
   {b:"Malabrigo", n:"Rasta", w:"Super Bulky", f:{merino:100}, yds:90, g:150, ga:8, mw:false, p:3, t:"roving"},
   {b:"Bernat", n:"Blanket", w:"Super Bulky", f:{polyester:100}, yds:220, g:300, ga:8, mw:true, p:1, t:"chenille"},
   {b:"Bernat", n:"Softee Chunky", w:"Bulky", f:{acrylic:100}, yds:108, g:100, ga:13, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Andes", w:"Bulky", f:{wool:65, alpaca:35}, yds:104, g:100, ga:13, mw:false, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Hue + Me", w:"Bulky", f:{acrylic:80, wool:20}, yds:137, g:125, ga:12, mw:true, p:1, t:"roving"},
   {b:"Drops", n:"Paris", w:"Aran", f:{cotton:100}, yds:82, g:50, ga:17, mw:true, p:1, t:"smooth"},
   {b:"Drops", n:"Nepal", w:"Aran", f:{wool:65, alpaca:35}, yds:82, g:50, ga:17, mw:false, p:1, t:"smooth"},
   {b:"Lion Brand", n:"Heartland", w:"Aran", f:{acrylic:100}, yds:251, g:142, ga:16, mw:true, p:1, t:"smooth"},
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

  // When the dataset was last spot-checked against manufacturer/retailer specs.
  // Spot-checked June 2026: Cascade 220, Malabrigo Rios, Lion Brand Wool-Ease,
  // Caron Simply Soft, Red Heart Super Saver, Stylecraft Special DK, Bernat
  // Blanket, Scheepjes Catona, Sirdar Snuggly DK (the last two corrected). Specs
  // remain approximate/per-ball — full per-record sign-off is tracker task 30.
  const SPECS_REVIEWED = "June 2026";

  // ---------- scoring ----------
  // term weights: full-match points per term
  // (weight + thickness + fiber + gauge + texture + care = 100)
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

    return Math.round(pts);
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
  // per-retailer query tuning: Amazon gets an extra "yarn" keyword to disambiguate
  // against its general catalog; LoveCrafts/Hobbii search yarn-only catalogs already.
  function buyLinks(y) {
    const q = encodeURIComponent(`${y.b} ${y.n}`);
    return `
      <a target="_blank" rel="noopener" href="https://www.lovecrafts.com/en-us/search?term=${q}">LoveCrafts</a>
      <a target="_blank" rel="noopener" href="https://hobbii.com/catalogsearch/result/?q=${q}">Hobbii</a>
      <a target="_blank" rel="noopener" href="https://www.amazon.com/s?k=${q}+yarn">Amazon</a>`;
  }

  // ---------- exports ----------
  const YarnSwap = {
    WEIGHTS, FIBERS, FAMILY, TEXTURES, YARNS, SPECS_REVIEWED,
    PTS, THICKNESS_SLOPE, GAUGE_SLOPE, FIBER_EXACT_SHARE, MIN_SCORE, MAX_RESULTS, TEXTURE_SIM,
    escapeHtml, ypg, famPct, fiberLabel, swatchColor,
    thicknessDiff, fiberSimilarity, textureSimilarity, score, whyText, displayScore, buyLinks,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = YarnSwap;
  else root.YarnSwap = YarnSwap;
})(typeof globalThis !== "undefined" ? globalThis : this);
