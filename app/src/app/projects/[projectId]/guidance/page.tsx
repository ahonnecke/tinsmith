import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';

export default async function GuidancePage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { projectId } = await params;

  return (
    <>
      <Header title="Software Guidance" user={user} />
      <div className="content">
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <h2 style={{ marginBottom: 8, color: 'var(--gray-700)' }}>Software Guidance</h2>
          <p className="text-muted mb-6">AI-assisted recommendations for Manual J input parameters and equipment sizing.</p>
          <span className="badge badge-processing" style={{ fontSize: '0.85rem', padding: '6px 16px' }}>Coming in Phase 2</span>
          <div className="mt-6">
            <Link href={`/projects/${projectId}/results`} className="btn btn-secondary">&larr; Back to Results</Link>
          </div>
        </div>
      </div>
    </>
  );
}
