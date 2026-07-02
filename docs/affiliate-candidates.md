# Affiliate candidates — June 2026 (tracker 26)

Research pass to identify Canadian (and Canada-shipping) yarn retailers that run affiliate
programs, so the affiliate hook in `buyLinks()` (`scoring.js`) can be filled with real,
revenue-bearing links. Companion record to tracker 26 (region-aware buy links). Researched
**2026-06-27** against each program's own affiliate page plus the underlying networks
(Commission Junction, Awin, ShareASale, Impact, Amazon Associates). Affiliate terms drift —
re-verify rates, networks, and merchant IDs before signing up.

**Key finding:** all three retailers already in `RETAILERS.CA` (Yarnspirations, Mary Maxim,
Amazon.ca) run affiliate programs — the empty `affiliate` slots can be filled today.
**Michaels Canada** is the strongest net-new Canadian addition.

**Integration catch:** the original hook appended a query param (`url += "?" + affiliate`),
which only fits Amazon Associates (`tag=`). CJ / Awin / ShareASale / Impact require
*deep-linking* — wrapping the destination inside a network redirect URL — so they need the
`affiliateUrl()` wrapper in `buyLinks()` (tracker 26), not just a tag string. See
[Network integration notes](#network-integration-notes).

## Recommended — Canadian-native (CAD, ships within Canada)

| Retailer | Domain | Network | Commission | Cookie | Status |
|----------|--------|---------|-----------:|:------:|--------|
| Yarnspirations | yarnspirations.com | Commission Junction | up to 8% | 30 d | in CA list — slot empty |
| Mary Maxim | marymaxim.ca | Awin (MID 40388) | 5% | 15 d | in CA list — slot empty |
| Amazon.ca | amazon.ca | Amazon Associates (CA) | category-based | 24 h¹ | in CA list — slot empty |
| **Michaels Canada** | canada.michaels.com | Commission Junction² | up to 10% | 1 d | **add** |

¹ 24 h click cookie, extends to 90 d if the item is added to cart.
² Also surfaced via FlexOffers / FMTC sub-networks; the primary network is CJ.

Search URLs verified live (2026-06-27): Michaels Canada uses `…/search?q=` (same endpoint as
the US site; the `q=` param is confirmed on `canada.michaels.com`). As a general craft catalog
it gets the extra `yarn` keyword, mirroring the Amazon entries.

## Ships to Canada, prices in USD (viable — currency caveat)

| Retailer | Domain | Network | Commission | Notes |
|----------|--------|---------|-----------:|-------|
| Knit Picks / WeCrochet | knitpicks.com / wecrochet.com | ShareASale (m 59159) | 10% | House-brand value yarns; great for budget subs. Two storefronts (knit / crochet). |
| Lion Brand | lionbrand.com | ShareASale (hist. Impact) | — | Major brand, ships CA in USD. |
| Premier Yarns | premieryarns.com | Impact | 10% | Spinrite-owned → brands redundant with Yarnspirations in CAD. Lowest priority. |

## Already in US list — also serve Canada in CAD (cross-list candidates)

| Retailer | Network | Commission | Cookie | Note |
|----------|---------|-----------:|:------:|------|
| LoveCrafts | Awin (+ direct) | up to 15% | 30 d | Has `/en-ca` CAD storefront; ships to Canada. |
| Hobbii | Commission Junction | 8% | 14 d | CAD storefront, ships to Canada. |

Both are currently US-only in the config but legitimately belong in `RETAILERS.CA` too.

## Network integration notes

How a destination URL becomes a tracked link, per network. Publisher IDs live in
`AFFILIATE_IDS` (`scoring.js`) and start empty — every branch returns the plain URL until an
ID is dropped in, so links never break.

- **Amazon Associates** — append `?tag=<store-id>`. Region-specific: a `.ca` tag for
  `amazon.ca`, a `.com` tag for `amazon.com`. The only network that fits a query-param hook. ✅ format verified.
- **Awin** — wrap: `https://www.awin1.com/cread.php?awinmid=<MID>&awinaffid=<AFFID>&ued=<encoded-url>`.
  Per-merchant `MID` + your global publisher `AFFID`. (Mary Maxim MID **40388**; LoveCrafts also on Awin — MID TBD.) ✅ format verified.
- **Commission Junction (CJ)** — wrap via a CJ redirect domain (`anrdoezrs.net` et al.) with the
  destination in the path/`url=`, using your PID. ⚠️ exact automated-deep-link format + any
  advertiser link ID must be confirmed in the CJ dashboard once joined. (Yarnspirations, Michaels Canada, Hobbii.)
- **ShareASale** — wrap: `https://shareasale.com/r.cfm?u=<userid>&m=<merchant>&urllink=<encoded-url>`.
  ⚠️ confirm banner/creative requirement in the dashboard. (Knit Picks m **59159**.)
- **Impact** — per-advertiser branded tracking domain; least generalizable. (Premier Yarns, Lion Brand.)

**Practical consolidation:** signing up for **CJ + Awin + ShareASale + Amazon Associates**
covers every retailer here except Premier Yarns (Impact-only).

## Checked and dropped

| Candidate | Reason |
|-----------|--------|
| Wool Warehouse | No affiliate program on any major network. |
| TheYarnGuy (theyarnguy.com) | Canadian / CAD, but no affiliate or referral program. |
| Yarn Canada (yarncanada.ca) | No program found. |
| Fillory Yarn | UpPromote program, but US-based (not CAD-native). |
| ~200 small Canadian LYS | Almost all Shopify shops with no affiliate program. |

## Status

Doc + code scaffold. Tracker-26 code lands the network metadata on every retailer record and
the `affiliateUrl()` wrapper (Amazon + Awin formats live; CJ / ShareASale / Impact scaffolded,
guarded off until verified). **Still to obtain:** real publisher IDs — CJ PID, Awin AFFID,
ShareASale user ID, Amazon Associates tags (per marketplace) — then re-verify each link format
before flipping on.

## Sources

- [Yarnspirations affiliate program](https://www.yarnspirations.com/pages/affiliate-program)
- [Mary Maxim affiliate program (Awin)](https://www.marymaxim.ca/pages/mary-maxim-affiliate-program)
- [Michaels Canada affiliate — FlexOffers](https://www.flexoffers.com/affiliate-programs/michaels-canada-affiliate-program/) · [getlasso details](https://getlasso.co/affiliate/michaels-canada/)
- [Hobbii affiliate (CJ) — getlasso](https://getlasso.co/affiliate/hobbii/)
- [LoveCrafts affiliate program](https://affiliate.lovecrafts.com/)
- [Knit Picks on ShareASale](https://www.shareasale.com/shareasale.cfm?merchantID=59159) · [WeCrochet / Knit Picks partner page](https://www.knitpicks.com/support/partner-with-us)
- [Lion Brand affiliate info](https://www.lionbrand.com/pages/affiliate-info)
- [Premier Yarns affiliate (Impact)](https://www.premieryarns.com/pages/join-our-affiliate-program)
