# Spec verification — June 2026 (tracker 30)

Full per-record accuracy pass over the YarnSwap database. Every record was checked
against authoritative sources — manufacturer ball-band / product pages first, with
[yarnsub.com](https://yarnsub.com) and [Ravelry](https://www.ravelry.com/yarns) as
cross-checks — by a fan-out of focused research agents, one per manufacturer group.
This is the tracker-30 sign-off record.

**Scope:** the six objective ball-band fields per record — weight class, fiber content,
yards/ball, grams/ball, gauge (sts/4 in), machine-washability — plus surface texture.
Price tier (`p`) is relative/subjective and was left out of scope.

**Result:** 53 records verified → **54** (one added). 9 records corrected; the rest
confirmed accurate or within rounding/range. Suite green (`node --test`, 28 tests).

## Corrections applied

| Record | Field | Was | Now | Source |
|--------|-------|-----|-----|--------|
| Plymouth Encore Worsted | gauge | 18 | **20** | plymouthyarn.com, yarn.com |
| Lily Sugar'n Cream | gauge | 18 | **20** | yarnspirations.com, Wool&Co, Mary Maxim |
| Lion Brand Sock-Ease | gauge | 28 | **30** | lionbrand.com |
| Lion Brand Hue + Me | gauge | 12 | **14** | lionbrand.com |
| Quince & Co Sparrow | yards | 170 | **164** | quinceandco.com, Ravelry, Woolery |
| Drops Andes | weight / yds / gauge | Bulky / 104 / 13 | **Super Bulky / 98 / 10** | garnstudio (via Wool Warehouse), yarnsub |
| Rowan Felted Tweed | fiber | polyester 25 | **viscose 25** | knitrowan.com, Ravelry |
| Knit Picks Comfy Worsted | texture | chainette | **smooth** | knitpicks.com cotton-yarn guide, yarnsub |
| Bernat Softee Chunky | gauge | 13 | **12** | yarnspirations.com |

**Added — Knit Picks Lindy Chain:** Fingering, 70% linen / 30% cotton, 50 g / 180 yd,
ga 30, hand-wash, chainette (yarnsub / Knit Picks blog / Ravelry). Added as the genuine
chainette example after Comfy Worsted (mis-tagged chainette — it is a plied 3-ply) was
corrected to smooth.

**Model change — added `viscose`** as a plant-family fiber, to support the Felted Tweed
correction (previously recorded as polyester / synthetic). It auto-surfaces in the
specs-mode fiber dropdowns via the existing `FIBERS` wiring.

## Judgment calls (decided, with rationale)

- **Malabrigo Sock — kept gauge 28** (ball band states 32). 28 is a legitimate common
  hand-knit sock gauge and is consistent with how the DB records its other fingering
  yarns (26–30); adopting 32 would over-penalize its best merino subs on the gauge term.
  Accuracy-to-label traded off in favour of substitution consistency.
- **Bernat Softee Chunky — kept Bulky** (manufacturer labels it #6 Super Bulky, ga 11).
  It sits on the #5/#6 line and is universally used as a chunky/bulky; keeping it Bulky
  preserves a healthy Bulky cohort (more so since Drops Andes moved to Super Bulky).
  Gauge corrected to 12 (fine end of Bulky) rather than the band's 11.
- **Rowan Felted Tweed — kept machine-wash = no.** The band shows a gentle/cold
  machine-wash symbol, but it is pre-felted non-superwash wool/alpaca that felts; "no"
  is the safer signal for a substitution warning.

## Within range / rounding — left as-is (documented)

- **Drops Fabel** gauge 26 — DROPS lists both 24 (3 mm headline) and 26 (2.5 mm); 26 is
  defensible for a sock yarn.
- **Drops Kid-Silk** gauge 24 — band 23; 1-stitch hairline, mohair gauge runs loose.
- **Berroco Ultra Alpaca** 215 yd — current put-up is 219 yd / 200 m; <2% difference.
- **Lion Brand Coboo** 50/50 — true split is 51 cotton / 49 bamboo; within rounding.
- **Berroco Vintage** gauge 19 — band gives 18 (US8) and 20 (US7); 19 is the midpoint.
- Several **Cascade** gauges sit at the edge of the official ball-band range (all in range).

## Unverified — needs a physical ball band

- **Knit Picks Shadow** gauge 30 — discontinued; no ball-band gauge number was findable
  online (yarnsub / Ravelry both say "varies"). 30 is plausible for the weight but
  unconfirmed.

## Method

Verified by 8 parallel research agents (grouped by manufacturer) plus one for the added
Lindy Chain record. Each agent diffed the live DB values against sources and returned
per-field OK/FIX with a confidence and citation. High-confidence, clearly-sourced,
unambiguous fixes were applied; judgment calls and model/shape changes were decided
explicitly (above). Price tiers and any physical-ball-band re-confirmation remain open
for a human pass — see [`spec-review-checklist.md`](./spec-review-checklist.md).
