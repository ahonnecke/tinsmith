import { describe, it, expect } from 'vitest';
import type {
  Project,
  BuildingParameters,
  LoadCondition,
  MoistureBalance,
} from '@/lib/types';

// These tests verify that the type interfaces are structurally correct
// by asserting that valid objects conform to the expected shape.

describe('Type shape validation', () => {
  it('Project has required fields', () => {
    const project: Project = {
      id: '1',
      organization_id: 'org-1',
      name: 'Test Project',
      address: null,
      city: null,
      state: null,
      zip_code: null,
      building_type: 'Multi-Family',
      num_units: 4,
      stories: 2,
      year_built: 2020,
      weather_station: null,
      design_conditions: null,
      equipment_selections: null,
      status: 'draft',
      created_by: null,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };
    expect(project.id).toBe('1');
    expect(project.status).toBe('draft');
  });

  it('BuildingParameters has HVAC-specific fields', () => {
    const params: BuildingParameters = {
      cfm50: 1200,
      ceilingHeight: 8,
      conditionedVolume: 12000,
      shelterClass: 3,
      terrainClass: 'B',
      ventSystems: 'ERV',
      manualJSoftware: 'Wrightsoft',
      manualJVersion: '2024',
    };
    expect(params.cfm50).toBe(1200);
    expect(params.terrainClass).toBe('B');
  });

  it('LoadCondition captures Manual J load data', () => {
    const load: LoadCondition = {
      total: 24000,
      infiltrationRate: 0.35,
      ventilationRate: 60,
      floorArea: 1500,
      bedrooms: 3,
      designDB: 93,
      indoorDB: 75,
    };
    expect(load.total).toBe(24000);
    expect(load.sensible).toBeUndefined();
  });

  it('MoistureBalance tracks water in/out', () => {
    const balance: MoistureBalance = {
      waterIn: [{ source: 'infiltration', pintsPerDay: 2.5 }],
      waterOut: [{ source: 'AC latent', pintsPerDay: 4.0 }],
      totalIn: 2.5,
      totalOut: 4.0,
      netBalance: -1.5,
      pass: true,
    };
    expect(balance.pass).toBe(true);
    expect(balance.netBalance).toBeLessThan(0);
  });
});
