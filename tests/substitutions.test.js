"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Y = require("../scoring.js");

/*
 * Expert-curated substitution fixtures (tracker 22).
 *
 * Locks in the substitution *relationships* we're confident about so that retuning
 * the weights in scoring.js can't silently break them. Each case names a TARGET yarn
 * in the DB plus substitutes experts consider GOOD and ones they would NOT recommend,
 * with a note on why. Assertions are deliberately *relative* — every good sub
 * outranks every "avoid" sub, and good subs land in the top results — rather than
 * pinned to exact scores, so they survive weight tweaks but still catch regressions.
 *
 * ADD A CASE: append to CASES below. A good pair that fails to clear MIN_SCORE / the
 * top-N cut, or an "avoid" pair that outscores a good one, is the signal to either
 * reconsider the pair or retune PTS in scoring.js — that tuning IS tracker 22.
 */

const TOP_N = 5; // a "good" sub should land within the top N candidates for its target

const find = ([b, n]) => {
  const y = Y.YARNS.find(y => y.b === b && y.n === n);
  assert.ok(y, `fixture names a yarn not in the DB: ${b} ${n}`);
  return y;
};

// All scorable candidates for a target, ranked best-first. Mirrors the app's core
// ranking (score everything, drop weight-excluded nulls, sort desc) without the DOM.
function ranked(target) {
  return Y.YARNS
    .filter(y => !(y.b === target.b && y.n === target.n))
    .map(y => ({ y, s: Y.score(target, y) }))
    .filter(r => r.s !== null)
    .sort((a, b) => b.s - a.s);
}
const rankOf = (t, c) => {
  const i = ranked(t).findIndex(r => r.y.b === c.b && r.y.n === c.n);
  return i === -1 ? Infinity : i + 1; // 1-based; Infinity when weight-excluded
};

// Each: target + good subs + "avoid" subs (optional), with a sourcing note.
const CASES = [
  {
    target: ["Cascade", "220"],
    good: [["Cascade", "220 Superwash"], ["Knit Picks", "Wool of the Andes"], ["Patons", "Classic Wool Worsted"]],
    avoid: [["Lily", "Sugar'n Cream"], ["Bernat", "Blanket"]],
    note: "100% worsted-wool workhorses are mutual subs; cotton (Sugar'n Cream) and a super-bulky chenille blanket yarn are not.",
  },
  {
    target: ["Cascade", "220 Superwash"],
    good: [["Cascade", "220"], ["Malabrigo", "Rios"]],
    avoid: [["Red Heart", "Super Saver"]],
    note: "Superwash wool / superwash merino at the same weight; an all-acrylic saver yarn is a weaker, different-fiber stand-in.",
  },
  {
    target: ["Rowan", "Kidsilk Haze"],
    good: [["Drops", "Kid-Silk"]],
    avoid: [["Malabrigo", "Lace"]],
    note: "Two mohair/silk halo laceweights are near-twins; smooth merino lace changes the whole fabric.",
  },
  {
    target: ["Bernat", "Blanket"],
    good: [["Bernat", "Baby Blanket"]],
    avoid: [["Cascade", "Magnum"], ["Lion Brand", "Wool-Ease Thick & Quick"]],
    note: "Polyester chenille near-twin; wool roving / smooth super-bulkies look and feel nothing like chenille.",
  },
  {
    target: ["Knit Picks", "Lindy Chain"],
    good: [["Quince & Co", "Sparrow"]],
    avoid: [["Malabrigo", "Sock"]],
    note: "Linen/cotton chainette fingering pairs with the linen Sparrow; a smooth merino sock yarn is a different fiber family and texture.",
  },
  {
    target: ["Lion Brand", "Truboo"],
    good: [["Lion Brand", "Coboo"]],
    avoid: [["Drops", "Karisma"]],
    note: "Bamboo and bamboo/cotton are near-twins (drape, sheen); a wool DK is a different fiber family even at the same gauge.",
  },
  {
    target: ["Malabrigo", "Lace"],
    good: [["Knit Picks", "Shadow"]],
    avoid: [["Rowan", "Kidsilk Haze"]],
    note: "Two smooth merino laceweights are close twins; a mohair-halo lace knits up to a completely different fabric.",
  },
];

for (const c of CASES) {
  const target = find(c.target);
  const goods = c.good.map(find);
  const avoids = (c.avoid || []).map(find);
  const label = `${target.b} ${target.n}`;

  test(`subs: ${label} — good subs clear the bar and rank in the top ${TOP_N}`, () => {
    for (const g of goods) {
      const s = Y.score(target, g);
      assert.ok(s !== null && s >= Y.MIN_SCORE,
        `${g.b} ${g.n} should be a recommendable sub for ${label} (score ${s}, bar ${Y.MIN_SCORE})`);
      const r = rankOf(target, g);
      assert.ok(r <= TOP_N,
        `${g.b} ${g.n} should rank within top ${TOP_N} for ${label} (got rank ${r})`);
    }
  });

  if (avoids.length) {
    test(`subs: ${label} — every good sub outranks every "avoid" sub`, () => {
      const weakestGood = Math.min(...goods.map(g => Y.score(target, g)));
      for (const a of avoids) {
        const s = Y.score(target, a); // null = weight-excluded = clearly worse
        assert.ok(s === null || s < weakestGood,
          `${a.b} ${a.n} (score ${s}) should rank below every good sub for ${label} (weakest good = ${weakestGood})`);
      }
    });
  }
}
