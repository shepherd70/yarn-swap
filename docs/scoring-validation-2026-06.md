# Scoring validation & retune — June 2026 (tracker 22)

Validated the substitution engine's weights against expert-curated substitutions, then
retuned. Expert source: [yarnsub.com](https://yarnsub.com) (the authoritative
yarn-substitution site), cross-checked for 8 flagship yarns spanning fiber families,
weights, and textures.

## Method

- Computed the engine's top-5 substitutes for every yarn (internal audit) — confirmed no
  regressions from the tracker-30 data corrections; all clusters rank correctly.
- For 8 flagship yarns, compared the engine's top-5 to yarnsub's ranked alternatives
  (read from yarnsub's live, JS-rendered pages) via a per-category research fan-out:
  Cascade 220, Red Heart Super Saver, Lion Brand Wool-Ease (worsteds); Malabrigo Sock,
  Rowan Kidsilk Haze, Cascade Ultra Pima (sock/lace/cotton); Bernat Blanket, Rowan Felted
  Tweed (chenille/tweed).

## Finding

The engine matched expert picks **strongly for clean fiber archetypes** (Cascade 220: 4/5
endorsed; our #2 pick = yarnsub's #1) but **systematically under-weighted fiber family and
texture** for fiber/texture-defined yarns:

- cotton **Ultra Pima** → returned two **wool** yarns in the top-5
- mohair-halo **Kidsilk Haze** → returned smooth merino laces
- chenille **Bernat Blanket** → returned wool single-plies above the real chenille
- tweed **Felted Tweed** → returned smooth acrylics/merinos (yarnsub never lists a smooth
  yarn here — it demoted even an exact-fiber match to 78% purely for not being nubby)

Root cause: the additive terms let structure (weight 32 + thickness 22 + gauge 13) outweigh
fiber (18) and texture (10), so a gauge-perfect but fiber/texture-wrong yarn ranked as a
match. Experts treat fiber family and distinctive texture as near-gates.

## Retune (applied)

A multiplicative **soft-gate** on `score()` (factor ≤ 1, symmetric, 1.0 for identical yarns
so self-match stays 100):

- **fiber family**: disjoint families (wool vs cotton) keep `FAMILY_FLOOR` = 0.65.
- **distinctive texture**: when either side is non-smooth, a texture mismatch keeps
  `TEXTURE_FLOOR` = 0.60 (matching/near textures keep ~1).

Result — every flagged failure fixed, clean archetypes unchanged, all fixtures pass:

| Target | Before | After |
|--------|--------|-------|
| Ultra Pima (cotton) | 2 wool yarns in top-5 | all plant; wool gated out |
| Kidsilk Haze (halo) | smooth laces 67 / 66 | 47 / 46 (below bar); Kid-Silk 96 |
| Bernat Blanket (chenille) | wool rovings over Velvet | Velvet #2; rovings 28 / 23 |
| Felted Tweed (tweed) | synthetic Snuggly #1 | wools lead; synthetic demoted |
| Cascade 220 (archetype) | 100 / 97 / 93 / 92 / 91 | identical |

Locked in by `tests/scoring.test.js` (soft-gate cases) and `tests/substitutions.test.js`.

## Residuals (separate follow-ups — not addressed by this retune)

- **Blend-ratio nuance** (minor, tracker 22): the fiber term still rewards a shared
  *dominant* fiber over a closer *blend ratio* — e.g. pure-acrylic edges a better 80/20
  match for Lion Brand Wool-Ease. A fiber-similarity refinement would address it.
- **DB coverage** (tracker 19): yarnsub's top picks include yarns not yet in the DB —
  Cascade Noble Cotton, Malabrigo **Mohair** (the true Kidsilk Haze match), Lion Brand 24/7
  Cotton, and real tweed yarns (DROPS Soft Tweed, Knit Picks City Tweed). Adding these would
  give several categories a genuine same-fiber/texture match instead of a gated best-effort.
- **Texture data**: Lion Brand Wool-Ease's defining "woolly haze" is recorded as smooth.
