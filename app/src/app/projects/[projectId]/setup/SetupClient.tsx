'use client';

import { useState } from 'react';
import { DesignCondition, WeatherStation } from '@/lib/types';

interface Props {
  projectId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  weatherStation: WeatherStation | null;
  designConditions: DesignCondition[];
}

interface WeatherResponse {
  station: WeatherStation;
  designConditions: DesignCondition[];
  fallback?: boolean;
  error?: string;
}

const STEPS = [
  'Geocoding project address...',
  'Connecting to ASHRAE database...',
  'Looking up nearest weather station...',
  'Fetching design conditions (2021 HOF)...',
  'Saving to project...',
];

export default function WeatherFetcher({
  projectId, address, city, state, zip,
  weatherStation: initialWs,
  designConditions: initialDc,
}: Props) {
  const [ws, setWs] = useState<WeatherStation | null>(initialWs);
  const [dc, setDc] = useState<DesignCondition[]>(initialDc);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  const hasData = !!ws && dc.length > 0;

  async function fetchWeather() {
    setLoading(true);
    setError(null);
    setFallback(false);
    setCurrentStep(0);

    try {
      // Step 1: Geocode + ASHRAE fetch (server handles both)
      setCurrentStep(1);
      const params = new URLSearchParams();
      if (address) params.set('address', address);
      if (city) params.set('city', city);
      if (state) params.set('state', state);
      if (zip) params.set('zip', zip);

      setCurrentStep(2);
      const weatherRes = await fetch(`/api/weather?${params.toString()}`);
      if (!weatherRes.ok) {
        const err = await weatherRes.json();
        throw new Error(err.error || 'Weather fetch failed');
      }

      setCurrentStep(3);
      const data: WeatherResponse = await weatherRes.json();

      if (data.fallback) {
        setFallback(true);
      }

      // Step 2: Save to project
      setCurrentStep(4);
      const saveRes = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weather_station: data.station,
          design_conditions: data.designConditions,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save weather data to project');
      }

      setWs(data.station);
      setDc(data.designConditions);
      setCurrentStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Fetch button */}
      {!loading && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">ASHRAE Weather Data</div>
              <div className="card-subtitle">
                {hasData
                  ? 'Weather station and design conditions loaded. Click to refresh.'
                  : 'Fetch design conditions from the ASHRAE 2021 Handbook of Fundamentals.'}
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={fetchWeather}
              disabled={!city && !zip}
            >
              {hasData ? 'Refresh Weather Data' : 'Fetch Weather Data'}
            </button>
          </div>
          {error && (
            <div className="alert" style={{ color: '#c0392b', background: '#ffeaea', padding: '8px 12px', borderRadius: 4, marginTop: 8 }}>
              {error}
            </div>
          )}
          {fallback && !error && (
            <div className="alert" style={{ color: '#856404', background: '#fff3cd', padding: '8px 12px', borderRadius: 4, marginTop: 8 }}>
              ASHRAE API unavailable — using state-level estimates. Values may not be accurate for this specific location.
            </div>
          )}
        </div>
      )}

      {/* Progress animation */}
      {loading && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div className="card-title">Fetching ASHRAE Data...</div>
          </div>
          <div className="progress-bar-wrap">
            <div
              className="progress-bar"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, transition: 'width 0.4s ease' }}
            />
          </div>
          <ul className="calc-steps">
            {STEPS.map((step, i) => (
              <li key={i} className={`calc-step${i <= currentStep ? ' done' : ''}`}>
                <span className="step-icon">{i <= currentStep ? '\u2713' : ''}</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weather Station display */}
      {ws && !loading && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Weather Station</div>
              <div className="card-subtitle">Nearest ASHRAE weather data source</div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Station</label>
              <input className="form-control form-readonly" type="text" defaultValue={ws.name} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">WMO ID</label>
              <input className="form-control form-readonly" type="text" defaultValue={ws.id} readOnly />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Elevation</label>
              <input className="form-control form-readonly" type="text" defaultValue={ws.elevation} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-control form-readonly" type="text" defaultValue={ws.lat} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-control form-readonly" type="text" defaultValue={ws.lon} readOnly />
            </div>
          </div>
        </div>
      )}

      {/* Design Conditions table */}
      {dc.length > 0 && !loading && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Design Conditions</div>
              <div className="card-subtitle">ASHRAE Climatic Design Conditions (2021 Handbook of Fundamentals)</div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Dry Bulb (&deg;F)</th>
                  <th>Wet Bulb (&deg;F)</th>
                  <th>Dew Point (&deg;F)</th>
                  <th>Humidity Ratio (lb/lb)</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {dc.map(row => (
                  <tr key={row.condition}>
                    <td><strong>{row.condition}</strong></td>
                    <td>{row.db ?? '\u2014'}</td>
                    <td>{row.wb ?? '\u2014'}</td>
                    <td>{row.dp ?? '\u2014'}</td>
                    <td>{row.hr ?? '\u2014'}</td>
                    <td className="text-muted text-sm">{row.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Psychrometric Conversions */}
      {dc.length >= 2 && !loading && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Psychrometric Conversions</div>
              <div className="card-subtitle">Computed humidity property conversions for design conditions</div>
            </div>
          </div>
          <div className="psych-grid">
            {dc[0] && dc[0].dp && (
              <div className="psych-card">
                <div className="label">DB/WB &rarr; Dew Point</div>
                <div className="result">{dc[0].dp}&deg;F DP</div>
                <div className="text-sm text-muted mt-4">From {dc[0].db}&deg;F DB / {dc[0].wb}&deg;F WB</div>
              </div>
            )}
            {dc[1] && dc[1].wb && (
              <div className="psych-card">
                <div className="label">DP/DB &rarr; Wet Bulb</div>
                <div className="result">{dc[1].wb}&deg;F WB</div>
                <div className="text-sm text-muted mt-4">From {dc[1].dp}&deg;F DP / {dc[1].db}&deg;F DB</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
