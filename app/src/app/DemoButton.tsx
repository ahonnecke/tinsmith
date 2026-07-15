'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function DemoButton({ className = 'btn btn-sm btn-success', destination = '/dashboard' }: { className?: string; destination?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDemo() {
    setLoading(true);
    const result = await api.auth.demo();
    if (result.ok) {
      router.push(destination);
    }
    setLoading(false);
  }

  return (
    <button type="button" className={className} onClick={handleDemo} disabled={loading}>
      {loading ? 'Loading\u2026' : 'Try Demo'}
    </button>
  );
}
