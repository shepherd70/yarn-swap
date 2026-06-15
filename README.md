# YarnSwap

Find a workable substitute when the yarn a pattern calls for isn't available.

A small, **build-free static web app** — no backend, no bundler, no dependencies.
Open `index.html` in a browser and it works (even straight off the filesystem).

## Run it

- **Locally:** open `index.html` in any modern browser, or serve the folder
  (`python -m http.server`) and visit it.
- **Tests:** `node --test` (zero-dependency, runs the scoring suite in `tests/`).

## How it works

- Pick the pattern yarn from the database, or enter its specs (weight, yardage/grams
  per ball, gauge, fiber, texture).
- Candidates are scored out of 100 on six terms: **weight class (32)**,
  **thickness as yards-per-gram (22)**, **fiber content (18)**, **gauge (13)**,
  **surface texture (10)**, and **care/washability (5)**.
- Yarns more than one weight class away are excluded; results below 55 are hidden;
  the top 10 are shown. The displayed score is capped at 99 — it's a heuristic, so it
  never claims a "perfect" match.
- Each result shows a score ring, a fiber-family swatch (warm = animal, green = plant,
  blue = synthetic), spec pills, a plain-language rationale, and retailer search links.
- **Shareable links:** your target yarn and filters are encoded in the URL — copy the
  link to share or bookmark a result set; it restores on load.

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | Markup only; strict CSP; links the CSS/JS |
| `styles.css` | All styling |
| `scoring.js` | Yarn data + pure scoring logic (also runs in Node for tests) |
| `app.js` | DOM wiring, rendering, filters, URL state |
| `tests/` | `node --test` scoring suite |

## Data

The starter database is **45 widely available yarns**. Specs were spot-checked against
manufacturer/retailer data (June 2026) and are approximate/per-ball — full per-record
sign-off against ball-band data is still pending. **Always knit a gauge swatch.**

## Deploy

Static — host the folder anywhere. For **GitHub Pages**, the included workflow
(`.github/workflows/pages.yml`) deploys on push to `main`; enable it once under
**Settings → Pages → Build and deployment → GitHub Actions**.

## Roadmap

- [ ] Final per-record spec verification & sign-off
- [ ] Affiliate links (plumbing is in place — drop tags into `RETAILERS` in `scoring.js`)
- [ ] Validate/tune scoring weights against expert-curated substitutions
- [ ] Expand the yarn database further
- [ ] Live stock/price checking (needs a backend)

## Disclaimer

Match scores are heuristic. No substitute is identical — always knit a gauge swatch
before committing to a yarn.
