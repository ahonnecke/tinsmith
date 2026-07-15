import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fixtures } from '../fixtures';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

import { POST } from '@/app/api/auth/login/route';

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await POST(makeRequest({ email: 'nobody@test.com', password: 'x' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fixtures.userRow.withPassword] });
    const res = await POST(makeRequest({ email: 'admin@example.com', password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when password is missing but user has one set', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fixtures.userRow.withPassword] });
    const res = await POST(makeRequest({ email: 'admin@example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with Set-Cookie on correct password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fixtures.userRow.withPassword] });

    const res = await POST(makeRequest({ email: 'admin@example.com', password: 'password123' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.user.email).toBe('admin@example.com');
    expect(json.data.user.password_hash).toBeUndefined();

    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain('tinsmith_token=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('allows login without password if user has no hash set', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fixtures.userRow.withoutPassword] });
    const res = await POST(makeRequest({ email: 'admin@example.com' }));
    expect(res.status).toBe(200);
  });

  it('lowercases and trims email for lookup', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await POST(makeRequest({ email: '  Test@EXAMPLE.com  ', password: 'x' }));

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['test@example.com'],
    );
  });
});
