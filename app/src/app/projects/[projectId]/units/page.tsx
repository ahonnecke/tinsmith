import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project, DwellingUnit } from '@/lib/types';
import Header from '@/components/layout/Header';
import UnitsTableClient from './UnitsTableClient';

export default async function UnitsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { projectId } = await params;
  const projResult = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  if (!projResult.rows[0]) notFound();

  const unitsResult = await pool.query<DwellingUnit>(
    'SELECT * FROM dwelling_units WHERE project_id=$1 ORDER BY created_at',
    [projectId]
  );
  const units = unitsResult.rows;

  return (
    <>
      <Header title="Phase 2: Dwelling Units" user={user} />
      <div className="content">
        <UnitsTableClient projectId={projectId} initialUnits={units} />
        <div className="flex-between mt-6">
          <Link href={`/projects/${projectId}/setup`} className="btn btn-secondary">&larr; Project Setup</Link>
          <Link href={`/projects/${projectId}/systems`} className="btn btn-primary">Continue to System Selection &rarr;</Link>
        </div>
      </div>
    </>
  );
}
