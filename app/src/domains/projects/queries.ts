import pool from '@/lib/db';
import { parseJsonb } from '@/domains/shared/jsonb';
import type { Project } from './types';

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  building_type: string;
  num_units: number | null;
  stories: number | null;
  year_built: number | null;
  weather_station: string | object | null;
  design_conditions: string | object | null;
  equipment_selections: string | object | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  unit_count?: number;
}

function mapProject(row: ProjectRow): Project {
  return {
    ...row,
    weather_station: parseJsonb(row.weather_station),
    design_conditions: parseJsonb(row.design_conditions),
    equipment_selections: parseJsonb(row.equipment_selections),
  } as Project;
}

export async function listProjects(orgId: string, search: string): Promise<Project[]> {
  const { rows } = await pool.query<ProjectRow>(
    `SELECT p.*,
            u.name as created_by_name,
            (SELECT COUNT(*) FROM dwelling_units du WHERE du.project_id = p.id)::int as unit_count
     FROM projects p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.organization_id = $1
       AND ($2 = '' OR lower(p.name) LIKE lower($3) OR lower(p.city) LIKE lower($3))
     ORDER BY p.updated_at DESC`,
    [orgId, search, `%${search}%`]
  );
  return rows.map(mapProject);
}

export async function getProjectById(projectId: string, orgId: string): Promise<Project | null> {
  const { rows } = await pool.query<ProjectRow>(
    `SELECT p.*, u.name as created_by_name,
            (SELECT COUNT(*) FROM dwelling_units du WHERE du.project_id = p.id)::int as unit_count
     FROM projects p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = $1 AND p.organization_id = $2`,
    [projectId, orgId]
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function createProject(
  orgId: string,
  createdBy: string,
  data: { name: string; address?: string | null; city?: string | null; state?: string | null; zip_code?: string | null; building_type?: string; num_units?: number | null; stories?: number | null; year_built?: number | null },
): Promise<Project> {
  const { rows } = await pool.query<ProjectRow>(
    `INSERT INTO projects (organization_id, name, address, city, state, zip_code, building_type, num_units, stories, year_built, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11)
     RETURNING *`,
    [orgId, data.name, data.address ?? null, data.city ?? null, data.state ?? null, data.zip_code ?? null,
     data.building_type || 'Multi-Family', data.num_units ?? null, data.stories ?? null, data.year_built ?? null, createdBy]
  );
  return mapProject(rows[0]);
}

export async function updateProject(
  projectId: string,
  orgId: string,
  fields: Record<string, unknown>,
): Promise<Project | null> {
  const allowed = ['name','address','city','state','zip_code','building_type','num_units','stories','year_built',
                   'weather_station','design_conditions','equipment_selections','status'];
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
  vals.push(projectId, orgId);

  const { rows } = await pool.query<ProjectRow>(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
    vals
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function deleteProject(projectId: string, orgId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `DELETE FROM projects WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [projectId, orgId]
  );
  return rows.length > 0;
}

export async function projectExists(projectId: string, orgId: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM projects WHERE id=$1 AND organization_id=$2', [projectId, orgId]);
  return rows.length > 0;
}

export async function getProjectRaw(projectId: string, orgId: string): Promise<Project | null> {
  const { rows } = await pool.query<ProjectRow>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, orgId]
  );
  return rows[0] ? mapProject(rows[0]) : null;
}

export async function updateProjectStatus(projectId: string, status: string): Promise<void> {
  await pool.query(
    `UPDATE projects SET status=$1, updated_at=now() WHERE id=$2`,
    [status, projectId]
  );
}
