# Direct product-link verification — June 2026 (tracker 35)

First curation pass for the `PRODUCTS` map in `scoring.js` (direct product-page buy links,
task 35). Scope: **Amazon.ca and Amazon.com** for the 15 mass-market yarns most likely to
have first-party listings (Red Heart / Caron / Bernat / Lily / Patons — the Yarnspirations
family — plus Lion Brand). Specialty brands (Cascade, Malabrigo, Drops, Knit Picks, Rowan,
etc.) were excluded up front: they have no clean first-party Amazon presence, and Knit Picks
and Drops don't sell via Amazon at all. Verified **2026-06** (session of 2026-07-02).

## Method

For each yarn × marketplace, a web search constrained to the marketplace domain surfaced
candidate `/dp/<ASIN>` listings, then each candidate was **fetched live** and accepted only
when (a) the page loaded and (b) its title named the brand + yarn line **without a specific
colorway or multi-pack count** — i.e. a canonical "pick your color" listing, not a child
ASIN for one color. Anything unverifiable (fetch blocked, ambiguous title) was rejected, not
guessed. URLs are stored in the short `https://www.amazon.ca/dp/<ASIN>` form with no query
params (shape enforced by `tests/products.test.js`).

## Key finding — why the seed is small

**Amazon sells yarn lines almost entirely as per-colorway child ASINs.** A color-agnostic
parent listing is the exception, not the rule, and **amazon.com had none at all** for the 15
lines checked (Lion Brand in particular is 100 % per-colorway on both marketplaces). Linking
a shopper to "Wool-Ease, 1 Pack, Oxford Grey" is *worse* than the search fallback, which
shows every colorway — so those cells intentionally stay on search. This limits how far the
Amazon column can ever be curated; the bigger direct-link wins will come from the yarn-store
retailers (Yarnspirations, Mary Maxim, LoveCrafts, Hobbii), whose catalogs have one canonical
page per yarn line. That's the natural next pass.

## Seeded (verified live, clean canonical title)

| Yarn | Marketplace | ASIN | Verified title |
|------|-------------|------|----------------|
| Red Heart Super Saver | Amazon.ca | B0017342OY | RED HEART E300.0369 Super Saver Yarn |
| Lily Sugar'n Cream | Amazon.ca | B01CUX75I4 | Lily Sugar 'N Cream The Original Solid Yarn |
| Lion Brand Wool-Ease Thick & Quick | Amazon.ca | B06Y3YT9RG | Lion Brand Yarn Wool-Ease Thick & Quick Yarn¹ |
| Bernat Baby Blanket | Amazon.ca | B004WQPM60 | Bernat Baby Blanket Yarn Super Bulky 6 Gauge |

¹ Same ASIN carries a colorway-specific title ("… Kale") on amazon.com — the .ca listing
title is clean, but re-check on the next pass that the .ca page still offers a color picker.

## Checked, not seeded

| Yarn | .ca | .com | Reason |
|------|:---:|:----:|--------|
| Caron Simply Soft | ⚠️ | ✗ | .ca candidates unverifiable (fetch blocked); all .com listings colorway-specific |
| Patons Classic Wool Worsted | ⚠️ | ✗ | clean-looking .ca candidate B07QW3K55X unverifiable; on .com it's colorway-titled ("Amaranth") |
| Bernat Blanket | ⚠️ | ✗ | only colorway/pack listings found on both; .ca fetch blocked |
| Bernat Baby Blanket (.com side) | — | ⚠️ | clean candidate B0CGKCHQLB found but fetch-blocked, unverified |
| Bernat Velvet | ✗ | ✗ | per-colorway child ASINs only |
| Bernat Softee Chunky | ✗ | ✗ | per-colorway child ASINs only |
| Red Heart Super Saver (.com side) | — | ✗ | .com resolves the same ASIN to a colorway title ("Cherry Red") |
| Lily Sugar'n Cream (.com side) | — | ✗ | .com resolves the same ASIN to "Aqua Solid" |
| Lion Brand Wool-Ease | ✗ | ✗ | per-colorway child ASINs only |
| Lion Brand Wool-Ease Thick & Quick (.com side) | — | ✗ | per-colorway child ASINs only |
| Lion Brand Heartland / Hue + Me / Truboo / Coboo / Sock-Ease | ✗ | ✗ | per-colorway child ASINs only, both marketplaces |

✗ = confirmed no clean listing · ⚠️ = candidate exists but could not be verified live
(Amazon began returning HTTP 500 to automated fetches partway through the pass — a
rate-limit, not evidence the listings are gone). The ⚠️ cells are the first things to
re-check on the next pass, ideally in a real browser session.

## Re-verification

- Batch date lives in `PRODUCTS_VERIFIED` (`scoring.js`); bump it whenever a batch is
  re-checked. Working sheet: `node scripts/gen-product-checklist.js --force` regenerates
  `docs/product-link-checklist.md` from the current map.
- Amazon links rot when a listing is retired or its twister (color picker) is restructured —
  spot-check the four seeded ASINs on each pass, and re-attempt the ⚠️ rows above.
- Next expansion: Yarnspirations / Mary Maxim / LoveCrafts / Hobbii product pages (one
  canonical page per line — no colorway-ASIN problem), which also carry the higher
  affiliate rates (docs/affiliate-candidates.md).
