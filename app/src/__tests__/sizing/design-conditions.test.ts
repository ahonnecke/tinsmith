import { describe, it, expect } from 'vitest';
import { designConditionsFromWeather } from '@/domains/sizing/design-conditions';
import type { WeatherLookupResult } from '@/domains/weather/ashrae-client';

function lookup(overrides: Partial<WeatherLookupResult> = {}): WeatherLookupResult {
  return {
    station: { name: 'DENVER STAPLETON, CO, USA', id: '724690', elevation: '5289 ft', lat: '39.767 N', lon: '-104.869 W' },
    designConditions: [
      { condition: '1% Cooling', db: 91.4, wb: 59.9, dp: null, hr: null, label: 'Peak cooling design' },
      { condition: '1% Dehu', db: 65.2, wb: null, dp: 59.1, hr: 0.0113, label: 'Peak dehumidification' },
      { condition: '99% Heating', db: 5.1, wb: null, dp: null, hr: null, label: 'Heating design (99%)' },
      { condition: '99.6% Heating', db: -1.4, wb: null, dp: null, hr: null, label: 'Heating design (99.6%)' },
    ],
    allStations: [],
    ...overrides,
  };
}

describe('designConditionsFromWeather', () => {
  it('takes the 1% cooling and 99% heating dry-bulbs from the lookup', () => {
    const d = designConditionsFromWeather(lookup(), 5);
    expect(d?.heating99Pct).toBe(5.1);
    expect(d?.cooling1Pct).toBe(91.4);
  });

  it('marks a real station lookup as ashrae-station and names it', () => {
    const d = designConditionsFromWeather(lookup(), 5);
    expect(d?.source).toBe('ashrae-station');
    expect(d?.stationName).toBe('DENVER STAPLETON, CO, USA');
  });

  it('marks a state fallback distinctly so the caller can caveat it', () => {
    const d = designConditionsFromWeather({ ...lookup(), fallback: true }, 5);
    expect(d?.source).toBe('state-fallback');
  });

  it('keeps the caller-supplied zone and the standard indoor setpoints', () => {
    const d = designConditionsFromWeather(lookup(), 7);
    expect(d?.climateZone).toBe(7);
    expect(d?.indoorHeatingSetpoint).toBe(70);
    expect(d?.indoorCoolingSetpoint).toBe(75);
  });

  it('rejects the lookup when the heating dry-bulb is missing', () => {
    const partial = lookup({
      designConditions: [
        { condition: '1% Cooling', db: 91.4, wb: null, dp: null, hr: null, label: 'Peak cooling design' },
        { condition: '99% Heating', db: null, wb: null, dp: null, hr: null, label: 'Heating design (99%)' },
      ],
    });
    // Half-trusting it would report station provenance on a zone-default temp.
    expect(designConditionsFromWeather(partial, 5)).toBeNull();
  });

  it('rejects the lookup when the cooling dry-bulb is missing', () => {
    const partial = lookup({
      designConditions: [
        { condition: '99% Heating', db: 5.1, wb: null, dp: null, hr: null, label: 'Heating design (99%)' },
      ],
    });
    expect(designConditionsFromWeather(partial, 5)).toBeNull();
  });
});
