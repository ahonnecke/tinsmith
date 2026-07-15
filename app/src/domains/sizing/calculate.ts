/**
 * Coarse furnace + coil sizing engine (free tier).
 *
 * Pipeline: house attributes -> design-day loads -> equipment size.
 * Transparent rule-of-thumb model; all coefficients are in ./config. Output is
 * always flagged provisional with accuracy caveats. See docs/sizing-methodology.md.
 */
import type { ClimateZone, DesignConditions, SizingInput, SizingResult } from './types';
import type { WizardAnswers } from '../estimate/types';
import {
  ABSOLUTE_ZERO_GUARD,
  ASHRAE_STATION_SOURCE,
  COARSE_CAVEATS,
  COARSE_SOURCES,
  COOLING_NOT_SCALED_CAVEAT,
  SIZING_WINDOW,
  ZONE_DEFAULT_SOURCE,
  designConditions,
  insulationMultiplier,
  loadFactors,
  vintageMultiplier,
  zoneReferenceHeatingDeltaT,
} from './config';

/** Round to a realistic nominal cooling increment (half-ton = 6,000 BTU/h). */
function roundCooling(btuh: number): number {
  return Math.round(btuh / 6000) * 6000;
}

/** Round heating output to the nearest 5,000 BTU/h nominal step. */
function roundHeating(btuh: number): number {
  return Math.round(btuh / 5000) * 5000;
}

/**
 * How much the site's heating design ΔT departs from the ΔT that the zone's
 * rule-of-thumb load factor is calibrated at.
 *
 * Design heating load is essentially all envelope conduction + infiltration —
 * Manual J credits neither solar nor internal gain at the heating design hour —
 * so it follows the UA·ΔT form and scales linearly with ΔT. That makes this
 * ratio a physical correction, not a fitted coefficient: a zone-4 house in a
 * 5°F locale needs more furnace than one in a 30°F locale, and the zone factor
 * alone cannot see the difference.
 *
 * Cooling gets no equivalent treatment on purpose — see COOLING_NOT_SCALED_CAVEAT.
 */
function heatingDeltaTRatio(design: DesignConditions, zone: ClimateZone): number {
  const siteDeltaT = design.indoorHeatingSetpoint - design.heating99Pct;
  const referenceDeltaT = zoneReferenceHeatingDeltaT(zone);
  if (siteDeltaT <= ABSOLUTE_ZERO_GUARD || referenceDeltaT <= ABSOLUTE_ZERO_GUARD) return 1;
  return siteDeltaT / referenceDeltaT;
}

function sourcesFor(design: DesignConditions): string[] {
  return [
    ...COARSE_SOURCES,
    design.source === 'zone-default' ? ZONE_DEFAULT_SOURCE : ASHRAE_STATION_SOURCE,
  ];
}

function designCaveats(design: DesignConditions): string[] {
  switch (design.source) {
    case 'ashrae-station':
      return [COOLING_NOT_SCALED_CAVEAT];
    case 'state-fallback':
      return [
        `Per-station ASHRAE lookup was unavailable — heating design temperature is a state-level estimate for ${design.stationName ?? 'this state'}.`,
        COOLING_NOT_SCALED_CAVEAT,
      ];
    case 'zone-default':
      return [
        'Design temperatures are representative for the whole climate zone, not this site. Provide a location for per-station ASHRAE design conditions.',
      ];
  }
}

export function calculateSizing(input: SizingInput, extraCaveats: string[] = []): SizingResult {
  const { floorAreaSqft, climateZone, insulationTier } = input;
  const factors = loadFactors(climateZone);
  const envelope = insulationMultiplier(insulationTier) * vintageMultiplier(input.yearBuilt);
  const design = input.design ?? designConditions(climateZone);

  // Heating tracks the site's actual design ΔT; cooling stays on the zone factor.
  const heatingBtuh =
    floorAreaSqft * factors.heating * envelope * heatingDeltaTRatio(design, climateZone);
  const coolingTotalBtuh = floorAreaSqft * factors.cooling * envelope;
  const coolingSensibleBtuh = coolingTotalBtuh * factors.sensibleHeatRatio;
  const coolingLatentBtuh = coolingTotalBtuh - coolingSensibleBtuh;

  const heatingOutputBtuh = roundHeating(heatingBtuh * SIZING_WINDOW.heatingFraction);
  const coolingBtuh = roundCooling(coolingTotalBtuh * SIZING_WINDOW.coolingMaxFraction);

  return {
    loads: {
      heatingBtuh: Math.round(heatingBtuh),
      coolingSensibleBtuh: Math.round(coolingSensibleBtuh),
      coolingLatentBtuh: Math.round(coolingLatentBtuh),
      coolingTotalBtuh: Math.round(coolingTotalBtuh),
    },
    equipment: {
      heatingOutputBtuh,
      coolingBtuh,
      coolingTons: coolingBtuh / 12000,
    },
    design,
    provisional: true,
    caveats: [...COARSE_CAVEATS, ...designCaveats(design), ...extraCaveats],
    sources: sourcesFor(design),
  };
}

const DEFAULT_CLIMATE_ZONE: ClimateZone = 4; // mixed; used when location is unknown

function asClimateZone(value: number | null | undefined): ClimateZone | null {
  return value && value >= 1 && value <= 8 ? (value as ClimateZone) : null;
}

/**
 * Adapt the public estimate wizard answers into a sizing run. Climate zone comes
 * from the wizard (homeDetails.climateZone); an explicit override wins; absent
 * both we default to zone 4 and append a caveat.
 *
 * `design` carries real per-station conditions when the caller has resolved the
 * site's location; without it the engine uses the zone's representative pair and
 * says so in the caveats.
 */
export function sizingFromWizard(
  answers: WizardAnswers,
  climateZone?: ClimateZone,
  design?: DesignConditions,
): SizingResult {
  const sqft = answers.homeDetails.squareFootage ?? 2000;
  const zone = climateZone ?? asClimateZone(answers.homeDetails.climateZone);
  const extra = zone
    ? []
    : [`No location provided — assumed IECC climate zone ${DEFAULT_CLIMATE_ZONE} (mixed). Pick a region for a zone-specific estimate.`];

  return calculateSizing(
    {
      floorAreaSqft: sqft,
      climateZone: zone ?? DEFAULT_CLIMATE_ZONE,
      insulationTier: answers.homeDetails.insulationQuality ?? 'average',
      yearBuilt: answers.homeDetails.yearBuilt,
      stories: answers.homeDetails.stories,
      design,
    },
    extra,
  );
}
