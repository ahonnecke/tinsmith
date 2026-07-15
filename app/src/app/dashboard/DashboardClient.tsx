'use client';

import { useState } from 'react';
import Link from 'next/link';

const STATUS_CLASS: Record<string, string> = {
  completed: 'badge-completed',
  draft: 'badge-draft',
  processing: 'badge-processing',
};

interface ProjectRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: string;
  updated_at: string;
  unit_count: number;
}

interface Props {
  projects: ProjectRow[];
  orgName?: string;
}

export default function DashboardClient({ projects, orgName }: Props) {
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(orgName ?? 'My Organization');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  const filtered = projects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.state && p.state.toLowerCase().includes(q)) ||
      (p.zip_code && p.zip_code.includes(q))
    );
  });

  const totalUnits = projects.reduce((sum, p) => sum + (p.unit_count ?? 0), 0);
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const processingCount = projects.filter(p => p.status === 'processing').length;

  return (
    <>
      {/* Org selector */}
      <div className="flex-between mb-6">
        <div className="flex-center gap-3">
          <select
            className="form-control"
            style={{ width: 200, fontWeight: 600 }}
            value={selectedOrg}
            onChange={e => {
              setSelectedOrg(e.target.value);
              if (e.target.value !== (orgName ?? 'My Organization')) {
                showToast('Organization switching coming in MVP-2');
              }
            }}
          >
            <option>{orgName ?? 'My Organization'}</option>
            <option>Demo Organization</option>
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Total Projects</div>
          <div className="value">{projects.length}</div>
          <div className="sub">{completedCount} completed</div>
        </div>
        <div className="stat-card">
          <div className="label">Dwelling Units</div>
          <div className="value">{totalUnits}</div>
          <div className="sub">across all projects</div>
        </div>
        <div className="stat-card">
          <div className="label">In Progress</div>
          <div className="value">{processingCount}</div>
          <div className="sub">calculations running</div>
        </div>
        <div className="stat-card">
          <div className="label">Completed</div>
          <div className="value">{completedCount}</div>
          <div className="sub">{projects.length > 0 ? Math.round((completedCount / projects.length) * 100) : 0}% of projects</div>
        </div>
      </div>

      {/* Header row with search */}
      <div className="flex-between mb-6">
        <h1 style={{ fontSize: '1.4rem' }}>Projects</h1>
        <div className="flex-center gap-3">
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => showToast('New project wizard coming in MVP-2')}>
            + New Project
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Location</th>
                <th>ZIP</th>
                <th>Units</th>
                <th>Visibility</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.city && p.state ? `${p.city}, ${p.state}` : '\u2014'}</td>
                  <td>{p.zip_code ?? '\u2014'}</td>
                  <td>{p.unit_count ?? 0}</td>
                  <td>
                    <span className="badge badge-draft">Private</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[p.status] ?? 'badge-draft'}`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td>{p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : '\u2014'}</td>
                  <td>
                    <Link href={`/projects/${p.id}/setup`} className="btn btn-sm btn-secondary">Open</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                    No projects match &ldquo;{search}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="toast show">{toast}</div>
      )}
    </>
  );
}
