import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

/**
 * Discriminated union for all API responses.
 * Every endpoint returns either { ok: true, data: T } or { ok: false, error, code }.
 *
 * The frontend can exhaustively check `ok` before accessing `data`:
 *   const result = await res.json();
 *   if (!result.ok) { handleError(result.error); return; }
 *   // result.data is now T
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode };

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNPROCESSABLE';

// ── Success helpers ──

export function ok<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json({ ok: true, data } as const, { status });
}

export function created<T>(data: T): NextResponse<ApiResult<T>> {
  return ok(data, 201);
}

// ── Error helpers ──

export function badRequest(error: string): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'BAD_REQUEST' as const }, { status: 400 });
}

export function unauthorized(error = 'Unauthorized'): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'UNAUTHORIZED' as const }, { status: 401 });
}

export function notFound(entity = 'Resource'): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error: `${entity} not found`, code: 'NOT_FOUND' as const }, { status: 404 });
}

export function validationError(error: string): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'VALIDATION_ERROR' as const }, { status: 400 });
}

export function unprocessable(error: string): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'UNPROCESSABLE' as const }, { status: 422 });
}

export function conflict(error: string): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'CONFLICT' as const }, { status: 409 });
}

export function upstreamError(error: string): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'UPSTREAM_ERROR' as const }, { status: 502 });
}

export function serverError(error = 'Internal server error'): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error, code: 'INTERNAL_ERROR' as const }, { status: 500 });
}

// ── Validation helper ──

/**
 * Validate a request body against a Zod schema.
 * Returns the parsed value on success, or a NextResponse error on failure.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown):
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<ApiResult<never>> } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const message = result.error.issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join('; ');
  return { ok: false, response: validationError(message) };
}
