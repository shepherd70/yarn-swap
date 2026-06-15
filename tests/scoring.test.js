"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Y = require("../scoring.js");

// Small helpers to build controlled yarn objects for the scoring tests.
const yarn = (over = {}) => ({
  b: "Test", n: "Yarn", w: "Worsted", f: { wool: 100 },
  yds: 200, g: 100, ga: 20, mw: false, p: 2, ...over,
});

test("dataset integrity: 45 records, all internally valid", () => {
  assert.equal(Y.YARNS.length, 45);
  for (const y of Y.YARNS) {
    const sum = Object.values(y.f).reduce((s, v) => s + v, 0);
    assert.equal(sum, 100, `${y.b} ${y.n} fiber blend must sum to 100 (got ${sum})`);
    for (const fib of Object.keys(y.f)) {
      assert.ok(Y.FAMILY[fib], `${y.b} ${y.n} uses unknown fiber "${fib}"`);
    }
    assert.ok(Y.WEIGHTS.includes(y.w), `${y.b} ${y.n} has unknown weight "${y.w}"`);
    assert.ok(y.yds > 0 && y.g > 0, `${y.b} ${y.n} must have positive yds/g`);
  }
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
  // The thickness/fiber/weight/gauge terms are all symmetric; only the care
  // term is intentionally directional (losing machine-washability is penalized,
  // gaining it is not). So score(a,b) and score(b,a) may differ by at most the
  // care weight, and only when exactly one yarn is machine-washable.
  for (const a of Y.YARNS) {
    for (const b of Y.YARNS) {
      const ab = Y.score(a, b), ba = Y.score(b, a);
      if (ab === null) { assert.equal(ba, null); continue; }
      const delta = Math.abs(ab - ba);
      assert.ok(delta === 0 || delta === Y.PTS.care, `${a.n} vs ${b.n}: delta ${delta}`);
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
