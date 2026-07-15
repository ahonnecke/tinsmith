import pool from '@/lib/db';

export async function getEquipmentStats(query: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(query);
  return rows[0] as Record<string, unknown>;
}

export async function getEquipmentManufacturers(query: string): Promise<{ code: string; name: string; count: number }[]> {
  const { rows } = await pool.query(query);
  return rows as { code: string; name: string; count: number }[];
}
