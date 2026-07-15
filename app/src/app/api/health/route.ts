import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResult, ok, serverError } from '@/lib/api-result';

export async function GET(): Promise<NextResponse<ApiResult<{ status: string; db: string }>>> {
  try {
    await pool.query('SELECT 1');
    return ok({ status: 'ok', db: 'connected' });
  } catch {
    return serverError('Database connection failed');
  }
}
