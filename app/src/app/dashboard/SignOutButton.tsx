'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await api.auth.logout();
    router.push('/');
  }

  return (
    <button
      onClick={handleSignOut}
      style={{ fontSize: '0.8rem', color: 'var(--gray-500)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      Sign Out
    </button>
  );
}
