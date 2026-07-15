# Tinsmith — Moisture Domain Primer
> Kickoff preparation: concepts and glossary for humid-climate moisture extraction

---

## Why This Software Exists

In dry climates, AC removes enough moisture as a byproduct of cooling. In humid climates (Southeast, Gulf Coast, Mid-Atlantic), **the AC alone often can't keep up with moisture even when the space is thermally comfortable**. The building can be 72°F and feel miserable — or grow mold — because RH is 65%+. This software answers: *for a given building, what combination of equipment keeps both temperature AND moisture in spec?*

---

## The Core Problem: Latent vs. Sensible

All HVAC load is split into two components:

- **Sensible load** — heat you can feel (temperature change). Removed by any cooling coil.
- **Latent load** — moisture in the air (phase change energy). Only removed when air is cooled *below its dew point*, condensing water out.

In Atlanta, a unit might have a sensible load of 8,000 BTU/h but a latent load of 6,000 BTU/h. Standard equipment is sized for sensible. If you oversize for sensible, the AC short-cycles and *barely removes any moisture* — the compressor shuts off before the coil gets cold enough to condense.

---

## The Calculation Chain

```
Manual J  →  Manual S  →  Moisture Balance
(loads)      (equipment    (will RH stay
             sizing)        below 60%?)
```

**Manual J** — the industry-standard residential load calculation procedure (ACCA). Produces sensible + latent loads for each design condition. This software takes Manual J outputs as inputs (the dwelling unit editor tabs).

**Manual S** — equipment selection procedure. Takes Manual J outputs and selects equipment that actually meets the load. Undersizing fails comfort; oversizing fails moisture.

**Moisture balance** — the software's unique contribution. After equipment is selected, it does a pints/day accounting: all moisture sources in vs. all moisture removal paths out. Net must be negative (removing more than entering).

---

## Design Conditions

The software evaluates four conditions pulled from ASHRAE data:

| Condition | What it tests |
|-----------|---------------|
| **1% Cooling** | Peak sensible day (hottest 1% of hours) |
| **1% Dehu** | Peak latent day — often *not* the hottest day, but the most humid |
| **99% Heating** | Coldest 1% of hours |
| **99.6% Heating** | Even colder tail — used for heat pump sizing |

The **1% Dehu** condition is the one most HVAC contractors miss. It's the scenario where it's 80°F outside with high humidity — the AC barely runs (not hot enough to trigger much cooling) but moisture is pouring in.

---

## What the Software Does at Each Step

1. **Project Setup** — pulls ASHRAE design conditions for the ZIP code (DB/WB/DP/HR for all four conditions)
2. **Dwelling Units** — engineer enters Manual J outputs per unit per condition; software computes SHF
3. **System Selection** — engineer picks which ventilation strategies, equipment types, and moisture control approaches to evaluate
4. **Calculation** — for each combination, sizes equipment to meet loads, then runs moisture balance
5. **Results** — ranks packages by energy cost, comfort score, and moisture pass/fail

The **moisture balance pass/fail** is the key differentiator. Many tools do steps 1–4. Step 5 with an explicit pints/day balance is where this earns its keep.

---

## Glossary

**ACH (Air Changes per Hour)**
How many times the entire volume of air in a unit is replaced per hour via infiltration. Lower is tighter. Modern construction targets <0.15 ACH natural.

**Blower door test (CFM50)**
Measures airtightness by depressurizing the home to 50 Pascals and measuring airflow required to maintain it. Lower CFM50 = tighter building. Used to calculate infiltration loads.

**CFIS (Central Fan Integrated Supply)**
Ventilation strategy that uses the existing air handler fan to pull outdoor air through a dedicated duct when the fan runs. Simple but adds latent load when fan runs for ventilation only.

**Comfort score**
Composite metric in this software. Not an industry standard — our ranking of how well a package handles both temperature and moisture.

**Dew point (DP)**
Temperature at which air becomes saturated and water condenses out. If a surface is below dew point, it grows condensation (and potentially mold). Key dehu design target.

**DOAS (Dedicated Outdoor Air System)**
Separate system that handles 100% of ventilation air, pre-conditions it before it enters the space. Premium option; fully decouples ventilation from space conditioning. Marked deferred in MVP-1.

**Dry bulb (DB)**
Ordinary air temperature. What a regular thermometer reads.

**Ducted dehumidifier**
Standalone whole-house dehumidifier connected to ductwork. Pulls air, removes moisture via refrigeration cycle, returns drier (slightly warmer) air. Common solution when AC alone can't handle latent load.

**ERV (Energy Recovery Ventilator)**
Ventilation device with a heat/moisture exchanger core. Transfers both heat *and* moisture between exhaust and supply streams. In humid climates, pre-dries incoming air before it enters the space. Better than HRV in humid climates.

**Exhaust-only**
Simplest ventilation: bath/kitchen fans exhaust air, makeup air infiltrates through leaks. Cheap, uncontrolled. Creates negative pressure that draws in unconditioned humid air.

**Hot gas reheat**
Dehumidification technique where refrigerant from the compressor (hot, high-pressure) is routed through a reheat coil *after* the cooling coil. Air is cooled to remove moisture, then reheated to near room temp. Avoids overcooling while removing moisture. More efficient than resistance reheat.

**HPWH (Heat Pump Water Heater)**
Water heater that operates like a refrigerator, extracting heat from surrounding air. In humid climates, it also *dehumidifies* the space it's in — a useful free credit toward moisture removal.

**HSPF2 (Heating Seasonal Performance Factor 2)**
Heat pump heating efficiency metric (updated test standard). Higher = more efficient. Relevant because heat pumps are the common equipment choice.

**Humidity ratio (W, lb/lb)**
Mass of water vapor per mass of dry air. More precise than RH. Used in psychrometric calculations. Typical humid summer outdoor air: ~0.0158–0.0176 lb/lb.

**HRV (Heat Recovery Ventilator)**
Like ERV but only transfers heat, not moisture. Better for cold climates. Less appropriate for humid climates.

**Infiltration**
Uncontrolled air leakage through the building envelope. Carries outdoor humidity in (and conditioned air out). Both a sensible and latent load.

**Latent load**
Moisture load on the system. Measured in BTU/h (energy to condense water) or pints/day (volume of water removed). The harder problem in humid climates.

**Manual J**
ACCA (Air Conditioning Contractors of America) standard for residential load calculations. The regulatory and design basis. Software implementations include Wrightsoft, Elite RHVAC, CoolCalc.

**Manual S**
ACCA standard for selecting equipment based on Manual J outputs. Prevents the common mistake of oversizing, which causes short-cycling and poor dehumidification.

**Moisture balance**
Pints/day accounting: (occupant respiration + cooking/bathing + infiltration moisture + ventilation moisture) vs. (AC latent removal + dehumidifier capacity + exhaust). Must net negative.

**Overcooling**
Running AC below setpoint to force more latent removal. Works, wastes energy, causes comfort complaints. Indicates equipment mismatch.

**Psychrometrics**
The physics of moist air: relationships between dry bulb, wet bulb, dew point, humidity ratio, enthalpy, and relative humidity. The underlying science. Psychrometric chart is the classic visualization.

**RH (Relative Humidity)**
Moisture content as percentage of air's maximum capacity at that temperature. Target for occupied spaces: 40–60%. Above 60% → mold risk, dust mites, discomfort.

**SEER2 (Seasonal Energy Efficiency Ratio 2)**
Cooling efficiency metric (updated 2023 test standard). BTU of cooling per watt-hour of electricity, seasonally averaged. Higher = more efficient.

**Sensible Heat Fraction (SHF)**
Ratio of sensible load to total load. `SHF = sensible / (sensible + latent)`. Low SHF (e.g., 0.52 on the dehu condition) means latent dominates — the system must dehumidify aggressively. Equipment must match or beat the space SHF.

**Short cycling**
Compressor turns on and off too quickly. Happens when equipment is oversized. The coil never gets cold enough or runs long enough to pull moisture out. Classic mistake in humid climates.

**Wet bulb (WB)**
Temperature measured with a wet-sleeved thermometer. Accounts for evaporative cooling. Combined with dry bulb, fully defines the moisture state of air. Used in ASHRAE design conditions.
