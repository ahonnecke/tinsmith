import { NextResponse } from 'next/server';
import { signToken, setCookie } from '@/domains/auth/jwt';
import { getUserByEmail } from '@/domains/auth/queries';
import { ApiResult, ok, serverError } from '@/lib/api-result';
import type { User } from '@/domains/auth/types';

const DEMO_EMAIL = 'admin@demo.tinsmith.dev';

/**
 * POST /api/auth/demo
 *
 * One-click demo login. No credentials required.
 * Logs in as the pre-seeded demo user with a populated project.
 */
export async function POST(): Promise<NextResponse<ApiResult<{ user: User }>>> {
  const user = await getUserByEmail(DEMO_EMAIL);
  if (!user) return serverError('Demo account not configured');

  const token = signToken({
    userId: user.id,
    email: user.email,
    orgId: user.organization_id,
    role: user.role,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _hash, ...safeUser } = user;
  const res = ok({ user: safeUser });
  res.headers.set('Set-Cookie', setCookie(token));
  return res;
}
