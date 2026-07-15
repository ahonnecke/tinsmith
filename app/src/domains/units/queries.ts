import pool from '@/lib/db';
import { parseJsonb } from '@/domains/shared/jsonb';
import type { DwellingUnit } from './types';

interface DwellingUnitRow {
  id: string;
  project_id: string;
  name: string;
  unit_type: string | null;
  bedrooms: number | null;
  floor_area: number | null;
  building_parameters: string | object | null;
  load_data: string | object | null;
  created_at: string;
  updated_at: string;
}

function mapUnit(row: DwellingUnitRow): DwellingUnit {
  return {
    ...row,
    building_parameters: parseJsonb(row.building_parameters),
    load_data: parseJsonb(row.load_data),
  } as DwellingUnit;
}

export async function listUnits(projectId: string): Promise<DwellingUnit[]> {
  const { rows } = await pool.query<DwellingUnitRow>(
    'SELECT * FROM dwelling_units WHERE project_id=$1 ORDER BY created_at ASC',
    [projectId]
  );
  return rows.map(mapUnit);
}

export async function getUnitById(unitId: string, projectId: string, orgId: string): Promise<DwellingUnit | null> {
  const { rows } = await pool.query<DwellingUnitRow>(
    `SELECT du.* FROM dwelling_units du
     JOIN projects p ON p.id = du.project_id
     WHERE du.id=$1 AND du.project_id=$2 AND p.organization_id=$3`,
    [unitId, projectId, orgId]
  );
  return rows[0] ? mapUnit(rows[0]) : null;
}

export async function createUnit(
  projectId: string,
  data: { name: string; unit_type?: string | null; bedrooms?: number | null; floor_area?: number | null; building_parameters?: object | null; load_data?: object | null },
): Promise<DwellingUnit> {
  const { rows } = await pool.query<DwellingUnitRow>(
    `INSERT INTO dwelling_units (project_id, name, unit_type, bedrooms, floor_area, building_parameters, load_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [projectId, data.name, data.unit_type ?? null, data.bedrooms ?? null, data.floor_area ?? null,
     data.building_parameters ? JSON.stringify(data.building_parameters) : null,
     data.load_data ? JSON.stringify(data.load_data) : null]
  );
  return mapUnit(rows[0]);
}

export async function updateUnit(
  unitId: string,
  projectId: string,
  fields: Record<string, unknown>,
): Promise<DwellingUnit | null> {
  const allowed = ['name','unit_type','bedrooms','floor_area','building_parameters','load_data'];
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${idx++}`);
      vals.push(typeof fields[key] === 'object' && fields[key] !== null ? JSON.stringify(fields[key]) : fields[key]);
    }
  }
  if (sets.length === 0) return null;
  sets.push(`updated_at = now()`);
  vals.push(unitId, projectId);

  const { rows } = await pool.query<DwellingUnitRow>(
    `UPDATE dwelling_units SET ${sets.join(', ')} WHERE id=$${idx++} AND project_id=$${idx} RETURNING *`,
    vals
  );
  return rows[0] ? mapUnit(rows[0]) : null;
}

export async function getUnitsWithLoadData(projectId: string): Promise<DwellingUnit[]> {
  const { rows } = await pool.query<DwellingUnitRow>(
    `SELECT * FROM dwelling_units WHERE project_id = $1 AND load_data IS NOT NULL ORDER BY created_at`,
    [projectId]
  );
  return rows.map(mapUnit);
}
