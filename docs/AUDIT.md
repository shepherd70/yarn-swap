# YarnSwap — Project Audit

*Date: 2026-06-05 · Scope: full project (`index.html`, `README.md`, `docs/`)*

> **SUPERSEDED (2026-06-14).** This audit describes the earlier **38-yarn** version of YarnSwap. The codebase has since moved to 45 yarns, and **most High/Med items below have been fixed** — the contrast failures, missing `aria-live`, missing input validation, the arbitrary fiber-remainder guess, the missing `escapeHtml` helper, and the inline `onclick` handlers. Its line numbers no longer match `index.html`. Kept for historical reference only; for the current state see [`yarn-swap-audit-2026-06.md`](yarn-swap-audit-2026-06.md).

## Verdict

YarnSwap is a clean, well-built single-file prototype. The code is readable, the scoring math is internally consistent (no scores exceed 100, weight-class exclusion works, 768 of 1,406 candidate pairs are correctly filtered out as too far apart), and there is **no XSS vector today** because no free-text user input reaches `innerHTML`. The main gaps are all "pre-release" concerns the tracker already anticipates: data accuracy, accessibility contrast, input validation, and a couple of scoring heuristics that are arbitrary. Nothing here is a blocker for a prototype; several items are blockers for a public launch.

Severity legend: **[High]** fix before public launch · **[Med]** should fix · **[Low]** polish.

---

## 1. Correctness & logic bugs

**[Med] Custom-spec fiber remainder is arbitrary.** In `getTarget()` (line 320), when the main fiber is < 100%, the remainder is assigned to wool (if main is synthetic) or acrylic (otherwise):
```js
if (pct < 100) f[FAMILY[fib] === "synthetic" ? "wool" : "acrylic"] = 100 - pct;
```
A user entering "80% cotton" silently gets "20% acrylic," which then drives the fiber-family score toward synthetic. This can materially change results. The tracker flags this (task 23). Best fix: add an explicit secondary-fiber input, or treat the remainder as "unknown" and exclude it from family scoring rather than guessing.

**[Med] Number inputs treat 0 as "use default," and negatives slip through.** `+document.getElementById("sYds").value || 220` means an entered `0` becomes `220` (0 is falsy), and the `min=1`/`min=4` HTML attributes aren't enforced on programmatic read — a pasted negative yardage produces a negative yards-per-gram and nonsensical thickness scoring. Add real validation (task 24): clamp/reject values outside range and surface a message instead of silently substituting defaults.

**[Low] Perfect matches display as "99%".** `Math.min(s,99)` caps the *displayed* score at 99 while the badge/threshold use the true score. A yarn re-entered against itself in specs mode scores 100 but shows 99%. Harmless, but slightly odd. Either allow 100 or document the cap.

**[Low] Thickness penalty is asymmetric.** `diff = |a-b| / a` is relative to the *target* only. A candidate 20% thinner and one 20% thicker score differently depending on which side is the target. Consider a symmetric measure (e.g., divide by the mean, or use a log ratio) so substitution scoring is order-independent.

**[Low] The wool/merino equivalence block is correct but opaque.** Lines 271–272 recompute `exact` via a `Math.max(...)` with four nested `Math.min` terms. It works (the combined-pool value is always ≥ the separate one, so the `max` is effectively redundant), but it's hard to maintain. A short helper that pools "wool-family" fibers before the overlap loop would be clearer and less bug-prone when more equivalences are added.

---

## 2. Scoring methodology

The 35 / 25 / 20 / 15 / 5 weighting (weight class / thickness / fiber / gauge / care) is reasonable and the totals correctly cap at 100. Two notes for the planned tuning pass (task 22):

- **Gauge "neutral credit" of 8/15** only ever triggers when a *custom* target omits gauge (every DB yarn has a gauge). That's fine, but 8 is just over half the gauge weight — a custom yarn with no gauge gets a quiet boost relative to a poorly-gauge-matched real one. Worth checking against real substitutions.
- **`whyText` thresholds don't match the scorer.** The rationale text uses hard cutoffs (`sameFam >= 75`, `d <= 5`) that are independent of the continuous score, so a card can read "similar fiber character" while the fiber term scored low-ish, or vice versa. Drive the explanation from the same numbers the scorer uses.

---

## 3. Data quality

- **Count mismatch.** The array holds **38** yarns. README says "~38" (fine) but `docs/yarn-tracker-state.json` says "37" in tasks 1 and 19. Reconcile to 38.
- **All 38 records are internally valid:** every fiber blend sums to exactly 100%, and every fiber maps to a known family. Good.
- **[Med] Thin coverage in some weight classes.** Distribution: Worsted 13, DK 8, Fingering 5, Bulky 3, Aran 3, Sport 2, Lace 2, Super Bulky 2. With only 2 Sport/Lace/Super-Bulky yarns, a target in those classes leans almost entirely on adjacent-class candidates, which can make results feel thin or off. Expanding these classes (task 19) matters more than padding Worsted further.
- **Specs are self-described as approximate.** Until the ball-band verification (tasks 19/30) is done, the disclaimer is doing real work — keep it prominent.

---

## 4. Accessibility (measured)

Contrast ratios computed against WCAG 2.1 AA (4.5:1 normal text, 3.0:1 large):

| Pair | Ratio | Verdict |
|---|---|---|
| `--muted` #7a736a on `--bg` #faf7f2 | **4.38** | **Fails** AA for normal text (labels, `.brand`, `.note`, `.why`) |
| `--muted` on `--card` #ffffff | 4.68 | Passes |
| white on `--ok` badge #b07d2b | **3.61** | **Fails** — badge text is 16.8px bold, not "large" |
| `--accent` on `--accent-soft` (active tab) | **4.21** | **Fails** marginally — tab text is 16px bold |
| `--ink` on `--bg` | 13.36 | Passes |
| white on `--accent` header | 5.19 | Passes |
| white on `--good` badge | 5.03 | Passes |

**[High] for launch / [Med] now:** darken `--muted` (e.g. toward #6a6359 or darker) and the `--ok` amber, and either darken the active-tab text or its background. This is exactly task 25.

Other a11y items:
- **[Med] Results aren't announced.** The `#results` container has no `aria-live`, so screen-reader users get no feedback when "Find substitutes" runs. Add `aria-live="polite"`.
- **[Low] Score conveyed by more than color.** Good — each card also shows the % and an "Excellent/Good match" label, so the green/amber distinction isn't color-only. Keep that if you restyle.
- **[Low] Labels are properly associated** via `for`/`id` throughout, and the tabs are real `<button>`s (keyboard-operable). No issues found.

---

## 5. Security

- **No XSS today.** All `innerHTML` interpolation pulls from the static `YARNS` array, numeric inputs, or fixed `<select>` options. The custom yarn's `b`/`n` are hardcoded `"(custom)"` / `"pattern yarn"`, so no free text reaches the DOM. **[Low] latent risk:** the codebase builds HTML via template-string `innerHTML`. The moment a free-text field (e.g. a custom yarn name) is added, it becomes an injection vector. Add an `escapeHtml()` helper now and route all interpolation through it, so the pattern is safe before that field exists.
- **Outbound links are correct:** `target="_blank"` paired with `rel="noopener"` everywhere. Good.
- **[Low] No Content-Security-Policy.** Fine for a local file; add one when deploying (task 32). Note the inline `onclick=` handlers and inline `<style>`/`<script>` would require `unsafe-inline` or refactoring to external handlers under a strict CSP — worth converting `onclick` attributes to `addEventListener` before launch.

---

## 6. UX

- **[Low] Buy-link query inconsistency.** Amazon appends `+yarn` to the search; LoveCrafts and Hobbii don't. For generic brand+name combos the extra keyword helps relevance — consider applying it consistently (or per-retailer tuning).
- **[Low] "Below 55 hidden" / "top 10" are invisible rules.** When few results show, users may not know more were filtered. A small "showing top 10" or "N matches below the quality threshold were hidden" line would help.
- **[Low] No loading/disabled state** on the button — irrelevant at this data size, but worth it if live pricing (task 31) lands.
- **Responsive layout is solid** — grids collapse cleanly at ≤700px and the buy-links reflow to full width on cards.

---

## 7. Code quality & maintainability

The single-file architecture is appropriate and the code is genuinely tidy: small pure helpers (`ypg`, `famPct`, `fiberLabel`), clear section comments, sensible names. For longevity:

- **[Low]** Move scoring weights (35/25/20/15/5) into named constants so the planned re-tuning (task 22) and the texture term (task 21) don't require hunting through `score()`.
- **[Low]** The `score()` function does five things inline; extracting one function per term would make the weight-rebalancing and unit-testing (tasks 21/22/29) much easier.
- **[Low]** No tests exist. Even a tiny set of assertions (self-score = 100, known substitution pairs in expected order, weight-gap exclusion) would lock in behavior before the scoring changes land. Tasks 28/29 call for manual testing; a few automated checks would be cheap insurance.

---

## 8. Docs & tracker consistency

- README is accurate and well-scoped; roadmap maps cleanly to the tracker.
- Tracker is detailed and line-referenced — nicely maintained. Only drift found: the **37 vs 38** yarn count noted above.
- `docs/` is untracked in git (`git status` shows `?? docs/`). Decide whether the tracker belongs in version control and either commit it or add to `.gitignore`.

---

## Prioritized punch list

**Before any public launch (High):**
1. Fix contrast failures: `--muted`, `--ok` badge, active-tab text (task 25).
2. Verify yarn specs against ball-band data (tasks 19/30) — the whole value prop rests on this.
3. Add input validation for the specs form (task 24).

**Should fix (Med):**
4. Replace the arbitrary custom-fiber remainder with an explicit input or "unknown" handling (task 23).
5. Add `aria-live` to results; convert `onclick` to `addEventListener`; add an `escapeHtml()` helper.
6. Expand Sport / Lace / Super-Bulky coverage (task 19).
7. Reconcile the 37/38 count.

**Polish (Low):**
8. Pull scoring weights into constants; split `score()` per term; add a handful of assertions.
9. Symmetric thickness metric; align `whyText` thresholds with the scorer.
10. Consistent buy-link queries; surface the "top 10 / ≥55" filtering to users.
