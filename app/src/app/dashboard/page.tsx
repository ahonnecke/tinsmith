import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import SignOutButton from './SignOutButton';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await pool.query(
    `SELECT p.*, COUNT(du.id)::int as unit_count
     FROM projects p
     LEFT JOIN dwelling_units du ON du.project_id = p.id
     WHERE p.organization_id = $1
     GROUP BY p.id
     ORDER BY p.updated_at DESC`,
    [user.organization_id]
  );
  const projects = result.rows;

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="layout-simple">
      <div className="main">
        <div className="header">
          <div className="header-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            HVAC <span style={{ color: 'var(--blue-500)' }}>3.0</span>
          </div>
          <div className="header-user">
            <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>{user.org_name}</span>
            <span>{user.name}</span>
            <div className="avatar">{initials}</div>
            <SignOutButton />
          </div>
        </div>

        <div className="content">
          <DashboardClient projects={projects} orgName={user.org_name} />
        </div>
      </div>
    </div>
  );
}
