import { describe, it, expect } from 'vitest';
import { calculateSizing, sizingFromWizard } from '@/domains/sizing/calculate';
import { designConditions } from '@/domains/sizing/config';
import type { DesignConditions, SizingInput } from '@/domains/sizing/types';
import { EMPTY_ANSWERS, type WizardAnswers } from '@/domains/estimate/types';

const baseInput: SizingInput = {
  floorAreaSqft: 2000,
  climateZone: 4,
  insulationTier: 'average',
};

/** Station conditions for zone 4, overriding the zone default's 18°F heating. */
function stationDesign(heating99Pct: number): DesignConditions {
  return {
    ...designConditions(4),
    heating99Pct,
    source: 'ashrae-station',
    stationName: 'TEST STATION',
  };
}

describe('calculateSizing — coarse model', () => {
  it('produces the expected loads and equipment for a known input', () => {
    const r = calculateSizing(baseInput);
    // zone 4: heating 25, cooling 24 BTU/h/sqft, SHR 0.8, envelope 1.0
    expect(r.loads.heatingBtuh).toBe(50000);
    expect(r.loads.coolingTotalBtuh).toBe(48000);
    expect(r.loads.coolingSensibleBtuh).toBe(38400);
    expect(r.loads.coolingLatentBtuh).toBe(9600);
    // heating output sized 1.0x to 5000-step; cooling 1.15x to half-ton step
    expect(r.equipment.heatingOutputBtuh).toBe(50000);
    expect(r.equipment.coolingBtuh).toBe(54000); // round(55200 / 6000) * 6000
    expect(r.equipment.coolingTons).toBe(4.5);
  });

  it('is always flagged provisional with caveats and sources', () => {
    const r = calculateSizing(baseInput);
    expect(r.provisional).toBe(true);
    expect(r.caveats.length).toBeGreaterThan(0);
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.caveats.join(' ')).toMatch(/Manual S/i);
  });

  it('colder zones increase heating and decrease cooling load', () => {
    const cold = calculateSizing({ ...baseInput, climateZone: 6 });
    const warm = calculateSizing({ ...baseInput, climateZone: 4 });
    expect(cold.loads.heatingBtuh).toBeGreaterThan(warm.loads.heatingBtuh);
    expect(cold.loads.coolingTotalBtuh).toBeLessThan(warm.loads.coolingTotalBtuh);
  });

  it('poor insulation yields larger loads than good insulation', () => {
    const poor = calculateSizing({ ...baseInput, insulationTier: 'poor' });
    const good = calculateSizing({ ...baseInput, insulationTier: 'good' });
    expect(poor.loads.heatingBtuh).toBeGreaterThan(good.loads.heatingBtuh);
  });

  it('older homes raise loads via the vintage multiplier', () => {
    const old = calculateSizing({ ...baseInput, yearBuilt: 1975 });
    const recent = calculateSizing({ ...baseInput, yearBuilt: 2020 });
    expect(old.loads.heatingBtuh).toBeGreaterThan(recent.loads.heatingBtuh);
  });

  it('sizes cooling to clean half-ton increments', () => {
    const r = calculateSizing({ ...baseInput, floorAreaSqft: 2500 });
    expect(r.equipment.coolingBtuh % 6000).toBe(0);
    expect((r.equipment.coolingTons * 2) % 1).toBe(0); // multiple of 0.5 ton
  });
});

describe('calculateSizing — site design conditions', () => {
  it('uses the zone default when no design conditions are supplied', () => {
    const r = calculateSizing(baseInput);
    expect(r.design.source).toBe('zone-default');
    expect(r.design.heating99Pct).toBe(18); // zone 4 representative
    expect(r.caveats.join(' ')).toMatch(/representative for the whole climate zone/i);
  });

  it('reports the station and its temps when a lookup supplied them', () => {
    const r = calculateSizing({ ...baseInput, design: stationDesign(5) });
    expect(r.design.source).toBe('ashrae-station');
    expect(r.design.stationName).toBe('TEST STATION');
    expect(r.design.heating99Pct).toBe(5);
    expect(r.caveats.join(' ')).not.toMatch(/representative for the whole climate zone/i);
  });

  it('scales heating load with the site design ΔT', () => {
    // Zone 4 reference ΔT = 70 - 18 = 52. A 5°F site is ΔT 65 -> 65/52 = 1.25x.
    const r = calculateSizing({ ...baseInput, design: stationDesign(5) });
    expect(r.loads.heatingBtuh).toBe(62500); // 50000 * 1.25
  });

  it('a milder site than the zone reference lowers the heating load', () => {
    // ΔT 70 - 30 = 40 -> 40/52 ≈ 0.769x
    const r = calculateSizing({ ...baseInput, design: stationDesign(30) });
    expect(r.loads.heatingBtuh).toBeLessThan(50000);
  });

  it('matches the zone default exactly when the site equals the reference temp', () => {
    const r = calculateSizing({ ...baseInput, design: stationDesign(18) });
    expect(r.loads.heatingBtuh).toBe(50000); // ratio is exactly 1
  });

  it('leaves cooling load untouched by the site design temp', () => {
    const cold = calculateSizing({ ...baseInput, design: stationDesign(-10) });
    const mild = calculateSizing({ ...baseInput, design: stationDesign(40) });
    expect(cold.loads.coolingTotalBtuh).toBe(mild.loads.coolingTotalBtuh);
    expect(cold.caveats.join(' ')).toMatch(/solar and internal gain/i);
  });

  it('does not divide by a degenerate ΔT when the site is at the setpoint', () => {
    const r = calculateSizing({ ...baseInput, design: stationDesign(70) });
    expect(Number.isFinite(r.loads.heatingBtuh)).toBe(true);
    expect(r.loads.heatingBtuh).toBe(50000); // guard falls back to a 1.0 ratio
  });

  it('flags a state-level fallback distinctly from a real station', () => {
    const r = calculateSizing({
      ...baseInput,
      design: { ...stationDesign(2), source: 'state-fallback', stationName: 'CO (Estimated)' },
    });
    expect(r.design.source).toBe('state-fallback');
    expect(r.caveats.join(' ')).toMatch(/state-level estimate/i);
    expect(r.sources.join(' ')).not.toMatch(/provide a location/i);
  });
});

describe('sizingFromWizard', () => {
  it('defaults to climate zone 4 and adds a caveat when no location is given', () => {
    const answers: WizardAnswers = {
      ...EMPTY_ANSWERS,
      homeDetails: { ...EMPTY_ANSWERS.homeDetails, squareFootage: 2000, insulationQuality: 'average' },
    };
    const r = sizingFromWizard(answers);
    expect(r.loads.heatingBtuh).toBe(50000); // matches zone-4 base input
    expect(r.caveats.join(' ')).toMatch(/zone 4/i);
  });

  it('falls back to 2000 sqft and average insulation when fields are null', () => {
    const r = sizingFromWizard(EMPTY_ANSWERS);
    expect(r.loads.coolingTotalBtuh).toBe(48000);
  });

  it('reads the climate zone from the wizard answers', () => {
    const answers: WizardAnswers = {
      ...EMPTY_ANSWERS,
      homeDetails: { ...EMPTY_ANSWERS.homeDetails, squareFootage: 2000, climateZone: 6 },
    };
    const r = sizingFromWizard(answers);
    expect(r.design.climateZone).toBe(6);
    expect(r.caveats.join(' ')).not.toMatch(/No location provided/i);
  });

  it('falls back to zone 4 with a caveat for an out-of-range zone', () => {
    const answers: WizardAnswers = {
      ...EMPTY_ANSWERS,
      homeDetails: { ...EMPTY_ANSWERS.homeDetails, squareFootage: 2000, climateZone: 99 },
    };
    const r = sizingFromWizard(answers);
    expect(r.design.climateZone).toBe(4);
    expect(r.caveats.join(' ')).toMatch(/No location provided/i);
  });

  it('honors an explicit climate zone without the location caveat', () => {
    const answers: WizardAnswers = {
      ...EMPTY_ANSWERS,
      homeDetails: { ...EMPTY_ANSWERS.homeDetails, squareFootage: 2000 },
    };
    const r = sizingFromWizard(answers, 6);
    expect(r.design.climateZone).toBe(6);
    expect(r.caveats.join(' ')).not.toMatch(/No location provided/i);
  });
});
