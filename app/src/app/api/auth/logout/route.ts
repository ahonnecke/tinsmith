import { NextResponse } from 'next/server';
import { clearCookie } from '@/domains/auth/jwt';
import { ApiResult, ok } from '@/lib/api-result';

export async function POST(): Promise<NextResponse<ApiResult<{ ok: true }>>> {
  const res = ok({ ok: true as const });
  res.headers.set('Set-Cookie', clearCookie());
  return res;
}
