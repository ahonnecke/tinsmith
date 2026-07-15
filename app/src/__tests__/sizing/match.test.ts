import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('@/lib/db', () => ({
  default: { query: (...args: unknown[]) => queryMock(...args) },
}));

// Imported after the mock is registered (vitest hoists vi.mock).
import { matchEquipment } from '@/domains/sizing/match';

/** Route a canned response based on which table the SQL touches. */
function wireDb() {
  queryMock.mockImplementation((sql: string) => {
    if (sql.includes('FROM equipment_ac')) {
      return { rows: [{ manufacturer: 'CARR', condenser_model: '24ACC636', capacity: 36000, seer: 16 }] };
    }
    if (sql.includes('FROM equipment_hp')) {
      return { rows: [{ manufacturer: 'CARR', condenser_model: '25HCB6', capacity: 36000, seer: 18, hspf: 10 }] };
    }
    if (sql.includes('FROM equipment_furnace')) {
      return { rows: [{ manufacturer: 'LENN', model: 'EL296', output_btu: 48000, afue: 96 }] };
    }
    if (sql.includes('equipment_clg_mfr')) {
      return { rows: [{ mfr_code: 'CARR', mfr_name: 'Carrier' }] };
    }
    if (sql.includes('equipment_htg_mfr')) {
      return { rows: [{ mfr_code: 'LENN', mfr_name: 'Lennox' }] };
    }
    return { rows: [] };
  });
}

beforeEach(() => {
  queryMock.mockReset();
  wireDb();
});

describe('matchEquipment', () => {
  it('matches AC + furnace for a central_ac system, resolving manufacturer names', async () => {
    const r = await matchEquipment({ coolingBtuh: 36000, heatingOutputBtuh: 50000, systemType: 'central_ac' });

    expect(r.cooling).toHaveLength(1);
    expect(r.cooling[0]).toMatchObject({
      kind: 'ac', manufacturer: 'Carrier', model: '24ACC636', capacityBtuh: 36000, tons: 3, fitPct: 100,
    });
    expect(r.cooling[0].efficiency.seer).toBe(16);

    expect(r.heating).toHaveLength(1);
    expect(r.heating[0]).toMatchObject({
      kind: 'furnace', manufacturer: 'Lennox', model: 'EL296', capacityBtuh: 48000, tons: null, fitPct: 96,
    });
    expect(r.heating[0].efficiency.afue).toBe(96);
    expect(r.caveats.join(' ')).toMatch(/Manual S/);
  });

  it('uses the heat-pump table and skips the furnace for a heat-pump system', async () => {
    const r = await matchEquipment({ coolingBtuh: 36000, heatingOutputBtuh: 50000, systemType: 'heat_pump' });

    expect(r.cooling[0].kind).toBe('heat_pump');
    expect(r.cooling[0].efficiency.hspf).toBe(10);
    expect(r.heating).toHaveLength(0);
    expect(r.caveats.join(' ')).toMatch(/heating from the same unit/i);
    // no furnace query should have run
    expect(queryMock.mock.calls.some(([sql]) => String(sql).includes('equipment_furnace'))).toBe(false);
  });

  it('returns heating only for a furnace system', async () => {
    const r = await matchEquipment({ coolingBtuh: 36000, heatingOutputBtuh: 50000, systemType: 'furnace' });
    expect(r.cooling).toHaveLength(0);
    expect(r.heating).toHaveLength(1);
    expect(queryMock.mock.calls.some(([sql]) => String(sql).includes('equipment_ac'))).toBe(false);
  });

  it('flags both sides when nothing falls in the sizing window', async () => {
    queryMock.mockImplementation(() => ({ rows: [] }));
    const r = await matchEquipment({ coolingBtuh: 36000, heatingOutputBtuh: 50000, systemType: 'central_ac' });
    expect(r.cooling).toHaveLength(0);
    expect(r.heating).toHaveLength(0);
    expect(r.caveats.join(' ')).toMatch(/No catalog cooling equipment .* for 3 tons/i);
    expect(r.caveats.join(' ')).toMatch(/No catalog furnace .* for 50,000 BTU\/h/i);
  });

  it('explains an empty cooling side even when heating matched', async () => {
    // The thin demo seed tops out at 3 tons, so a large house matches a furnace
    // but no coil. Without a caveat that reads as "no such equipment exists".
    queryMock.mockImplementation((sql: string) =>
      String(sql).includes('equipment_furnace')
        ? { rows: [{ manufacturer: 'Trane', model: 'S9V2B060U3PSA', output_btu: 54880, afue: 98 }] }
        : { rows: [] },
    );
    const r = await matchEquipment({ coolingBtuh: 54000, heatingOutputBtuh: 50000, systemType: 'central_ac' });
    expect(r.heating).toHaveLength(1);
    expect(r.cooling).toHaveLength(0);
    expect(r.caveats.join(' ')).toMatch(/No catalog cooling equipment/i);
    expect(r.caveats.join(' ')).not.toMatch(/No catalog furnace/i);
  });

  it('does not claim a missing furnace for a heat-pump system', async () => {
    queryMock.mockImplementation(() => ({ rows: [] }));
    const r = await matchEquipment({ coolingBtuh: 36000, heatingOutputBtuh: 50000, systemType: 'heat_pump' });
    expect(r.caveats.join(' ')).not.toMatch(/No catalog furnace/i);
  });
});
