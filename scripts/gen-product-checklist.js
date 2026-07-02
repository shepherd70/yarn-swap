"use strict";
/*
 * Generate docs/product-link-checklist.md from the yarn DB + PRODUCTS map in scoring.js (task 35).
 *
 * Working sheet for curating DIRECT retailer product-page URLs per yarn × retailer. Shows the
 * current state of each cell (a curated product URL, or "search" when it falls back to the
 * retailer search) and leaves blank columns to paste a new URL + verify date. Refuses to
 * overwrite an already-annotated checklist unless run with --force, so curation notes aren't
 * clobbered. Sibling of gen-spec-checklist.js (different data, different cadence).
 *
 *   node scripts/gen-product-checklist.js [--force]
 */
const fs = require("fs");
const path = require("path");
const Y = require("../scoring.js");

const OUT = path.join(__dirname, "..", "docs", "product-link-checklist.md");

if (fs.existsSync(OUT) && !process.argv.includes("--force")) {
  console.error(
    `Refusing to overwrite ${path.relative(process.cwd(), OUT)} — export your notes, then re-run with --force.`
  );
  process.exit(1);
}

const key = y => `${y.b}|${y.n}`;
const rows = Y.YARNS.map((y, i) => ({ ...y, idx: i + 1 })); // stable 1-based DB index
const byRegion = Y.REGIONS.map(reg => ({ reg, list: Y.RETAILERS[reg.code] || [] }));

// Coverage: filled vs eligible (eligible = every yarn × every retailer slot across regions).
let filled = 0, eligible = 0;
for (const y of rows) {
  const direct = Y.PRODUCTS[key(y)] || {};
  for (const { list } of byRegion) for (const r of list) { eligible++; if (direct[r.name]) filled++; }
}

let md = `# Product-link checklist — task 35

_Generated from \`scoring.js\` — **${rows.length} yarns** × **${Y.REGIONS.length} regions**._

Direct product-page URLs are curated per yarn × retailer in the \`PRODUCTS\` map; any cell left
blank falls back to the retailer **search** in \`buyLinks()\`. Fill **New URL** with the canonical
product page (absolute https, on the retailer's own host) and **Verified** with the YYYY-MM you
checked it, then hand the batch back to apply to \`scoring.js\`. Last batch verify: **${Y.PRODUCTS_VERIFIED}**.

**Direct product links: ${filled} / ${eligible} filled.** The **#** column is the record's position
in the \`scoring.js\` \`YARNS\` array.

> Regenerate with \`node scripts/gen-product-checklist.js --force\` — this **overwrites** the file
> and any notes in it. Export annotations first.
`;

for (const { reg, list } of byRegion) {
  md += `\n## ${reg.label} (${reg.code})\n`;
  for (const w of Y.WEIGHTS) {
    const group = rows.filter(r => r.w === w);
    if (!group.length) continue;
    md += `\n### ${w} (${group.length})\n\n`;
    md += `| # | Yarn | Retailer | Current | New URL (fill) | Verified | Notes |\n`;
    md += `|--:|------|----------|---------|----------------|:--------:|-------|\n`;
    for (const r of group) {
      const direct = Y.PRODUCTS[key(r)] || {};
      for (const ret of list) {
        const cur = direct[ret.name] ? `[link](${direct[ret.name]})` : "search";
        md += `| ${r.idx} | ${r.b} ${r.n} | ${ret.name} | ${cur} | | | |\n`;
      }
    }
  }
}

fs.writeFileSync(OUT, md);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} — ${filled}/${eligible} cells filled.`);
