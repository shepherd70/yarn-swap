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

## Tracker-19 thin-cell additions (June 2026)

A follow-on pass added **6 ball-band-verified yarns (54 → 60)** to fill the sparsest
weight/texture cells (Bulky & Lace depth, more Aran, a 2nd/3rd tweed), researched the
same way — manufacturer pages first, Ravelry/yarnsub cross-checks, via two focused agents.

| Added | Weight / texture | Fiber | yds/g · ga | Source |
|-------|------------------|-------|------------|--------|
| Tahki Donegal Tweed | Aran / tweed | 100% wool | 183/100 · 18 | yarn.com, Ravelry |
| Drops Soft Tweed | DK / tweed | 50 merino / 25 alpaca / 25 viscose | 142/50 · 21 | garnstudio.com, Ravelry |
| Cascade 128 Superwash | Bulky / smooth | 100% superwash merino | 128/100 · 14 | cascadeyarns.com |
| Malabrigo Chunky | Bulky / smooth | 100% merino | 104/100 · 14 | malabrigoyarn.com |
| Drops Lace | Lace / smooth | 70 baby alpaca / 30 silk | 437/50 · 28 | garnstudio.com, yarnsub |
| Stylecraft Special Aran | Aran / smooth | 100% acrylic | 214/100 · 18 | Wool Warehouse, LoveCrafts |

**Judgment calls**
- **Drops Soft Tweed — DK, not Aran.** Ball-band gauge is 21 sts/4 in (DK); fiber recorded
  as `merino` (band reads "Merino Wool"). Gives the DK Felted Tweed a same-weight tweed twin.
- **Malabrigo Chunky — `mw:false`, smooth.** 100% merino but *not* superwash (hand wash),
  unlike the superwash Rios already in the DB; 3-ply, so smooth (not roving).
- **Drops Lace — gauge 28, not the band's 23.** DROPS prints a loose 23-st shawl tension; 28
  reflects typical laceweight gauge and matches its grist-twin Knit Picks Shadow, so the
  matcher pairs them instead of over-penalizing the gauge term.

**Considered but rejected (to keep the data honest)**
- **Berroco Modern Cotton, Cascade Sarasota** — both plied/smooth on inspection, not the
  chainette they're sometimes assumed to be; would only pad already-dense cells.
- **Patons Classic Wool Roving** — discontinued (clearance only); a poor thing to *recommend*.
- **DROPS Brushed Alpaca Silk** — weight class genuinely ambiguous (Lace by grist vs Aran by
  ball-band gauge); would be a scoring outlier wherever placed.

**Residual:** chainette stays a single fingering entry (Lindy Chain) — a fine-weight chainette
to pair with it is rare, and a heavier one would be weight-excluded anyway.
