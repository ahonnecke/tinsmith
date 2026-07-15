import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, setCookie } from '@/domains/auth/jwt';
import { getUserByEmail, createUserWithOrganization } from '@/domains/auth/queries';
import { RegisterSchema } from '@/domains/auth/schemas';
import { ApiResult, ok, conflict, serverError, validateBody } from '@/lib/api-result';
import type { User } from '@/domains/auth/types';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResult<{ user: User & { org_name: string } }>>> {
  const body = await req.json();
  const parsed = validateBody(RegisterSchema, body);
  if (!parsed.ok) return parsed.response;

  const { email, password, name, organizationName } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) return conflict('An account with this email already exists');

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserWithOrganization(email, passwordHash, name, organizationName);

    const token = signToken({
      userId: user.id,
      email: user.email,
      orgId: user.organization_id,
      role: user.role,
    });

    const res = ok({ user });
    res.headers.set('Set-Cookie', setCookie(token));
    return res;
  } catch {
    return serverError('Failed to create account');
  }
}
