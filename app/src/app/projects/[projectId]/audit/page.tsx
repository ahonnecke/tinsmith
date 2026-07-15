import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project } from '@/lib/types';
import Header from '@/components/layout/Header';

interface AuditRow {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

interface CalcRow {
  id: string;
  submitted_by_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  submit_calculation: 'Submitted calculation',
  clone_unit: 'Cloned dwelling unit',
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'Project',
  dwelling_unit: 'Dwelling Unit',
  calculation: 'Calculation',
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  completed: { className: 'badge-pass', label: 'Completed' },
  running: { className: 'badge-processing', label: 'Running' },
  failed: { className: 'badge-fail', label: 'Failed' },
};

export default async function AuditPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  const projResult = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  if (!projResult.rows[0]) notFound();

  // Calculation runs
  const calcsResult = await pool.query<CalcRow>(
    `SELECT c.id, c.status, c.created_at, c.completed_at, u.name as submitted_by_name
     FROM calculations c
     LEFT JOIN users u ON c.submitted_by = u.id
     WHERE c.project_id = $1
     ORDER BY c.created_at DESC`,
    [projectId]
  );

  // Audit log entries for this project and its entities
  const auditResult = await pool.query<AuditRow>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, u.name as user_name
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     WHERE a.entity_id = $1
        OR a.entity_id IN (SELECT id FROM calculations WHERE project_id = $1)
        OR a.entity_id IN (SELECT id FROM dwelling_units WHERE project_id = $1)
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [projectId]
  );

  return (
    <>
      <Header title="Audit Trail" user={user} />
      <div className="content">

        {/* Calculation Runs */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Calculation Runs</div>
              <div className="card-subtitle">{calcsResult.rows.length} run(s) for this project</div>
            </div>
          </div>
          {calcsResult.rows.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Run #</th>
                    <th>Status</th>
                    <th>Submitted By</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {calcsResult.rows.map((calc, i) => {
                    const badge = STATUS_BADGE[calc.status] || { className: '', label: calc.status };
                    const started = new Date(calc.created_at);
                    const completed = calc.completed_at ? new Date(calc.completed_at) : null;
                    const durationMs = completed ? completed.getTime() - started.getTime() : null;
                    const durationStr = durationMs != null
                      ? durationMs < 1000 ? '<1s' : `${Math.round(durationMs / 1000)}s`
                      : '—';

                    return (
                      <tr key={calc.id}>
                        <td><strong>#{calcsResult.rows.length - i}</strong></td>
                        <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                        <td>{calc.submitted_by_name || '—'}</td>
                        <td>{started.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{completed ? completed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>{durationStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted" style={{ padding: '20px 16px' }}>No calculations have been run yet.</p>
          )}
        </div>

        {/* Activity Log */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Activity Log</div>
              <div className="card-subtitle">Recent actions on this project</div>
            </div>
          </div>
          {auditResult.rows.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditResult.rows.map(row => (
                    <tr key={row.id}>
                      <td>{ACTION_LABELS[row.action] || row.action}</td>
                      <td>{ENTITY_LABELS[row.entity_type] || row.entity_type}</td>
                      <td>{row.user_name || '—'}</td>
                      <td>{new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted" style={{ padding: '20px 16px' }}>No activity recorded yet.</p>
          )}
        </div>

        <div className="flex-between mt-6">
          <Link href={`/projects/${projectId}/results`} className="btn btn-secondary">&larr; Back to Results</Link>
        </div>
      </div>
    </>
  );
}
