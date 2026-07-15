import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, setCookie } from '@/domains/auth/jwt';
import { getUserByEmail } from '@/domains/auth/queries';
import { LoginSchema } from '@/domains/auth/schemas';
import { ApiResult, ok, badRequest, unauthorized, validateBody } from '@/lib/api-result';
import type { User } from '@/domains/auth/types';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResult<{ user: Omit<User, 'password_hash'> & { org_name: string } }>>> {
  const body = await req.json();
  const parsed = validateBody(LoginSchema, body);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;

  // email is already trimmed and lowercased by Zod schema
  const user = await getUserByEmail(email);
  if (!user) return unauthorized('Invalid credentials');

  if (user.password_hash) {
    if (!password) return badRequest('Password required');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return unauthorized('Invalid credentials');
  }

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
