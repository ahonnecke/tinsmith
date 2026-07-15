import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { ok } from '@/lib/api-result';

export const GET = withAuth(async (_req: NextRequest, _ctx, user) => {
  return ok({ user });
});
