# Tinsmith — Furnace & Coil Sizing Methodology

How Tinsmith turns house attributes into a furnace + coil size. This is the
"generational knowledge" the engine encodes. It is industry-standard, published
engineering — **not** proprietary. Source research: deep-research run 2026-06-24
(adversarially verified, primary-source cited).

## The authoritative chain (verified, high confidence)

```
ASHRAE Fundamentals Ch.14   →   ACCA Manual J 8th Ed   →   ACCA Manual S
(design conditions)             (loads from the house)     (equipment selection)
```

1. **Design conditions — ASHRAE Handbook–Fundamentals Ch.14.** Per-station
   percentile design temps:
   - Heating: **99%** (~88 hr/yr below) common residential default; 99.6%
     conservative.
   - Cooling: **1%** (~88 hr/yr above) common default; 0.4% conservative; 2% lenient.
   - Each station gives **three metric pairs** per percentile:
     (a) design dry-bulb + mean coincident wet-bulb → **sensible** loads;
     (b) design wet-bulb + MCDB → evaporative/ventilation;
     (c) design dew-point + humidity ratio + MCDB → **latent** loads.
   - Source: ASHRAE F17 Ch.14 (handbook.ashrae.org/Handbooks/F17/IP/f17_ch14).

2. **Loads — ACCA Manual J 8th Ed (ANSI/ACCA 2 Manual J-2016).** Computes
   sensible + latent heating/cooling loads from: fenestration solar gain (§19),
   opaque conduction (§20), infiltration (§21), internal gains (§22), duct loads
   (§23), engineered ventilation per ASHRAE 62.2 (§24). Code-mandated by IRC
   M1401.3 / IECC. Source: acca.org/standards/technical-manuals/manual-j.

3. **Equipment selection — ACCA Manual S.** Selects equipment from (Manual J
   loads) × (OEM expanded performance data) × (local design conditions). Numeric
   sizing limits live in normative **Section N2 (Equipment Size Limits)**:
   min/max for total cooling, sensible cooling, latent cooling, and heating
   capacity. Source: acca.org/standards/technical-manuals/manual-s.

## Free, software-usable data (no license — ingest directly)

- **RESNET Appendix A** (HVAC Design Temperature Limits, v4): 123-page **per-county**
  Table A-1 — 1% cooling °F, 99% heating °F, HDD/CDD ratio, keyed to named ASHRAE
  weather stations. Directly ingestible as our design-condition dataset.
  (e.g. Autauga County, AL = 96°F cooling / 24°F heating.)
- **EPA/ENERGY STAR Design Temperature Limit Reference Guide (2019)**: same data,
  per-county, stations tagged `(A)` ASHRAE or `(M)` Manual J.
- Binding software constraint both impose: cooling design temp **≤** the 1% value,
  heating design temp **≥** the 99% value.
- **IECC R402 prescriptive tables + RESNET reference-home definitions**: public
  envelope U-factor / SHGC / insulation values by climate zone — usable as
  **coarse-tier envelope defaults** in place of the licensed Manual J tables.

## Open items — require the licensed ACCA books (do NOT guess)

The deep-research adversarial pass **refuted or could not verify** these from free
sources. They are real and authoritative but live in licensed documents:

| Item | Where it lives | Status |
|---|---|---|
| Manual S sizing windows (AC ~90–115%, furnace ~100–140%, HP cooling/heating-dominant rules) | Manual S **Section N2** | ⚠️ Commonly-cited numbers **refuted** in verification — buy the book, don't hardcode rumor |
| Envelope default tables (U/R by vintage, SHGC by glazing/orientation, ACH50 by tightness) | Manual J Tables 4A/4B, 5A, infiltration tables | ⚠️ Not public — use IECC R402/RESNET proxies for coarse tier |
| AHRI-rating → site-capacity interpolation (entering WB + outdoor DB correction) | Manual S + OEM expanded performance data | ⚠️ Principle widely stated, not primary-source verified |
| Authoritative per-sqft BTU/h by climate zone (coarse tier) | — | ⚠️ Rule-of-thumb (~400–600 sqft/ton) only; not authoritative |

**Edition drift:** RESNET/ENERGY STAR cite ASHRAE 2017 HOF; Manual S was
reorganized in the 2024 2nd Ed (normative N-sections retained). Verify section
numbers against the edition we license.

## Implication for the build

- **Coarse (free) tier** can be built **now** from public data: RESNET Appendix A
  design temps + IECC R402 envelope defaults + ASHRAE 62.2 ventilation.
- **Pro (detailed) tier** and the **exact Manual S sizing windows** require
  purchasing **Manual J8 + Manual S** (~$50–100 total) — the legitimate source of
  the exact coefficients. Cheap, and it removes all guessing.
- Coefficient tables are modeled as **swappable config** (per the pluggable engine
  boundary), seeded with public proxies and refined from the licensed books.
