# YarnSwap

Find a workable substitute when the yarn a pattern calls for isn't available.

Single-file HTML app — no build step, no backend. Open `index.html` in a browser.

## How it works

- Pick the pattern yarn from the starter database, or enter its specs (weight, yardage/grams per ball, fiber, gauge).
- Candidates are scored 0–100 on: yarn weight class (35), thickness as yards-per-gram (25), fiber content (20), gauge (15), and care/washability (5).
- Yarns more than one weight class away are excluded. Results below 55 are hidden.
- Each match links to retailer searches (LoveCrafts, Hobbii, Amazon) — swap in affiliate links later.

## Roadmap

- [ ] Expand yarn database (currently 45 widely available yarns; specs approximate)
- [ ] Affiliate links + click-through tracking
- [ ] Live stock/price checking
- [ ] Texture/halo attributes in scoring
- [ ] Shareable result URLs

## Disclaimer

Match scores are heuristic. Always knit a gauge swatch before committing to a substitute.
