import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project, CalculationWithResult, DwellingUnit } from '@/lib/types';
import Header from '@/components/layout/Header';
import ResultsClient from './ResultsClient';

export default async function ResultsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { projectId } = await params;
  const projResult = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  if (!projResult.rows[0]) notFound();

  const calcsResult = await pool.query<CalculationWithResult>(
    `SELECT c.*, u.name as submitted_by_name,
            r.id as result_id, r.dwelling_unit_id, r.equipment_packages, r.moisture_balance
     FROM calculations c
     LEFT JOIN users u ON c.submitted_by = u.id
     LEFT JOIN results r ON r.calculation_id = c.id
     WHERE c.project_id = $1
     ORDER BY c.created_at DESC, r.created_at`,
    [projectId]
  );
  const calculations = calcsResult.rows;

  const unitsResult = await pool.query<DwellingUnit>(
    'SELECT id, name FROM dwelling_units WHERE project_id=$1 ORDER BY created_at',
    [projectId]
  );
  const units = unitsResult.rows;

  return (
    <>
      <Header title="Phase 5: Results" user={user} />
      <div className="content">
        <ResultsClient projectId={projectId} calculations={calculations} units={units} />
      </div>
    </>
  );
}
