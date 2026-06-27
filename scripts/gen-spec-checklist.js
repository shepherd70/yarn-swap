"use strict";
/*
 * Generate docs/spec-review-checklist.md from the yarn DB in scoring.js (tracker 30).
 *
 * Produces a working checklist for verifying every record against its ball band /
 * manufacturer page. Refuses to overwrite an already-annotated checklist unless run
 * with --force, so review notes aren't clobbered.
 *
 *   node scripts/gen-spec-checklist.js [--force]
 */
const fs = require("fs");
const path = require("path");
const Y = require("../scoring.js");

const OUT = path.join(__dirname, "..", "docs", "spec-review-checklist.md");

if (fs.existsSync(OUT) && !process.argv.includes("--force")) {
  console.error(
    `Refusing to overwrite ${path.relative(process.cwd(), OUT)} — export your notes, then re-run with --force.`
  );
  process.exit(1);
}

const fiber = f =>
  Object.entries(f).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" / ");
const mw = b => (b ? "✓" : "✗");

// stable 1-based DB index (matches order in scoring.js), then grouped by weight class
const rows = Y.YARNS.map((y, i) => ({ ...y, idx: i + 1 }));

let md = `# Spec review checklist — tracker 30

_Generated from \`scoring.js\` — **${rows.length} records**._

A full **sourced verification pass** (manufacturer ball-band pages + [yarnsub.com](https://yarnsub.com) /
[Ravelry](https://www.ravelry.com/yarns)) was completed **${Y.SPECS_REVIEWED}** — changelog and
residual notes in [\`spec-verification-2026-06.md\`](./spec-verification-2026-06.md). The table
below is the **current** spec for every record; use it for an optional second pass against a
*physical* ball band: tick **OK** if it matches, or write the correct value in **Fix** and hand
the batch back to have it applied to \`scoring.js\`.

**Fields:** Yds = yards/ball · g = grams/ball · Gauge = sts per 4 in · MW = machine-washable · Tier = price 1–3. The **#** column is the record's position in the \`scoring.js\` \`YARNS\` array.

**Physical ball-band re-confirmation: 0 / ${rows.length}.**

> Regenerate with \`node scripts/gen-spec-checklist.js --force\` — this **overwrites** the
> file and any notes in it. Export annotations first.
`;

for (const w of Y.WEIGHTS) {
  const group = rows.filter(r => r.w === w);
  if (!group.length) continue;
  md += `\n## ${w} (${group.length})\n\n`;
  md += `| # | Yarn | Yds | g | Gauge | Fiber | MW | Tier | Texture | OK | Fix |\n`;
  md += `|--:|------|----:|--:|------:|-------|:--:|:----:|---------|:--:|-----|\n`;
  for (const r of group) {
    md += `| ${r.idx} | ${r.b} ${r.n} | ${r.yds} | ${r.g} | ${r.ga} | ${fiber(r.f)} | ${mw(r.mw)} | ${r.p} | ${r.t} | ☐ | |\n`;
  }
}

fs.writeFileSync(OUT, md);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} — ${rows.length} rows.`);
