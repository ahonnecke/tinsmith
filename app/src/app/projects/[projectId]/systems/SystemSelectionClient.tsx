'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EquipmentSelections } from '@/lib/types';
import { api } from '@/lib/api-client';

const VENTILATION_OPTIONS = [
  { id: 'exhaust', label: 'Exhaust-Only', desc: 'Bath/kitchen exhaust fans' },
  { id: 'cfis', label: 'CFIS', desc: 'Central fan integrated supply' },
  { id: 'balanced', label: 'Balanced', desc: 'Supply + exhaust ducted' },
  { id: 'hrv_erv', label: 'HRV / ERV', desc: 'Heat/energy recovery ventilator' },
  { id: 'doas', label: 'DOAS', desc: 'Dedicated outdoor air system', deferred: true },
];

const EQUIPMENT_OPTIONS = [
  { id: 'split_ducted', label: 'Split Ducted', desc: 'Conventional split system' },
  { id: 'packaged', label: 'Packaged Unit', desc: 'Rooftop or through-wall' },
  { id: 'ductless', label: 'Ductless Mini-Split', desc: 'Wall-mounted heads' },
  { id: 'dual_fuel', label: 'Dual Fuel', desc: 'Heat pump + gas furnace' },
];

const MOISTURE_OPTIONS = [
  { id: 'dry_mode', label: 'Dry Mode', desc: 'AC overcooling for dehu' },
  { id: 'hot_gas_reheat', label: 'Hot Gas Reheat', desc: 'Subcooling with reheat coil' },
  { id: 'ducted_dehu', label: 'Ducted Dehumidifier', desc: 'Standalone whole-house dehu' },
  { id: 'hpwh', label: 'HPWH', desc: 'Heat pump water heater credit' },
];

interface Props {
  projectId: string;
  initialSelections: EquipmentSelections;
}

export default function SystemSelectionClient({ projectId, initialSelections }: Props) {
  const router = useRouter();
  const [ventilation, setVentilation] = useState<string[]>(initialSelections.ventilation);
  const [equipment, setEquipment] = useState<string[]>(initialSelections.equipment);
  const [moisture, setMoisture] = useState<string[]>(initialSelections.moisture);
  const [saving, setSaving] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }

  async function handleContinue() {
    setSaving(true);
    await api.projects.update(projectId, { equipment_selections: { ventilation, equipment, moisture } });
    setSaving(false);
    router.push(`/projects/${projectId}/calculation`);
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Select Systems to Evaluate</div>
            <div className="card-subtitle">
              Choose which ventilation, equipment, and moisture control options to include in the calculation
            </div>
          </div>
        </div>

        <div className="checkbox-columns">
          <div className="checkbox-column">
            <h3>Ventilation Strategy</h3>
            <div className="checkbox-group">
              {VENTILATION_OPTIONS.map(opt => (
                <label key={opt.id} className={`checkbox-item${opt.deferred ? ' disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={ventilation.includes(opt.id)}
                    disabled={opt.deferred}
                    onChange={() => !opt.deferred && toggle(ventilation, setVentilation, opt.id)}
                  />
                  <div>
                    <div className="checkbox-label">
                      {opt.label}
                      {opt.deferred && <span className="deferred-tag">Deferred</span>}
                    </div>
                    <div className="checkbox-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="checkbox-column">
            <h3>Equipment Type</h3>
            <div className="checkbox-group">
              {EQUIPMENT_OPTIONS.map(opt => (
                <label key={opt.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={equipment.includes(opt.id)}
                    onChange={() => toggle(equipment, setEquipment, opt.id)}
                  />
                  <div>
                    <div className="checkbox-label">{opt.label}</div>
                    <div className="checkbox-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="checkbox-column">
            <h3>Moisture Control</h3>
            <div className="checkbox-group">
              {MOISTURE_OPTIONS.map(opt => (
                <label key={opt.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={moisture.includes(opt.id)}
                    onChange={() => toggle(moisture, setMoisture, opt.id)}
                  />
                  <div>
                    <div className="checkbox-label">{opt.label}</div>
                    <div className="checkbox-desc">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-between mt-6">
        <Link href={`/projects/${projectId}/units`} className="btn btn-secondary">&larr; Dwelling Units</Link>
        <button
          className="btn btn-success btn-lg"
          onClick={handleContinue}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Run Calculation →'}
        </button>
      </div>
    </>
  );
}
