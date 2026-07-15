import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project } from '@/lib/types';
import Header from '@/components/layout/Header';
import CalculationClient from './CalculationClient';

export default async function CalculationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { projectId } = await params;
  const result = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  if (!result.rows[0]) notFound();

  return (
    <>
      <Header title="Phase 4: Calculation" user={user} />
      <div className="content">
        <CalculationClient projectId={projectId} />
      </div>
    </>
  );
}
