import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project, CalculationWithResult, EquipmentPackages, MoistureBalance } from '@/lib/types';
import Header from '@/components/layout/Header';
import ComparisonClient from './ComparisonClient';

export default async function ComparisonPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  const projResult = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  if (!projResult.rows[0]) notFound();

  // Get latest completed calculation result
  const calcResult = await pool.query<CalculationWithResult>(
    `SELECT c.*, r.equipment_packages, r.moisture_balance
     FROM calculations c
     LEFT JOIN results r ON r.calculation_id = c.id
     WHERE c.project_id = $1 AND c.status = 'completed'
     ORDER BY c.created_at DESC LIMIT 1`,
    [projectId]
  );

  const pkgs = calcResult.rows[0]?.equipment_packages as EquipmentPackages | null;
  const moisture = calcResult.rows[0]?.moisture_balance as MoistureBalance | null;

  return (
    <>
      <Header title="Equipment Comparison" user={user} />
      <div className="content">
        {pkgs ? (
          <ComparisonClient projectId={projectId} pkgs={pkgs} moisture={moisture} />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <h2 style={{ marginBottom: 8, color: 'var(--gray-700)' }}>No Results Available</h2>
            <p className="text-muted mb-6">Run a calculation first to compare equipment packages.</p>
            <Link href={`/projects/${projectId}/systems`} className="btn btn-primary">Go to System Selection</Link>
          </div>
        )}
        <div className="flex-between mt-6">
          <Link href={`/projects/${projectId}/results`} className="btn btn-secondary">&larr; Back to Results</Link>
          <Link href={`/projects/${projectId}/report`} className="btn btn-primary">Export PDF &rarr;</Link>
        </div>
      </div>
    </>
  );
}
