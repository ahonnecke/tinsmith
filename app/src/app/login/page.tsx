'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.auth.login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setError('');
    setDemoLoading(true);
    try {
      const result = await api.auth.demo();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">HVAC <span>3.0</span></div>
        <h1>Sign In</h1>
        <p className="subtitle">Enter your credentials to access your projects.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              className="form-control"
              type="email"
              id="login-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              className="form-control"
              type="password"
              id="login-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: 'var(--red-600)', marginBottom: '8px', fontSize: '14px' }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: '12px', width: '100%' }}
            disabled={loading || demoLoading}
          >
            {loading ? 'Signing in\u2026' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '20px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8rem' }}>or</div>

        <button
          type="button"
          className="btn btn-success btn-lg"
          style={{ width: '100%' }}
          onClick={handleDemo}
          disabled={loading || demoLoading}
        >
          {demoLoading ? 'Loading demo\u2026' : 'Try Demo \u2014 No Account Needed'}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
          {' \u00B7 '}
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Get a free estimate</Link>
        </p>
      </div>
    </div>
  );
}
