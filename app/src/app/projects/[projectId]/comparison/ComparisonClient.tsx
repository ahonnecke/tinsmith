'use client';

import { useState } from 'react';
import { EquipmentPackages, EquipmentPackage, MoistureBalance } from '@/lib/types';

interface Props {
  projectId: string;
  pkgs: EquipmentPackages;
  moisture: MoistureBalance | null;
}

type Tab = 'cooling' | 'heating' | 'moisture';

const TIERS = ['good', 'better', 'best'] as const;
const TIER_COLORS = { good: '#6b7280', better: '#1a365d', best: '#2563eb' };

function BarChart({
  rows,
}: {
  rows: { label: string; sublabel: string; capacity: number; load: number; capacityLabel: string; loadLabel: string; tier: string }[];
}) {
  const maxVal = Math.max(...rows.map(r => Math.max(r.capacity, r.load)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {rows.map((row, i) => {
        const capPct = maxVal > 0 ? (row.capacity / maxVal) * 100 : 0;
        const loadPct = maxVal > 0 ? (row.load / maxVal) * 100 : 0;
        const oversizing = row.load > 0 ? Math.round(((row.capacity - row.load) / row.load) * 100) : 0;
        const oversizingOk = oversizing >= -10 && oversizing <= 40;

        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: TIER_COLORS[row.tier as keyof typeof TIER_COLORS] || '#333' }}>{row.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{row.sublabel}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 20, width: `${capPct}%`, minWidth: 4, background: '#3b82f6', borderRadius: 3, transition: 'width 0.4s' }} />
                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{row.capacityLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 20, width: `${loadPct}%`, minWidth: 4, background: '#f59e0b', borderRadius: 3, transition: 'width 0.4s' }} />
                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{row.loadLabel}</span>
              </div>
            </div>
            <div style={{
              fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', padding: '2px 6px', borderRadius: 4,
              color: oversizingOk ? '#166534' : '#991b1b',
              background: oversizingOk ? '#dcfce7' : '#fef2f2',
            }}>
              {oversizing >= 0 ? '+' : ''}{oversizing}%
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }} /> Capacity
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }} /> Load
        </div>
      </div>
    </div>
  );
}

function getEquipmentShortName(pkg: EquipmentPackage): string {
  const parts = pkg.equipment.split(' ');
  return parts.length > 2 ? parts.slice(0, 2).join(' ') : pkg.equipment;
}

export default function ComparisonClient({ pkgs, moisture }: Props) {
  const [tab, setTab] = useState<Tab>('cooling');

  const tiers = TIERS.map(t => pkgs[t]);
  const peakCooling = pkgs.peakCooling.value;
  const peakHeating = pkgs.peakHeating.value;
  const moistureLoad = moisture ? moisture.totalIn : 0;

  // Estimate capacities from SEER/HSPF (approximate — we know peak load and efficiency)
  // Using the rated capacity from equipment name if available, otherwise estimate
  const getCoolingCapacity = (pkg: EquipmentPackage) => {
    // Extract tons from equipment name if present (e.g., "2.0-ton")
    const match = pkg.equipment.match(/([\d.]+)-ton/);
    if (match) return parseFloat(match[1]) * 12000;
    // Fallback: assume capacity is ~110% of peak cooling for good, scaling with SEER
    const seer = parseFloat(pkg.seer2);
    const baseSeer = parseFloat(pkgs.good.seer2);
    return Math.round(peakCooling * 1.1 * (baseSeer / seer) * 1.05);
  };

  const getHeatingCapacity = (pkg: EquipmentPackage) => {
    const hspf = parseFloat(pkg.hspf2);
    const baseHspf = parseFloat(pkgs.good.hspf2);
    return Math.round(peakHeating * 1.15 * (hspf / baseHspf));
  };

  const getMoistureRemoval = (pkg: EquipmentPackage) => {
    // AC latent = capacity * 0.25 * runtime * 24 / 1054
    const capacity = getCoolingCapacity(pkg);
    const runtime = Math.min(peakCooling / capacity, 1.0);
    const acLatent = (runtime * 24 * capacity * 0.25) / 1054;
    // Add dehu if mentioned
    const hasDehu = pkg.moisture.toLowerCase().includes('dehu');
    const dehu = hasDehu ? moistureLoad * 0.4 : 0;
    return Math.round(acLatent + dehu);
  };

  const coolingRows = tiers.map((pkg, i) => ({
    label: pkg.title,
    sublabel: getEquipmentShortName(pkg),
    capacity: getCoolingCapacity(pkg),
    load: peakCooling,
    capacityLabel: `${getCoolingCapacity(pkg).toLocaleString()} BTU/h`,
    loadLabel: `${peakCooling.toLocaleString()} BTU/h`,
    tier: TIERS[i],
  }));

  const heatingRows = tiers.map((pkg, i) => ({
    label: pkg.title,
    sublabel: getEquipmentShortName(pkg),
    capacity: getHeatingCapacity(pkg),
    load: peakHeating,
    capacityLabel: `${getHeatingCapacity(pkg).toLocaleString()} BTU/h`,
    loadLabel: `${peakHeating.toLocaleString()} BTU/h`,
    tier: TIERS[i],
  }));

  const moistureRows = tiers.map((pkg, i) => ({
    label: pkg.title,
    sublabel: pkg.moisture.length > 30 ? pkg.moisture.substring(0, 28) + '...' : pkg.moisture,
    capacity: getMoistureRemoval(pkg),
    load: Math.round(moistureLoad),
    capacityLabel: `${getMoistureRemoval(pkg)} pints/day`,
    loadLabel: `${Math.round(moistureLoad)} pints/day`,
    tier: TIERS[i],
  }));

  return (
    <>
      {/* Bar chart comparison */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Side-by-Side Equipment Comparison</div>
            <div className="card-subtitle">Capacity vs load for Good / Better / Best packages</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--gray-200)', marginBottom: 16 }}>
          {([
            { key: 'cooling' as Tab, label: 'Cooling Performance' },
            { key: 'heating' as Tab, label: 'Heating Performance' },
            { key: 'moisture' as Tab, label: 'Moisture / Drying' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? 'var(--primary)' : 'var(--gray-500)',
                borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2,
                fontSize: '0.9rem',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '8px 0' }}>
          {tab === 'cooling' && <BarChart rows={coolingRows} />}
          {tab === 'heating' && <BarChart rows={heatingRows} />}
          {tab === 'moisture' && <BarChart rows={moistureRows} />}
        </div>
      </div>

      {/* Specs table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Detailed Specifications</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Specification</th>
                <th>Good</th>
                <th style={{ background: 'var(--primary-light, #f0f7ff)' }}>Better</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Equipment</td>
                {tiers.map((pkg, i) => <td key={i} style={{ fontSize: '0.85rem' }}>{pkg.equipment}</td>)}
              </tr>
              <tr>
                <td>SEER2</td>
                {tiers.map((pkg, i) => <td key={i}>{pkg.seer2}</td>)}
              </tr>
              <tr>
                <td>HSPF2</td>
                {tiers.map((pkg, i) => <td key={i}>{pkg.hspf2}</td>)}
              </tr>
              <tr>
                <td>Cooling Capacity</td>
                {tiers.map((pkg, i) => <td key={i}>{getCoolingCapacity(pkg).toLocaleString()} BTU/h</td>)}
              </tr>
              <tr>
                <td>Heating Capacity</td>
                {tiers.map((pkg, i) => <td key={i}>{getHeatingCapacity(pkg).toLocaleString()} BTU/h</td>)}
              </tr>
              <tr>
                <td>Ventilation</td>
                {tiers.map((pkg, i) => <td key={i} style={{ fontSize: '0.85rem' }}>{pkg.ventilation}</td>)}
              </tr>
              <tr>
                <td>Moisture Control</td>
                {tiers.map((pkg, i) => <td key={i} style={{ fontSize: '0.85rem' }}>{pkg.moisture}</td>)}
              </tr>
              <tr>
                <td>Moisture Removal</td>
                {tiers.map((pkg, i) => <td key={i}>{getMoistureRemoval(pkg)} pints/day</td>)}
              </tr>
              <tr>
                <td>Annual Energy Cost</td>
                {tiers.map((pkg, i) => <td key={i} style={{ fontWeight: 700 }}>${pkg.annualCost.toLocaleString()}/yr</td>)}
              </tr>
              <tr>
                <td>Comfort Score</td>
                {tiers.map((pkg, i) => (
                  <td key={i} style={{ fontWeight: 700, color: pkg.comfortScore >= 80 ? '#166534' : pkg.comfortScore >= 60 ? '#92400e' : '#991b1b' }}>
                    {pkg.comfortScore}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td>Moisture Balance</td>
                {tiers.map((pkg, i) => (
                  <td key={i}>
                    <span className={`badge ${pkg.moisturePass ? 'badge-pass' : 'badge-fail'}`}>
                      {pkg.moisturePass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
