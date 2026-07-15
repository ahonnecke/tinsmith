/**
 * AHRI equipment matching for the coarse tier.
 *
 * Given a coarse target size (cooling BTU/h + furnace output BTU/h), find real
 * AHRI-listed models whose rated capacity falls in the sizing window. This is a
 * coarse-tier convenience, NOT a Manual S selection (no expanded-performance
 * interpolation to design conditions) — results carry a provisional caveat.
 */
import pool from '@/lib/db';
import { MATCH_WINDOW } from './config';
import type {
  DesiredSystemType,
  EquipmentMatch,
  EquipmentMatchRequest,
  EquipmentMatches,
} from './types';

const LIMIT = 3;

interface CoolingRow {
  manufacturer: string;
  condenser_model: string | null;
  capacity: number | null;
  seer: number | null;
  hspf?: number | null;
}
interface FurnaceRow {
  manufacturer: string;
  model: string | null;
  output_btu: number | null;
  afue: number | null;
}

/** Resolve manufacturer codes to names from a mfr lookup table, in one query. */
async function resolveMfrNames(
  table: 'equipment_clg_mfr' | 'equipment_htg_mfr',
  codes: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(codes.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { rows } = await pool.query<{ mfr_code: string; mfr_name: string }>(
    `SELECT mfr_code, mfr_name FROM ${table} WHERE mfr_code = ANY($1)`,
    [unique],
  );
  return new Map(rows.map((r) => [r.mfr_code, r.mfr_name]));
}

function usesHeatPump(systemType?: DesiredSystemType | null): boolean {
  return systemType === 'heat_pump' || systemType === 'mini_split';
}

async function matchCooling(
  coolingBtuh: number,
  systemType: DesiredSystemType | null | undefined,
): Promise<EquipmentMatch[]> {
  if (coolingBtuh <= 0 || systemType === 'furnace') return [];
  const heatPump = usesHeatPump(systemType);
  const table = heatPump ? 'equipment_hp' : 'equipment_ac';
  const { rows } = await pool.query<CoolingRow>(
    `SELECT manufacturer, condenser_model, capacity, seer${heatPump ? ', hspf' : ''}
     FROM ${table}
     WHERE capacity >= $1 AND capacity <= $2
     ORDER BY seer DESC NULLS LAST
     LIMIT $3`,
    [coolingBtuh * MATCH_WINDOW.coolingMin, coolingBtuh * MATCH_WINDOW.coolingMax, LIMIT],
  );
  const names = await resolveMfrNames('equipment_clg_mfr', rows.map((r) => r.manufacturer));
  return rows.map((r) => ({
    kind: heatPump ? 'heat_pump' : 'ac',
    manufacturer: names.get(r.manufacturer) ?? r.manufacturer,
    model: r.condenser_model ?? '—',
    capacityBtuh: Math.round(r.capacity ?? 0),
    tons: r.capacity ? Math.round((r.capacity / 12000) * 10) / 10 : null,
    efficiency: {
      seer: r.seer ?? undefined,
      hspf: heatPump ? r.hspf ?? undefined : undefined,
    },
    fitPct: r.capacity ? Math.round((r.capacity / coolingBtuh) * 100) : 0,
  }));
}

async function matchHeating(
  heatingOutputBtuh: number,
  systemType: DesiredSystemType | null | undefined,
): Promise<EquipmentMatch[]> {
  // Heat-pump systems provide heating from the same unit — no separate furnace.
  if (heatingOutputBtuh <= 0 || usesHeatPump(systemType)) return [];
  const { rows } = await pool.query<FurnaceRow>(
    `SELECT manufacturer, model, output_btu, afue
     FROM equipment_furnace
     WHERE output_btu >= $1 AND output_btu <= $2
     ORDER BY afue DESC NULLS LAST
     LIMIT $3`,
    [heatingOutputBtuh * MATCH_WINDOW.heatingMin, heatingOutputBtuh * MATCH_WINDOW.heatingMax, LIMIT],
  );
  const names = await resolveMfrNames('equipment_htg_mfr', rows.map((r) => r.manufacturer));
  return rows.map((r) => ({
    kind: 'furnace',
    manufacturer: names.get(r.manufacturer) ?? r.manufacturer,
    model: r.model ?? '—',
    capacityBtuh: Math.round(r.output_btu ?? 0),
    tons: null,
    efficiency: { afue: r.afue ?? undefined },
    fitPct: r.output_btu ? Math.round((r.output_btu / heatingOutputBtuh) * 100) : 0,
  }));
}

export async function matchEquipment(req: EquipmentMatchRequest): Promise<EquipmentMatches> {
  const { coolingBtuh, heatingOutputBtuh, systemType } = req;
  const [cooling, heating] = await Promise.all([
    matchCooling(coolingBtuh, systemType),
    matchHeating(heatingOutputBtuh, systemType),
  ]);

  const caveats = [
    'Matches use the provisional coarse size. Confirm against an ACCA Manual S selection using OEM expanded-performance data before quoting.',
  ];
  if (usesHeatPump(systemType)) {
    caveats.push('Heat-pump systems provide heating from the same unit listed under cooling.');
  }

  // Say why a side came back empty. Previously only the both-empty case was
  // explained, so a house that matched a furnace but no coil showed a silent
  // gap that reads as "no such equipment exists" rather than "catalog is thin".
  const wantedCooling = coolingBtuh > 0 && systemType !== 'furnace';
  const wantedHeating = heatingOutputBtuh > 0 && !usesHeatPump(systemType);
  if (wantedCooling && cooling.length === 0) {
    caveats.push(
      `No catalog cooling equipment fell within the sizing window for ${Math.round(coolingBtuh / 1200) / 10} tons — the equipment database may not cover this capacity.`,
    );
  }
  if (wantedHeating && heating.length === 0) {
    caveats.push(
      `No catalog furnace fell within the sizing window for ${heatingOutputBtuh.toLocaleString('en-US')} BTU/h — the equipment database may not cover this capacity.`,
    );
  }

  return { cooling, heating, caveats };
}
