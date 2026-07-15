import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project } from '@/lib/types';
import Header from '@/components/layout/Header';
import SystemSelectionClient from './SystemSelectionClient';

export default async function SystemsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { projectId } = await params;
  const result = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  const project = result.rows[0];
  if (!project) notFound();

  return (
    <>
      <Header title="Phase 3: System Selection" user={user} />
      <div className="content">
        <SystemSelectionClient
          projectId={projectId}
          initialSelections={project.equipment_selections ?? { ventilation: [], equipment: [], moisture: [] }}
        />
      </div>
    </>
  );
}
