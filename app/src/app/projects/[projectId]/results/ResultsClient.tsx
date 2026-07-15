'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalculationWithResult, EquipmentPackages, MoistureBalance, DwellingUnit } from '@/lib/types';

interface Props {
  projectId: string;
  calculations: CalculationWithResult[];
  units: Pick<DwellingUnit, 'id' | 'name'>[];
}

export default function ResultsClient({ projectId, calculations, units }: Props) {
  const [selectedUnit, setSelectedUnit] = useState(units[0]?.id ?? '');
  const [expanded, setExpanded] = useState(false);

  // Group by calc run, then filter to selected unit
  const calcIds = [...new Set(calculations.map(c => c.id))];
  const [selectedCalcId, setSelectedCalcId] = useState(calcIds[0] ?? '');

  // Find the result row matching the selected calc + unit
  const selected = calculations.find(c =>
    c.id === selectedCalcId && (
      c.dwelling_unit_id === selectedUnit || // multi-unit match
      (!c.dwelling_unit_id && calculations.filter(x => x.id === selectedCalcId).length === 1) // legacy single-result
    )
  ) || calculations.find(c => c.id === selectedCalcId); // fallback to first result for this calc

  const pkgs = selected?.equipment_packages as EquipmentPackages | null;
  const moisture = selected?.moisture_balance as MoistureBalance | null;

  return (
    <>
      {/* Unit selector + Calculation run selector */}
      <div className="flex-center gap-3 mb-6" style={{ flexWrap: 'wrap' }}>
        {units.length > 0 && (
          <div className="run-selector" style={{ marginBottom: 0 }}>
            <label htmlFor="unit-select">Dwelling Unit:</label>
            <select
              className="form-control"
              id="unit-select"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              style={{ width: 220 }}
            >
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {calcIds.length > 0 && (
          <div className="run-selector" style={{ marginBottom: 0 }}>
            <label htmlFor="calc-run-select">Calculation Run:</label>
            <select
              className="form-control"
              id="calc-run-select"
              value={selectedCalcId}
              onChange={e => setSelectedCalcId(e.target.value)}
            >
              {calcIds.map((id, i) => {
                const c = calculations.find(x => x.id === id)!;
                return (
                  <option key={id} value={id}>
                    Run #{calcIds.length - i} &ndash; {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {i === 0 ? ' (latest)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {pkgs && (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="label">Peak Cooling Load</div>
              <div className="value">{pkgs.peakCooling.value.toLocaleString()}</div>
              <div className="unit">{pkgs.peakCooling.unit}</div>
            </div>
            <div className="summary-card">
              <div className="label">Peak Heating Load</div>
              <div className="value">{pkgs.peakHeating.value.toLocaleString()}</div>
              <div className="unit">{pkgs.peakHeating.unit}</div>
            </div>
            <div className="summary-card">
              <div className="label">Moisture Deficit</div>
              <div className="value">{pkgs.moistureDeficit.value >= 0 ? '+' : ''}{pkgs.moistureDeficit.value}</div>
              <div className="unit">{pkgs.moistureDeficit.unit} surplus removal</div>
            </div>
          </div>

          <div className="packages-grid">
            {(['good', 'better', 'best'] as const).map(tier => {
              const pkg = pkgs[tier];
              return (
                <div key={tier} className={`package-card${tier === 'better' ? ' highlighted' : ''}`}>
                  <div className="package-header">{pkg.title}</div>
                  <div className="package-body">
                    <div className="package-section">
                      <div className="package-section-title">Equipment</div>
                      <div className="package-value">{pkg.equipment}</div>
                      <div className="package-value text-sm text-muted">SEER2 {pkg.seer2} / HSPF2 {pkg.hspf2}</div>
                    </div>
                    <div className="package-section">
                      <div className="package-section-title">Ventilation</div>
                      <div className="package-value">{pkg.ventilation}</div>
                    </div>
                    <div className="package-section">
                      <div className="package-section-title">Moisture Control</div>
                      <div className="package-value">{pkg.moisture}</div>
                    </div>
                    <div className="package-metric">
                      <span className="package-metric-label">Annual Energy Cost</span>
                      <span className="package-metric-value cost">${pkg.annualCost.toLocaleString()}/yr</span>
                    </div>
                    <div className="package-metric">
                      <span className="package-metric-label">Comfort Score</span>
                      <span className="package-metric-value">{pkg.comfortScore}</span>
                    </div>
                    <div className="package-metric">
                      <span className="package-metric-label">Moisture Balance</span>
                      <span className={`badge ${pkg.moisturePass ? 'badge-pass' : 'badge-fail'}`}>
                        {pkg.moisturePass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {moisture && (
        <div className="card">
          <div
            className="expandable-header"
            onClick={() => setExpanded(!expanded)}
            style={{ cursor: 'pointer' }}
          >
            <span className="arrow" style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>&#9654;</span>
            {' '}Moisture Balance Detail (Better Package)
          </div>
          {expanded && (
            <div className="expandable-body">
              <div className="form-row" style={{ marginBottom: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Water In (pints/day)</h4>
                  <table>
                    <thead><tr><th>Source</th><th className="text-right">Pints/Day</th></tr></thead>
                    <tbody>
                      {moisture.waterIn.map(row => (
                        <tr key={row.source}><td>{row.source}</td><td className="text-right">{row.pintsPerDay}</td></tr>
                      ))}
                      <tr style={{ fontWeight: 700, borderTop: '2px solid var(--gray-300)' }}>
                        <td>Total Water In</td>
                        <td className="text-right">{moisture.totalIn}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Water Out (pints/day)</h4>
                  <table>
                    <thead><tr><th>Source</th><th className="text-right">Pints/Day</th></tr></thead>
                    <tbody>
                      {moisture.waterOut.map(row => (
                        <tr key={row.source}><td>{row.source}</td><td className="text-right">{row.pintsPerDay}</td></tr>
                      ))}
                      <tr style={{ fontWeight: 700, borderTop: '2px solid var(--gray-300)' }}>
                        <td>Total Water Out</td>
                        <td className="text-right">{moisture.totalOut}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex-between" style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                <div>
                  <strong>Net Balance:</strong> {moisture.netBalance >= 0 ? '+' : ''}{moisture.netBalance} pints/day
                  <span className="text-sm text-muted"> (negative = moisture removed)</span>
                </div>
                <span className={`badge ${moisture.pass ? 'badge-pass' : 'badge-fail'}`}>
                  {moisture.pass ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {calcIds.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-muted">No calculations yet. Run a calculation first.</p>
          <Link href={`/projects/${projectId}/systems`} className="btn btn-primary mt-6">
            Go to System Selection
          </Link>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex-between mt-6">
        <div className="flex-center gap-2">
          <Link href={`/projects/${projectId}/systems`} className="btn btn-primary">Run New Calculation</Link>
        </div>
        <div className="flex-center gap-2">
          <Link href={`/projects/${projectId}/comparison`} className="btn btn-secondary">
            Compare Equipment
          </Link>
          <Link href={`/projects/${projectId}/audit`} className="btn btn-secondary">
            View Audit Trail
          </Link>
          <Link href={`/projects/${projectId}/report`} className="btn btn-secondary">
            Export PDF
          </Link>
        </div>
      </div>
    </>
  );
}
