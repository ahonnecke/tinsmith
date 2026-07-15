import type { Metadata } from 'next';
import Link from 'next/link';
import EstimateWizard from './EstimateWizard';
import DemoButton from './DemoButton';

export const metadata: Metadata = {
  title: 'Free HVAC Cost Estimate | Tinsmith',
  description: 'Get an instant HVAC installation cost estimate. Answer a few questions about your home and get a detailed breakdown of equipment, labor, and additional costs.',
  openGraph: {
    title: 'Free HVAC Cost Estimate',
    description: 'Instant HVAC installation cost breakdown — equipment, labor, permits, and more.',
    type: 'website',
  },
};

/**
 * Homepage — public estimate wizard. No auth required.
 * Top of funnel: homeowners/installers get a quick HVAC cost estimate.
 * Conversion: "Try Demo" → dashboard, "Sign Up" → registration.
 */
export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', padding: '16px 0' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>
            HVAC <span style={{ color: 'var(--primary)' }}>3.0</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--gray-500)', marginLeft: 8 }}>Quick Estimate</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <DemoButton />
            <Link href="/login" className="btn btn-sm btn-secondary">Sign In</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 768, margin: '0 auto', padding: '32px 16px' }}>
        <EstimateWizard />
      </main>
    </div>
  );
}
