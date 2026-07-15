import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/with-auth';
import { ok, badRequest } from '@/lib/api-result';

/**
 * GET /api/equipment?type=ac&minCapacity=18000&maxCapacity=36000&minSeer=14&manufacturer=CARR&classification=RCU-A-CB&limit=50&offset=0
 *
 * Search equipment by type with optional filters.
 * Supported types: ac, hp, furnace, boiler, gshp, gwhp, water_heater
 */

interface FilterConfig {
  table: string;
  allowed: string[];
  textSearch: string[];
  numeric: Record<string, string>;
  orderBy: string;
}

const EQUIPMENT_TYPES: Record<string, FilterConfig> = {
  ac: {
    table: 'equipment_ac',
    allowed: ['manufacturer', 'condenser_model', 'coil_model', 'capacity', 'seer', 'classification', 'trade_name', 'sound_level', 'eer95', 'stages', 'coil_manufacturer', 'ah_model'],
    textSearch: ['manufacturer', 'condenser_model', 'coil_model', 'trade_name', 'classification'],
    numeric: {
      minCapacity: 'capacity', maxCapacity: 'capacity',
      minSeer: 'seer', maxSeer: 'seer',
      minEer: 'eer95', maxEer: 'eer95',
      stages: 'stages',
    },
    orderBy: 'seer DESC, capacity',
  },
  hp: {
    table: 'equipment_hp',
    allowed: ['manufacturer', 'condenser_model', 'coil_model', 'capacity', 'seer', 'high_capacity', 'low_capacity', 'high_cop', 'low_cop', 'hspf', 'classification', 'trade_name', 'sound_level', 'eer95', 'stages', 'coil_manufacturer', 'ah_model'],
    textSearch: ['manufacturer', 'condenser_model', 'coil_model', 'trade_name', 'classification'],
    numeric: {
      minCapacity: 'capacity', maxCapacity: 'capacity',
      minSeer: 'seer', maxSeer: 'seer',
      minHspf: 'hspf', maxHspf: 'hspf',
      minCop: 'high_cop',
      stages: 'stages',
    },
    orderBy: 'seer DESC, hspf DESC, capacity',
  },
  furnace: {
    table: 'equipment_furnace',
    allowed: ['manufacturer', 'model', 'input_btu', 'output_btu', 'afue', 'classification', 'trade_name', 'fuel', 'stages', 'clg_cap_min', 'clg_cap_max'],
    textSearch: ['manufacturer', 'model', 'trade_name', 'fuel', 'classification'],
    numeric: {
      minOutput: 'output_btu', maxOutput: 'output_btu',
      minAfue: 'afue', maxAfue: 'afue',
      stages: 'stages',
    },
    orderBy: 'afue DESC, output_btu',
  },
  boiler: {
    table: 'equipment_boiler',
    allowed: ['manufacturer', 'model', 'input_btu', 'output_btu', 'afue', 'classification', 'trade_name', 'fuel', 'stages'],
    textSearch: ['manufacturer', 'model', 'trade_name', 'fuel', 'classification'],
    numeric: {
      minOutput: 'output_btu', maxOutput: 'output_btu',
      minAfue: 'afue', maxAfue: 'afue',
    },
    orderBy: 'afue DESC, output_btu',
  },
  gshp: {
    table: 'equipment_gshp',
    allowed: ['manufacturer', 'model', 'indoor_coil', 'clg_capacity', 'eer', 'htg_capacity', 'cop', 'clg_gpm', 'htg_gpm', 'trade_name'],
    textSearch: ['manufacturer', 'model', 'trade_name'],
    numeric: {
      minClgCapacity: 'clg_capacity', maxClgCapacity: 'clg_capacity',
      minEer: 'eer', minCop: 'cop',
    },
    orderBy: 'eer DESC, clg_capacity',
  },
  water_heater: {
    table: 'equipment_water_heater',
    allowed: ['manufacturer', 'model', 'trade_name', 'application', 'type', 'fuel', 'tank_size', 'input_btu', 'energy_factor', 'efficiency'],
    textSearch: ['manufacturer', 'model', 'trade_name', 'type', 'fuel'],
    numeric: {
      minTankSize: 'tank_size', maxTankSize: 'tank_size',
      minEf: 'energy_factor',
    },
    orderBy: 'energy_factor DESC NULLS LAST, tank_size',
  },
};

export const GET = withAuth(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const type = params.get('type');

  if (!type || !EQUIPMENT_TYPES[type]) {
    return badRequest(`Invalid type. Must be one of: ${Object.keys(EQUIPMENT_TYPES).join(', ')}`);
  }

  const config = EQUIPMENT_TYPES[type];
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIdx = 1;

  for (const col of config.textSearch) {
    const val = params.get(col);
    if (val) {
      conditions.push(`${col} = $${paramIdx++}`);
      values.push(val);
    }
  }

  for (const [qParam, dbCol] of Object.entries(config.numeric)) {
    const val = params.get(qParam);
    if (val) {
      const num = parseFloat(val);
      if (isNaN(num)) continue;
      if (qParam.startsWith('min')) {
        conditions.push(`${dbCol} >= $${paramIdx++}`);
      } else if (qParam.startsWith('max')) {
        conditions.push(`${dbCol} <= $${paramIdx++}`);
      } else {
        conditions.push(`${dbCol} = $${paramIdx++}`);
      }
      values.push(num);
    }
  }

  const q = params.get('q');
  if (q) {
    const searchCols = config.textSearch
      .map(col => `COALESCE(${col}, '')`)
      .join(" || ' ' || ");
    conditions.push(`(${searchCols}) ILIKE $${paramIdx++}`);
    values.push(`%${q}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(parseInt(params.get('limit') || '50'), 200);
  const offset = parseInt(params.get('offset') || '0');

  const countQuery = `SELECT COUNT(*) FROM ${config.table} ${where}`;
  const dataQuery = `SELECT ${config.allowed.join(', ')} FROM ${config.table} ${where} ORDER BY ${config.orderBy} LIMIT ${limit} OFFSET ${offset}`;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(dataQuery, values),
  ]);

  return ok({
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset,
  });
});
