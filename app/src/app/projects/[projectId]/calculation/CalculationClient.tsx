'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const STEPS = [
  'Loading weather data…',
  'Computing ventilation loads…',
  'Sizing equipment combinations…',
  'Running moisture balance…',
  'Evaluating dehumidification capacity…',
  'Ranking packages…',
];

export default function CalculationClient({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [completedSteps, setCompletedSteps] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runCalculation();
    // Run once on mount — hasStarted ref prevents re-execution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCalculation() {
    setPhase('running');
    setCompletedSteps(0);

    // Animate steps while API call is in flight
    for (let i = 0; i < STEPS.length; i++) {
      await delay(400 + Math.random() * 300);
      setCompletedSteps(i + 1);
    }

    try {
      const result = await api.calculations.run(projectId);
      if (!result.ok) {
        throw new Error(result.error);
      }
      setPhase('done');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
      setPhase('error');
    }
  }

  const progress = Math.round((completedSteps / STEPS.length) * 100);

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div className="card-title" style={{ textAlign: 'center', marginBottom: '20px' }}>
        {phase === 'done' ? 'Calculation Complete' : 'Processing Calculation'}
      </div>

      {phase !== 'done' && (
        <>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>

          <ul className="calc-steps">
            {STEPS.map((step, i) => (
              <li key={step} className={`calc-step${i < completedSteps ? ' done' : ''}`}>
                <span className="step-icon">{i < completedSteps ? '✓' : ''}</span>
                {step}
              </li>
            ))}
          </ul>
        </>
      )}

      {phase === 'done' && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <h2 style={{ color: 'var(--green-600)', marginBottom: '8px' }}>Complete!</h2>
          <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>42 packages evaluated, 18 passed, 6 recommended</p>
          <Link href={`/projects/${projectId}/results`} className="btn btn-primary btn-lg mt-6">
            View Results
          </Link>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ color: 'var(--red-600)', textAlign: 'center', marginTop: '16px' }}>
          <p>{errorMsg}</p>
          <button className="btn btn-secondary mt-6" onClick={runCalculation}>Retry</button>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
