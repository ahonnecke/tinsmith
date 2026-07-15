import pool from '@/lib/db';
import { parseJsonb } from '@/domains/shared/jsonb';
import type { Calculation, CalculationWithResult } from './types';

interface CalcWithResultRow {
  id: string;
  project_id: string;
  submitted_by: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  submitted_by_name?: string;
  result_id?: string;
  dwelling_unit_id?: string | null;
  equipment_packages?: string | object | null;
  moisture_balance?: string | object | null;
}

function mapCalcWithResult(row: CalcWithResultRow): CalculationWithResult {
  return {
    ...row,
    equipment_packages: parseJsonb(row.equipment_packages),
    moisture_balance: parseJsonb(row.moisture_balance),
  } as CalculationWithResult;
}

export async function createCalculation(projectId: string, submittedBy: string): Promise<Calculation> {
  const { rows } = await pool.query(
    `INSERT INTO calculations (project_id, submitted_by, status, created_at)
     VALUES ($1,$2,'running',now()) RETURNING *`,
    [projectId, submittedBy]
  );
  return rows[0] as Calculation;
}

export async function updateCalculationStatus(calcId: string, status: 'completed' | 'failed'): Promise<void> {
  await pool.query(
    `UPDATE calculations SET status=$1, completed_at=now() WHERE id=$2`,
    [status, calcId]
  );
}

export async function insertResult(
  calculationId: string,
  dwellingUnitId: string,
  equipmentPackages: object,
  moistureBalance: object,
): Promise<void> {
  await pool.query(
    `INSERT INTO results (calculation_id, dwelling_unit_id, equipment_packages, moisture_balance)
     VALUES ($1,$2,$3,$4)`,
    [calculationId, dwellingUnitId, JSON.stringify(equipmentPackages), JSON.stringify(moistureBalance)]
  );
}

export async function listCalculationsWithResults(projectId: string): Promise<CalculationWithResult[]> {
  const { rows } = await pool.query<CalcWithResultRow>(
    `SELECT c.*, u.name as submitted_by_name,
            r.id as result_id, r.equipment_packages, r.moisture_balance
     FROM calculations c
     LEFT JOIN users u ON c.submitted_by = u.id
     LEFT JOIN results r ON r.calculation_id = c.id
     WHERE c.project_id = $1
     ORDER BY c.created_at DESC`,
    [projectId]
  );
  return rows.map(mapCalcWithResult);
}

export async function getCalculationWithResult(calcId: string, orgId: string): Promise<CalculationWithResult | null> {
  const { rows } = await pool.query<CalcWithResultRow>(
    `SELECT c.*, u.name as submitted_by_name,
            r.id as result_id, r.equipment_packages, r.moisture_balance
     FROM calculations c
     JOIN projects p ON p.id = c.project_id
     LEFT JOIN users u ON c.submitted_by = u.id
     LEFT JOIN results r ON r.calculation_id = c.id
     WHERE c.id=$1 AND p.organization_id=$2`,
    [calcId, orgId]
  );
  return rows[0] ? mapCalcWithResult(rows[0]) : null;
}

export async function getLatestCompletedCalc(projectId: string): Promise<CalculationWithResult | null> {
  const { rows } = await pool.query<CalcWithResultRow>(
    `SELECT c.*, u.name as submitted_by_name,
            r.id as result_id, r.equipment_packages, r.moisture_balance
     FROM calculations c
     LEFT JOIN users u ON c.submitted_by = u.id
     LEFT JOIN results r ON r.calculation_id = c.id
     WHERE c.project_id = $1 AND c.status = 'completed'
     ORDER BY c.created_at DESC LIMIT 1`,
    [projectId]
  );
  return rows[0] ? mapCalcWithResult(rows[0]) : null;
}
