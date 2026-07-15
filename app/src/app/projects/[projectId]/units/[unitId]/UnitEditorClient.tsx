'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DwellingUnit, BuildingParameters, LoadCondition } from '@/lib/types';
import { api } from '@/lib/api-client';

const TABS = [
  { id: 'building', label: 'Building Parameters' },
  { id: 'cooling1', label: '1% Cooling' },
  { id: 'dehu1', label: '1% Dehu' },
  { id: 'heating99', label: '99% Heating' },
  { id: 'heating996', label: '99.6% Heating' },
];

const SHELTER_CLASSES = [1, 2, 3, 4, 5];
const TERRAIN_CLASSES = ['A', 'B', 'C', 'D'];

function ro(val: string | number | null | undefined, suffix = '') {
  if (val == null) return '';
  return `${val}${suffix}`;
}

function ValidIcon({ valid }: { valid: boolean }) {
  if (!valid) return null;
  return (
    <span style={{
      color: 'var(--green-600)',
      fontSize: '0.85rem',
      marginLeft: 6,
      fontWeight: 700,
    }}>&#10003;</span>
  );
}

function BuildingTab({
  bp,
  onChange,
}: {
  bp: BuildingParameters | null;
  onChange: (field: string, value: string | number) => void;
}) {
  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Blower Door (CFM50)
            <ValidIcon valid={!!bp?.cfm50 && bp.cfm50 > 0} />
          </label>
          <input
            className="form-control"
            type="number"
            value={bp?.cfm50 ?? ''}
            onChange={e => onChange('cfm50', Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Ceiling Height (ft)
            <ValidIcon valid={!!bp?.ceilingHeight && bp.ceilingHeight > 0} />
          </label>
          <input className="form-control form-readonly" type="text" defaultValue={ro(bp?.ceilingHeight)} readOnly />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Conditioned Volume (ft³)
            <ValidIcon valid={!!bp?.conditionedVolume && bp.conditionedVolume > 0} />
          </label>
          <input className="form-control form-readonly" type="text" defaultValue={ro(bp?.conditionedVolume)} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">
            Shelter Class
            <ValidIcon valid={!!bp?.shelterClass} />
          </label>
          <select
            className="form-control"
            value={bp?.shelterClass ?? ''}
            onChange={e => onChange('shelterClass', Number(e.target.value))}
          >
            <option value="">Select...</option>
            {SHELTER_CLASSES.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Terrain Class
            <ValidIcon valid={!!bp?.terrainClass} />
          </label>
          <select
            className="form-control"
            value={bp?.terrainClass ?? ''}
            onChange={e => onChange('terrainClass', e.target.value)}
          >
            <option value="">Select...</option>
            {TERRAIN_CLASSES.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">
            Manual J Software
            <ValidIcon valid={!!bp?.manualJSoftware} />
          </label>
          <input className="form-control form-readonly" type="text" defaultValue={ro(bp?.manualJSoftware)} readOnly />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">
          Existing Ventilation Systems
          <ValidIcon valid={!!bp?.ventSystems} />
        </label>
        <input className="form-control form-readonly" type="text" defaultValue={ro(bp?.ventSystems)} readOnly />
      </div>
      <div className="form-group">
        <label className="form-label">
          Manual J Version
          <ValidIcon valid={!!bp?.manualJVersion} />
        </label>
        <input className="form-control form-readonly" type="text" defaultValue={ro(bp?.manualJVersion)} readOnly />
      </div>
    </div>
  );
}

function CoolingDehuTab({ lc, subtitle }: { lc: LoadCondition | null | undefined; subtitle: string }) {
  return (
    <div>
      <div className="card-subtitle mb-4">{subtitle}</div>
      <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Load Summary</h4>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Sensible Load (BTU/h) <ValidIcon valid={!!lc?.sensible} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.sensible?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Latent Load (BTU/h) <ValidIcon valid={!!lc?.latent} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.latent?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Total Load (BTU/h) <ValidIcon valid={!!lc?.total} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.total?.toLocaleString() ?? ''} readOnly />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Sensible Heat Fraction (SHF) <ValidIcon valid={!!lc?.shf} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.shf ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Internal Gains (BTU/h) <ValidIcon valid={!!lc?.internalGains} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.internalGains?.toLocaleString() ?? ''} readOnly />
        </div>
      </div>
      <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem' }}>Infiltration</h4>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Rate (ACH)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.infiltrationRate ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Sensible (BTU/h)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.infiltrationSensible?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Latent (BTU/h)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.infiltrationLatent?.toLocaleString() ?? ''} readOnly />
        </div>
      </div>
      <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem' }}>Ventilation</h4>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Rate (CFM)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.ventilationRate ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Sensible (BTU/h)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.ventilationSensible?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Latent (BTU/h)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.ventilationLatent?.toLocaleString() ?? ''} readOnly />
        </div>
      </div>
      <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem' }}>Unit Details</h4>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Floor Area (ft²)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.floorArea?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Bedrooms</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.bedrooms ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Occupants</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.occupants ?? ''} readOnly />
        </div>
      </div>
    </div>
  );
}

function HeatingTab({ lc, subtitle }: { lc: LoadCondition | null | undefined; subtitle: string }) {
  return (
    <div>
      <div className="card-subtitle mb-4">{subtitle}</div>
      <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Load Summary</h4>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Total Heating Load (BTU/h) <ValidIcon valid={!!lc?.total} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.total?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Design Outdoor DB (°F) <ValidIcon valid={!!lc?.designDB} /></label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.designDB ?? ''} readOnly />
        </div>
      </div>
      <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem' }}>Infiltration</h4>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Rate (ACH)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.infiltrationRate ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Heating Load (BTU/h)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.infiltrationLoad?.toLocaleString() ?? ''} readOnly />
        </div>
      </div>
      <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem' }}>Ventilation</h4>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Rate (CFM)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.ventilationRate ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Heating Load (BTU/h)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.ventilationLoad?.toLocaleString() ?? ''} readOnly />
        </div>
      </div>
      <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem' }}>Unit Details</h4>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Floor Area (ft²)</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.floorArea?.toLocaleString() ?? ''} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">Bedrooms</label>
          <input className="form-control form-readonly" type="text" defaultValue={lc?.bedrooms ?? ''} readOnly />
        </div>
      </div>
    </div>
  );
}

export default function UnitEditorClient({ unit, projectId }: { unit: DwellingUnit; projectId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('building');
  const [bp, setBp] = useState<BuildingParameters | null>(unit.building_parameters ? { ...unit.building_parameters } : null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const ld = unit.load_data;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  const handleBpChange = useCallback((field: string, value: string | number) => {
    setBp(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.units.update(projectId, unit.id, { building_parameters: bp });
      if (result.ok) {
        showToast('Changes saved');
        setTimeout(() => router.push(`/projects/${projectId}/units`), 600);
      } else {
        showToast('Save failed');
      }
    } catch {
      showToast('Save failed');
    }
    setSaving(false);
  }

  return (
    <>
      <div className="card">
        <div className="tabs">
          {TABS.map(t => (
            <div
              key={t.id}
              className={`tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </div>
          ))}
        </div>

        {activeTab === 'building' && <BuildingTab bp={bp} onChange={handleBpChange} />}
        {activeTab === 'cooling1' && (
          <CoolingDehuTab
            lc={ld?.cooling1}
            subtitle="Design condition: 93.5°F DB / 74.6°F WB — Indoor: 75°F / 50% RH"
          />
        )}
        {activeTab === 'dehu1' && (
          <CoolingDehuTab
            lc={ld?.dehu1}
            subtitle="Design condition: 80.2°F DB / 76.1°F WB — Indoor: 75°F / 50% RH"
          />
        )}
        {activeTab === 'heating99' && (
          <HeatingTab
            lc={ld?.heating99}
            subtitle="Design condition: 21.5°F DB — Indoor: 70°F"
          />
        )}
        {activeTab === 'heating996' && (
          <HeatingTab
            lc={ld?.heating996}
            subtitle="Design condition: 17.3°F DB — Indoor: 70°F"
          />
        )}
      </div>

      <div className="flex-between mt-6">
        <Link href={`/projects/${projectId}/units`} className="btn btn-secondary">&larr; Back to Units</Link>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Return'} &rarr;
        </button>
      </div>

      {toast && (
        <div className="toast show">{toast}</div>
      )}
    </>
  );
}
