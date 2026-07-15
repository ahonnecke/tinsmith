import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import { Project } from '@/lib/types';
import Header from '@/components/layout/Header';

export default async function ReportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  const result = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  if (!result.rows[0]) notFound();
  const project = result.rows[0];

  // Check if a completed calculation exists
  const calcResult = await pool.query(
    `SELECT id FROM calculations WHERE project_id=$1 AND status='completed' LIMIT 1`,
    [projectId]
  );
  const hasCalc = calcResult.rows.length > 0;

  return (
    <>
      <Header title="Report / PDF Export" user={user} />
      <div className="content">
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <h2 style={{ marginBottom: 8, color: 'var(--gray-700)' }}>
            {project.name} — PDF Report
          </h2>
          <p className="text-muted mb-6">
            {hasCalc
              ? 'Download a formatted PDF report with load calculations, equipment recommendations, and moisture balance analysis.'
              : 'No completed calculations found. Run a calculation first to generate a report.'}
          </p>
          {hasCalc ? (
            <a
              href={`/api/projects/${projectId}/report`}
              className="btn btn-primary"
              style={{ fontSize: '1rem', padding: '12px 32px' }}
            >
              Download PDF Report
            </a>
          ) : (
            <Link href={`/projects/${projectId}/systems`} className="btn btn-primary">
              Go to System Selection
            </Link>
          )}
          <div className="mt-6">
            <Link href={`/projects/${projectId}/results`} className="btn btn-secondary">&larr; Back to Results</Link>
          </div>
        </div>
      </div>
    </>
  );
}
