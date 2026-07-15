'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.register(email, password, name, organizationName);
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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">HVAC <span>3.0</span></div>
        <h1>Create Account</h1>
        <p className="subtitle">Sign up to access detailed HVAC engineering analysis.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Name</label>
            <input
              className="form-control"
              type="text"
              id="reg-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              className="form-control"
              type="email"
              id="reg-email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-org">Organization Name</label>
            <input
              className="form-control"
              type="text"
              id="reg-org"
              value={organizationName}
              onChange={e => setOrganizationName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              className="form-control"
              type="password"
              id="reg-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              className="form-control"
              type="password"
              id="reg-confirm"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && <p style={{ color: 'var(--red-600)', marginBottom: '8px', fontSize: '14px' }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: '12px', width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.9rem' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            Try a free estimate
          </Link>
          <span style={{ margin: '0 8px', color: 'var(--gray-400)' }}>|</span>
          <Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
