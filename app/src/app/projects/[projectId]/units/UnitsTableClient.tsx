'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DwellingUnit } from '@/lib/types';
import { api } from '@/lib/api-client';

const UNIT_TYPE_BADGE: Record<string, string> = {
  'Lowest Cooling': 'badge-draft',
  'Highest Cooling': 'badge-processing',
  'Highest Heating': 'badge-fail',
};

interface Props {
  projectId: string;
  initialUnits: DwellingUnit[];
}

export default function UnitsTableClient({ projectId, initialUnits }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState('');
  const [cloning, setCloning] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  async function handleClone(unitId: string) {
    setCloning(unitId);
    try {
      const result = await api.units.clone(projectId, unitId);
      if (result.ok) {
        showToast('Unit cloned successfully');
        router.refresh();
      } else {
        showToast('Clone failed');
      }
    } catch {
      showToast('Clone failed');
    }
    setCloning(null);
  }

  async function handleCloneSelected() {
    const ids = Array.from(selected);
    for (const id of ids) {
      await handleClone(id);
    }
    setSelected(new Set());
  }

  const filtered = initialUnits.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.unit_type && u.unit_type.toLowerCase().includes(q))
    );
  });

  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // Determine calc status based on whether load_data exists
  function calcStatus(u: DwellingUnit): 'Completed' | 'Pending' {
    return u.load_data && (u.load_data.cooling1 || u.load_data.heating99) ? 'Completed' : 'Pending';
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Representative Dwelling Units</div>
            <div className="card-subtitle">
              {initialUnits.length} unit{initialUnits.length !== 1 ? 's' : ''} selected to represent the range of load conditions
            </div>
          </div>
          <div className="flex-center gap-2">
            {selected.size > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCloneSelected}
                disabled={cloning !== null}
              >
                Clone Selected ({selected.size})
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => showToast('Share link copied to clipboard')}>
              Share
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => showToast('Add unit wizard coming in MVP-2')}>
              + Add Unit
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <input
            className="search-input"
            type="text"
            placeholder="Search units..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </th>
                <th>Unit Name</th>
                <th>Type</th>
                <th>BR</th>
                <th>Floor Area</th>
                <th>Cooling (1%)</th>
                <th>Heating (99%)</th>
                <th>Calc Status</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const cooling = u.load_data?.cooling1?.total;
                const heating = u.load_data?.heating99?.total;
                const badgeClass = UNIT_TYPE_BADGE[u.unit_type ?? ''] ?? 'badge-draft';
                const status = calcStatus(u);
                return (
                  <tr key={u.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleOne(u.id)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                    </td>
                    <td className="unit-name"><strong>{u.name}</strong></td>
                    <td>
                      {u.unit_type && (
                        <span className={`badge ${badgeClass}`}>{u.unit_type}</span>
                      )}
                    </td>
                    <td>{u.bedrooms ?? '\u2014'}</td>
                    <td>{u.floor_area ? `${u.floor_area.toLocaleString()} ft\u00B2` : '\u2014'}</td>
                    <td>{cooling ? `${cooling.toLocaleString()} BTU/h` : '\u2014'}</td>
                    <td>{heating ? `${heating.toLocaleString()} BTU/h` : '\u2014'}</td>
                    <td>
                      <span className={`badge ${status === 'Completed' ? 'badge-completed' : 'badge-processing'}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        disabled={cloning === u.id}
                        onClick={() => handleClone(u.id)}
                      >
                        {cloning === u.id ? 'Cloning\u2026' : 'Clone'}
                      </button>
                    </td>
                    <td>
                      <Link href={`/projects/${projectId}/units/${u.id}`} className="btn btn-sm btn-primary">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-500)' }}>
                    No units match &ldquo;{search}&rdquo;
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
