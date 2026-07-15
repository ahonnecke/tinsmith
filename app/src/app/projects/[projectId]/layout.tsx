import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project } from '@/lib/types';
import Sidebar from '@/components/layout/Sidebar';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  const { projectId } = await params;

  const result = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user?.organization_id]
  );
  const project = result.rows[0];
  if (!project) notFound();

  // Determine header title from pathname is not possible in server component,
  // so each page renders its own header title — we just provide the shell here.
  return (
    <div className="layout">
      <Sidebar projectId={projectId} projectName={project.name} />
      <div className="main">
        {children}
      </div>
    </div>
  );
}
