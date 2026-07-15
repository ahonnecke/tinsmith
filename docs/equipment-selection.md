# Equipment Selection Pipeline

How the calculation route selects real AHRI equipment and builds good/better/best packages.

## Data Flow

```
POST /api/calculations { projectId }
  │
  ├─ Fetch project → equipment_selections (which types to query)
  ├─ Fetch ALL dwelling units with load_data
  │
  ├─ For each unit:
  │     ├─ Extract peak cooling/heating from Manual J loads
  │     ├─ selectEquipment()
  │     │     ├─ Query equipment_ac or equipment_hp by capacity range
  │     │     │     └─ ACCA Manual S: 90-125% of peak load
  │     │     ├─ Sort candidates by SEER ascending
  │     │     ├─ Pick tiers: good (low), better (median), best (high)
  │     │     ├─ Look up manufacturer names from equipment_clg_mfr
  │     │     ├─ Estimate moisture balance per tier
  │     │     └─ Estimate annual cost + comfort score
  │     └─ Store results in `results` table (linked via dwelling_unit_id)
  │
  ├─ Partial success: some units can fail while others succeed
  └─ Return calculation record + per-unit summary
```

## Key Files

| File | Purpose |
|------|---------|
| `app/src/lib/equipment-selection.ts` | Core selection logic: DB queries, ranking, moisture estimates |
| `app/src/app/api/calculations/route.ts` | POST handler that orchestrates the pipeline |
| `app/src/app/api/equipment/route.ts` | Generic equipment search API (UI-facing) |
| `app/src/app/api/equipment/stats/route.ts` | Aggregate stats per equipment type |
| `app/src/app/api/equipment/manufacturers/route.ts` | Manufacturer list with counts |
| `etl/etl.py` | SQLite → Postgres ETL for AHRI data |
| `etl/validate.py` | 4-layer import validation |

## Equipment Tables Queried

- **equipment_ac** — Central AC units (4M+ records full, 10K subset). Columns: manufacturer, condenser_model, coil_model, capacity, seer, eer95, classification, stages
- **equipment_hp** — Heat pumps (1.2M+ full). Adds: hspf, high_capacity, low_capacity, high_cop, low_cop
- **equipment_furnace** — Gas/oil furnaces (22K). Columns: output_btu, afue, fuel
- **equipment_boiler** — Boilers (4K). Same as furnace

## Capacity Sizing

⚠️ **Provisional — not ACCA Manual S.** The window lives in one place,
`app/src/domains/sizing/config.ts` → `MATCH_WINDOW`, shared with the coarse
matcher (`sizing/match.ts`):

```
minCapacity = peakCooling * MATCH_WINDOW.coolingMin   // 0.95
maxCapacity = peakCooling * MATCH_WINDOW.coolingMax   // 1.15
```

If no equipment falls in this range, the query widens to
`MATCH_WINDOW.wideningFloor` (80%) of peak with no upper bound.

This file previously documented a 90–125% window attributed to ACCA Manual S.
That attribution was false: those exact percentages were **refuted** during
source verification (see [sizing-methodology.md](sizing-methodology.md) →
"Open items"), and the value also silently disagreed with the coarse matcher's
own window. Authoritative limits live in Manual S **Section N2** and require the
licensed book — until then this window is a labelled rule of thumb.

## Tier Assignment

Candidates sorted by SEER ascending:
- **Good** = index 0 (lowest efficiency that meets capacity)
- **Better** = index N/2 (median efficiency)
- **Best** = index N-1 (highest efficiency)

Each tier gets a different default ventilation recommendation:
- Good → Exhaust-only (bath fans)
- Better → HRV (Heat Recovery Ventilator)
- Best → ERV (Energy Recovery Ventilator)

## Moisture Balance

Simplified calculation using standard engineering factors:

**Water In** (pints/day):
- Occupant respiration: 2.1 × occupants
- Cooking/bathing: 4.1 (household baseline)
- Infiltration: 5.8 (typical tight MF)
- Ventilation: 8.4 (ASHRAE 62.2 rate)

**Water Out**:
- AC latent removal: runtime × 24h × latent_capacity / 1054 BTU/pint
- Exhaust (bath/kitchen): 1.8
- Supplemental dehu: added at 120% of deficit if water_in > water_out

## Annual Cost Estimate

```
cooling_kWh = (peakCooling × 1000 full-load hours) / (SEER × 1000)
heating_kWh = (peakHeating × 1500 full-load hours) / (HSPF × 1000)
annualCost  = (cooling_kWh + heating_kWh) × $0.12/kWh
```

## Comfort Score (0-100)

- Base: 50 (meets loads)
- +15 if moisture balance passes
- Up to +20 for SEER above 14 baseline (3 pts per SEER point)
- Up to +15 for HSPF above 7.5 baseline (3 pts per HSPF point)

## Future Improvements

1. **Combinatorial search**: Query both cooling (AC/HP) and heating (furnace/boiler) tables, assemble all valid pairs
2. **Real interpolation**: Use AHRI rated data points to interpolate capacity at actual design temperature (not just rated conditions)
3. **ERV/HRV effectiveness**: Factor ventilation equipment moisture recovery into the balance
4. **Install cost integration**: Add equipment install cost data for ROI calculations
