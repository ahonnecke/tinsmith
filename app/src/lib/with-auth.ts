import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/domains/auth/jwt';
import { unauthorized } from '@/lib/api-result';
import type { User } from '@/domains/auth/types';

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Wraps an API route handler with authentication.
 * The wrapped handler receives the authenticated User as its last argument.
 * Returns 401 automatically if no valid session exists.
 *
 * Usage:
 *   export const GET = withAuth(async (req, ctx, user) => { ... });
 *   export const POST = withAuth(async (req, ctx, user) => { ... });
 */
export function withAuth<T>(
  handler: (req: NextRequest, ctx: RouteContext, user: User) => Promise<NextResponse<T>>
): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse<T>> {
  return async (req: NextRequest, ctx: RouteContext) => {
    const user = await getCurrentUser();
    if (!user) return unauthorized() as NextResponse<T>;
    return handler(req, ctx, user);
  };
}
