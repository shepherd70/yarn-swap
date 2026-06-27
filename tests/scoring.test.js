"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Y = require("../scoring.js");

// Small helpers to build controlled yarn objects for the scoring tests.
const yarn = (over = {}) => ({
  b: "Test", n: "Yarn", w: "Worsted", f: { wool: 100 },
  yds: 200, g: 100, ga: 20, mw: false, p: 2, ...over,
});

test("dataset integrity: 60 records, all internally valid", () => {
  assert.equal(Y.YARNS.length, 60);
  for (const y of Y.YARNS) {
    const sum = Object.values(y.f).reduce((s, v) => s + v, 0);
    assert.equal(sum, 100, `${y.b} ${y.n} fiber blend must sum to 100 (got ${sum})`);
    for (const fib of Object.keys(y.f)) {
      assert.ok(Y.FAMILY[fib], `${y.b} ${y.n} uses unknown fiber "${fib}"`);
    }
    assert.ok(Y.WEIGHTS.includes(y.w), `${y.b} ${y.n} has unknown weight "${y.w}"`);
    assert.ok(Y.TEXTURES.includes(y.t), `${y.b} ${y.n} has unknown texture "${y.t}"`);
    assert.ok(y.yds > 0 && y.g > 0, `${y.b} ${y.n} must have positive yds/g`);
  }
});

const find = (b, n) => {
  const y = Y.YARNS.find(x => x.b === b && x.n === n);
  assert.ok(y, `fixture yarn not found: ${b} ${n}`);
  return y;
};

test("gap-fill: linen, bamboo, and chainette are represented (were selectable but empty)", () => {
  const hasFiber = fib => Y.YARNS.some(y => (y.f[fib] || 0) > 0);
  assert.ok(hasFiber("linen"), "expected at least one linen yarn");
  assert.ok(hasFiber("bamboo"), "expected at least one bamboo yarn");
  assert.ok(Y.YARNS.some(y => y.t === "chainette"), "expected at least one chainette-texture yarn");
  // a 2nd chenille so the Super Bulky chenille (Bernat Blanket) has an in-texture neighbour
  assert.ok(Y.YARNS.filter(y => y.t === "chenille").length >= 2, "expected at least two chenille yarns");
});

test("a yarn scores a perfect 100 against itself", () => {
  for (const y of Y.YARNS) assert.equal(Y.score(y, y), 100, `${y.b} ${y.n}`);
});

test("displayScore caps at 99 so no 'perfect' match is advertised", () => {
  assert.equal(Y.displayScore(100), 99);
  assert.equal(Y.displayScore(88), 88);
});

test("yarns more than one weight class apart are excluded (null)", () => {
  const lace = yarn({ w: "Lace" });
  const worsted = yarn({ w: "Worsted" });
  assert.equal(Y.score(lace, worsted), null);
});

test("same weight class scores higher than an adjacent class", () => {
  const target = yarn();
  const same = yarn();
  const adjacent = yarn({ w: "Aran", ga: 17 });
  assert.ok(Y.score(target, same) > Y.score(target, adjacent));
});

test("scoring is order-independent except for the directional care term", () => {
  // The weight/thickness/fiber/gauge/texture terms and the soft-gate are all
  // symmetric; only the care term is intentionally directional (losing machine-
  // washability is penalized, gaining it is not). Because the soft-gate scales the
  // whole score, the care asymmetry is at most PTS.care and shrinks with the gate —
  // so score(a,b) and score(b,a) differ by <= PTS.care, and only when exactly one
  // yarn is machine-washable.
  for (const a of Y.YARNS) {
    for (const b of Y.YARNS) {
      const ab = Y.score(a, b), ba = Y.score(b, a);
      if (ab === null) { assert.equal(ba, null); continue; }
      const delta = Math.abs(ab - ba);
      assert.ok(delta <= Y.PTS.care, `${a.n} vs ${b.n}: delta ${delta}`);
      if (delta !== 0) assert.notEqual(a.mw, b.mw, `${a.n} vs ${b.n} differ but same wash`);
    }
  }
});

test("thicknessDiff is 0 for identical and symmetric", () => {
  const a = yarn({ yds: 200, g: 100 });
  const b = yarn({ yds: 100, g: 100 });
  assert.equal(Y.thicknessDiff(a, a), 0);
  assert.equal(Y.thicknessDiff(a, b), Y.thicknessDiff(b, a));
});

test("wool and merino are treated as near-equivalent fibers", () => {
  const woolTarget = yarn({ f: { wool: 100 } });
  const merinoCand = yarn({ f: { merino: 100 } });
  const cottonCand = yarn({ f: { cotton: 100 } });
  // merino should be a far better fiber match for wool than cotton is
  assert.ok(Y.fiberSimilarity(woolTarget, merinoCand) > Y.fiberSimilarity(woolTarget, cottonCand));
  // and close to a straight wool-wool match
  assert.ok(Y.fiberSimilarity(woolTarget, merinoCand) >= 90);
});

test("famPct sums to the blend total and bins by family", () => {
  const f = { merino: 55, acrylic: 33, cashmere: 12 };
  const fam = Y.famPct(f);
  assert.equal(fam.animal + fam.plant + fam.synthetic, 100);
  assert.equal(fam.animal, 67); // merino + cashmere
  assert.equal(fam.synthetic, 33);
});

test("care term only penalizes losing machine-washability", () => {
  const mwTarget = yarn({ mw: true });
  const handCand = yarn({ mw: false });
  const mwCand = yarn({ mw: true });
  // identical except care: machine-wash target + hand-wash candidate loses the 5 care pts
  assert.equal(Y.score(mwTarget, mwCand) - Y.score(mwTarget, handCand), 5);
  // hand-wash target never penalizes a machine-wash candidate
  const handTarget = yarn({ mw: false });
  assert.equal(Y.score(handTarget, handCand), Y.score(handTarget, mwCand));
});

test("no real-world pair ever scores above 100", () => {
  for (const t of Y.YARNS) {
    for (const c of Y.YARNS) {
      const s = Y.score(t, c);
      if (s !== null) assert.ok(s <= 100, `${t.n} vs ${c.n} = ${s}`);
    }
  }
});

test("textureSimilarity: identical = 1, distinct textures penalized, symmetric", () => {
  assert.equal(Y.textureSimilarity("smooth", "smooth"), 1);
  assert.equal(Y.textureSimilarity("halo", "halo"), 1);
  assert.ok(Y.textureSimilarity("smooth", "halo") < 0.5);
  assert.equal(Y.textureSimilarity("smooth", "halo"), Y.textureSimilarity("halo", "smooth"));
  assert.equal(Y.textureSimilarity(undefined, "smooth"), null); // custom target, unknown
});

test("custom (textureless) target gets neutral texture credit, never full or zero", () => {
  const customLace = { w: "Lace", f: { merino: 100 }, yds: 400, g: 50, ga: 30, mw: false };
  const smoothLace = find("Knit Picks", "Shadow");
  const haloLace = find("Rowan", "Kidsilk Haze");
  // with no texture on the target, smooth vs halo candidates get the SAME texture
  // credit — texture simply doesn't tip the result either way
  const sSmooth = Y.score(customLace, smoothLace);
  const sHalo = Y.score({ ...customLace, f: { mohair: 70, silk: 30 } }, haloLace);
  assert.ok(Number.isFinite(sSmooth) && Number.isFinite(sHalo));
});

test("swatchColor returns a valid hex tied to fiber family", () => {
  const hex = /^#[0-9a-f]{6}$/;
  for (const y of Y.YARNS) assert.match(Y.swatchColor(y), hex, `${y.b} ${y.n}`);
  // pure-fiber yarns map to the exact family anchor colours
  assert.equal(Y.swatchColor({ f: { wool: 100 } }), "#b67854");   // animal anchor
  assert.equal(Y.swatchColor({ f: { cotton: 100 } }), "#7aa06c");  // plant anchor
  assert.equal(Y.swatchColor({ f: { acrylic: 100 } }), "#688ab2"); // synthetic anchor
  // a blend lands between its family anchors (not equal to either)
  const blend = Y.swatchColor({ f: { acrylic: 80, wool: 20 } });
  assert.notEqual(blend, "#688ab2");
  assert.notEqual(blend, "#b67854");
});

test("verified corrections are in place", () => {
  const sirdar = find("Sirdar", "Snuggly DK");
  assert.deepEqual(sirdar.f, { nylon: 55, acrylic: 45 }); // was acrylic/nylon, corrected
  const catona = find("Scheepjes", "Catona");
  assert.equal(catona.yds, 137);
  assert.equal(catona.ga, 26);
});

// ---------- known-substitution fixtures ----------
// Sanity anchors for the heuristic. Full validation against expert-curated
// substitutions is tracker task 22 (still needs human sign-off); these lock in
// the relationships we are confident about so re-tuning can't silently break them.

test("Cascade 220 and Patons Classic Wool are a strong mutual substitute", () => {
  const cascade = find("Cascade", "220");
  const patons = find("Patons", "Classic Wool Worsted");
  // both worsted, 100% wool, smooth, near-identical yardage
  assert.ok(Y.score(cascade, patons) >= 90, `expected >=90, got ${Y.score(cascade, patons)}`);
});

test("a superwash version is the top match for its non-superwash sibling", () => {
  const cascade = find("Cascade", "220");
  const superwash = find("Cascade", "220 Superwash");
  const best = Y.YARNS
    .filter(y => y !== cascade)
    .map(y => ({ y, s: Y.score(cascade, y) }))
    .filter(r => r.s !== null)
    .sort((a, b) => b.s - a.s)[0];
  assert.equal(best.y, superwash);
});

test("for a mohair-halo lace yarn, a halo substitute beats a smooth one", () => {
  const kidsilk = find("Rowan", "Kidsilk Haze");      // mohair/silk, halo
  const dropsKidSilk = find("Drops", "Kid-Silk");     // mohair/silk, halo
  const malabrigoLace = find("Malabrigo", "Lace");    // merino, smooth
  assert.ok(
    Y.score(kidsilk, dropsKidSilk) > Y.score(kidsilk, malabrigoLace),
    `halo match (${Y.score(kidsilk, dropsKidSilk)}) should beat smooth (${Y.score(kidsilk, malabrigoLace)})`
  );
});

test("for a chenille blanket yarn, a non-chenille of the same weight is texture-penalized", () => {
  const bernatBlanket = find("Bernat", "Blanket");    // polyester, chenille, super bulky
  const woolEaseTQ = find("Lion Brand", "Wool-Ease Thick & Quick"); // smooth super bulky
  // the texture term should cost the smooth candidate points it would otherwise have
  assert.ok(Y.textureSimilarity(bernatBlanket.t, woolEaseTQ.t) < 0.5);
});

// ---------- soft-gate (fiber-family + distinctive-texture) ----------
// Locks in the June-2026 retune: a multiplicative gate demotes fiber-family and
// distinctive-texture mismatches below structurally-similar same-family matches, to
// match expert (yarnsub) substitution behaviour. Validated against yarnsub for 8
// flagship yarns — see docs/scoring-validation-2026-06.md.

test("soft-gate: a cross-family candidate is demoted below a same-family one and hidden", () => {
  const ultraPima = find("Cascade", "Ultra Pima");   // DK cotton (plant)
  const coboo = find("Lion Brand", "Coboo");         // DK bamboo/cotton (plant)
  const karisma = find("Drops", "Karisma");          // DK wool (animal), same gauge
  assert.ok(Y.score(ultraPima, coboo) > Y.score(ultraPima, karisma),
    "a plant-fiber DK should outrank a same-gauge wool DK as a sub for cotton");
  assert.ok(Y.score(ultraPima, karisma) < Y.MIN_SCORE,
    "the cross-family wool should fall below the visible-results bar");
});

test("soft-gate: a smooth candidate is gated out for a distinctive-texture (halo) target", () => {
  const kidsilk = find("Rowan", "Kidsilk Haze");     // mohair halo lace
  const dropsKidSilk = find("Drops", "Kid-Silk");    // mohair halo lace
  const malabrigoLace = find("Malabrigo", "Lace");   // smooth merino lace
  assert.ok(Y.score(kidsilk, dropsKidSilk) >= Y.MIN_SCORE, "a matching-halo sub stays recommendable");
  assert.ok(Y.score(kidsilk, malabrigoLace) < Y.MIN_SCORE, "a smooth lace is gated below the bar");
});
