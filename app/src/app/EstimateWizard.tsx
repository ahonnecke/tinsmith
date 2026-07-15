'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WIZARD_STEPS } from '@/domains/estimate/wizard-steps';
import { calculateBid } from '@/domains/estimate/calculate-bid';
import type { WizardAnswers, BidResult, LineItem } from '@/domains/estimate/types';
import { EMPTY_ANSWERS } from '@/domains/estimate/types';
import type { WizardQuestion } from '@/domains/estimate/wizard-types';
import DemoButton from './DemoButton';
import { sizingFromWizard } from '@/domains/sizing/calculate';
import type { EquipmentMatch, EquipmentMatches } from '@/domains/sizing/types';

type AppState =
  | { phase: 'wizard'; stepIndex: number }
  | { phase: 'report' };

export default function EstimateWizard() {
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);
  const [state, setState] = useState<AppState>({ phase: 'wizard', stepIndex: 0 });
  const [bid, setBid] = useState<BidResult | null>(null);

  function handleNext() {
    if (state.phase !== 'wizard') return;
    if (state.stepIndex < WIZARD_STEPS.length - 1) {
      setState({ phase: 'wizard', stepIndex: state.stepIndex + 1 });
    } else {
      setBid(calculateBid(answers));
      setState({ phase: 'report' });
    }
  }

  function handleBack() {
    if (state.phase === 'wizard' && state.stepIndex > 0) {
      setState({ phase: 'wizard', stepIndex: state.stepIndex - 1 });
    }
  }

  function handleStartOver() {
    setAnswers(EMPTY_ANSWERS);
    setBid(null);
    setState({ phase: 'wizard', stepIndex: 0 });
  }

  if (state.phase === 'report' && bid) {
    return <BidReport bid={bid} answers={answers} onStartOver={handleStartOver} />;
  }

  const stepIndex = state.phase === 'wizard' ? state.stepIndex : 0;
  const step = WIZARD_STEPS[stepIndex];

  return (
    <>
      <ProgressBar
        steps={WIZARD_STEPS}
        currentStepIndex={stepIndex}
        onStepClick={(i) => { if (i <= stepIndex) setState({ phase: 'wizard', stepIndex: i }); }}
      />
      <div className="card" style={{ padding: 24 }}>
        <div className="card-title" style={{ marginBottom: 24 }}>{step.title}</div>
        <div>
          {step.questions.filter(q => q.isVisible(answers)).map(question => (
            <QuestionRenderer key={question.id} question={question} answers={answers} onUpdate={setAnswers} />
          ))}
        </div>
        <div className="flex-between" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--gray-200)' }}>
          {stepIndex > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={handleBack}>Back</button>
          ) : <div />}
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            {stepIndex === WIZARD_STEPS.length - 1 ? 'Generate Estimate' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}

function ProgressBar({ steps, currentStepIndex, onStepClick }: {
  steps: { id: string; title: string }[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isClickable = isCompleted || isCurrent;

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: index < steps.length - 1 ? 1 : 'none' }}>
            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 8, border: 'none', cursor: isClickable ? 'pointer' : 'default',
                fontSize: '0.85rem', fontWeight: 600,
                background: isCurrent ? 'var(--blue-50, #eff6ff)' : 'transparent',
                color: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--green-600, #16a34a)' : 'var(--gray-400)',
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                background: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--green-600, #16a34a)' : 'var(--gray-200)',
                color: isCurrent || isCompleted ? '#fff' : 'var(--gray-500)',
              }}>
                {isCompleted ? '\u2713' : index + 1}
              </span>
              <span className="hide-mobile">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 8px',
                background: isCompleted ? 'var(--green-300, #86efac)' : 'var(--gray-200)',
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function QuestionRenderer({ question, answers, onUpdate }: {
  question: WizardQuestion; answers: WizardAnswers; onUpdate: (a: WizardAnswers) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label className="form-label" style={{ fontWeight: 600 }}>{question.title}</label>
      {question.description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: '2px 0 8px' }}>{question.description}</p>
      )}
      {question.type === 'select' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {question.options.map(option => {
            const isSelected = question.getValue(answers) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onUpdate(question.setValue(answers, option.value))}
                style={{
                  textAlign: 'left', padding: '12px 16px', borderRadius: 8, fontSize: '0.9rem',
                  border: isSelected ? '2px solid var(--primary)' : '2px solid var(--gray-200)',
                  background: isSelected ? 'var(--blue-50, #eff6ff)' : 'var(--white)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{option.label}</div>
                {option.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{option.description}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
      {question.type === 'number' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="form-control"
            type="number"
            min={question.min}
            max={question.max}
            step={question.step}
            placeholder={question.placeholder}
            value={question.getValue(answers) ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              if (val !== null) onUpdate(question.setValue(answers, val));
            }}
            style={{ maxWidth: 200 }}
          />
          {question.unit && <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{question.unit}</span>}
        </div>
      )}
      {question.type === 'checkbox' && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          padding: '12px 16px', borderRadius: 8, border: '2px solid var(--gray-200)',
          background: 'var(--white)', maxWidth: 320,
        }}>
          <input
            type="checkbox"
            checked={question.getValue(answers)}
            onChange={(e) => onUpdate(question.setValue(answers, e.target.checked))}
            style={{ width: 20, height: 20 }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--gray-700)' }}>Yes</span>
        </label>
      )}
    </div>
  );
}

function MatchGroup({ label, items }: { label: string; items: EquipmentMatch[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
            padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: 8,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.manufacturer} {m.model}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {m.tons != null ? `${m.tons} tons · ` : ''}{m.capacityBtuh.toLocaleString('en-US')} BTU/h
                {m.efficiency.seer != null ? ` · ${m.efficiency.seer} SEER` : ''}
                {m.efficiency.hspf != null ? ` · ${m.efficiency.hspf} HSPF` : ''}
                {m.efficiency.afue != null ? ` · ${m.efficiency.afue}% AFUE` : ''}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{m.fitPct}% of size</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BidReport({ bid, answers, onStartOver }: {
  bid: BidResult; answers: WizardAnswers; onStartOver: () => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const grouped = bid.lineItems.reduce<Record<string, LineItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const homeLabels: Record<string, string> = {
    single_family: 'single family home', townhouse: 'townhouse', condo: 'condo', manufactured: 'manufactured home',
  };

  const sizing = sizingFromWizard(answers);
  const btu = (n: number) => `${n.toLocaleString('en-US')} BTU/h`;

  const [matches, setMatches] = useState<EquipmentMatches | null>(null);
  const { coolingBtuh, heatingOutputBtuh } = sizing.equipment;
  const systemType = answers.desiredSystem.systemType;
  useEffect(() => {
    let cancelled = false;
    fetch('/api/sizing/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coolingBtuh, heatingOutputBtuh, systemType }),
    })
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j?.ok) setMatches(j.data as EquipmentMatches); })
      .catch(() => { /* matches are a nice-to-have; ignore failures */ });
    return () => { cancelled = true; };
  }, [coolingBtuh, heatingOutputBtuh, systemType]);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>HVAC Cost Estimate</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onStartOver}>Start Over</button>
      </div>

      {/* Summary */}
      <div className="card" style={{ background: 'var(--blue-50, #eff6ff)', border: '1px solid var(--primary)', marginBottom: 16, padding: 24 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>Estimated Total</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
          {fmt(bid.totalLow)} &ndash; {fmt(bid.totalHigh)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 8 }}>
          Based on {answers.homeDetails.squareFootage ?? '~2000'} sq ft {homeLabels[answers.homeDetails.homeType ?? ''] ?? 'home'}
        </div>
      </div>

      {/* Equipment size — coarse engineering estimate */}
      <div className="card" style={{ marginBottom: 16, padding: 24 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Estimated Equipment Size</h3>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: 6,
          }}>Provisional</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Cooling / Coil</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gray-900)' }}>{sizing.equipment.coolingTons.toFixed(1)} tons</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{btu(sizing.equipment.coolingBtuh)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Heating Output</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gray-900)' }}>{btu(sizing.equipment.heatingOutputBtuh)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>design {sizing.design.heating99Pct}°F / {sizing.design.cooling1Pct}°F</div>
          </div>
        </div>
        <ul style={{ margin: '16px 0 0', paddingLeft: 18 }}>
          {sizing.caveats.map((c, i) => (
            <li key={i} style={{ fontSize: '0.76rem', color: 'var(--gray-500)', marginBottom: 4 }}>{c}</li>
          ))}
        </ul>
      </div>

      {/* Matching equipment from the AHRI database */}
      {matches && (matches.cooling.length > 0 || matches.heating.length > 0) && (
        <div className="card" style={{ marginBottom: 16, padding: 24 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>Equipment That Fits</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: 16 }}>
            Real AHRI-listed models near your estimated size.
          </p>
          {matches.cooling.length > 0 && <MatchGroup label="Cooling" items={matches.cooling} />}
          {matches.heating.length > 0 && <MatchGroup label="Heating" items={matches.heating} />}
          <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
            {matches.caveats.map((c, i) => (
              <li key={i} style={{ fontSize: '0.74rem', color: 'var(--gray-400)', marginBottom: 4 }}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Line items */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Estimate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, items]) => (
                items.map((item, i) => (
                  <tr key={`${category}-${i}`}>
                    <td>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textTransform: 'uppercase', marginRight: 8 }}>{category}</span>
                      {item.description}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {fmt(item.estimatedCost.low)} &ndash; {fmt(item.estimatedCost.high)}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--gray-300)' }}>
                <td>Total</td>
                <td style={{ textAlign: 'right' }}>{fmt(bid.totalLow)} &ndash; {fmt(bid.totalHigh)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {bid.notes.length > 0 && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fbbf24', marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#92400e', marginBottom: 8 }}>Notes</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {bid.notes.map((note, i) => (
              <li key={i} style={{ fontSize: '0.85rem', color: '#a16207', marginBottom: 4 }}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="card" style={{ textAlign: 'center', padding: 32, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Want a detailed engineering analysis?</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: 16 }}>
          See equipment-specific recommendations with moisture balance analysis, ASHRAE design conditions, and PDF reports.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <DemoButton
            className="btn btn-success btn-lg"
            destination="/projects/c0000000-0000-0000-0000-000000000001/results"
          />
          <Link href="/register" className="btn btn-primary btn-lg">Sign Up Free</Link>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 12 }}>
          Try Demo loads a sample project with real calculation results
        </p>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center', marginTop: 24 }}>
        This is a preliminary estimate based on general pricing data.
        Actual costs vary by location, equipment, and site conditions. A professional assessment is recommended.
      </p>
    </div>
  );
}
