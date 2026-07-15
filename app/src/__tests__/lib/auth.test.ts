import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

// Set env before import
process.env.JWT_SECRET = 'test-secret-key';

import { signToken, verifyToken, setCookie, clearCookie, type JwtPayload } from '@/lib/auth';

const testPayload: JwtPayload = {
  userId: 'user-1',
  email: 'test@example.com',
  orgId: 'org-1',
  role: 'admin',
};

describe('signToken / verifyToken', () => {
  it('round-trips a JWT payload', () => {
    const token = signToken(testPayload);
    const decoded = verifyToken(token);
    expect(decoded).toMatchObject(testPayload);
  });

  it('returns null for an invalid token', () => {
    expect(verifyToken('garbage')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(verifyToken('')).toBeNull();
  });

  it('includes standard JWT claims', () => {
    const token = signToken(testPayload);
    const decoded = verifyToken(token);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });
});

describe('setCookie', () => {
  it('returns a properly formatted Set-Cookie header', () => {
    const cookie = setCookie('my-token');
    expect(cookie).toContain('tinsmith_token=my-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=');
  });

  it('sets a 7-day max age', () => {
    const cookie = setCookie('t');
    const maxAge = parseInt(cookie.match(/Max-Age=(\d+)/)![1]);
    expect(maxAge).toBe(7 * 24 * 3600);
  });
});

describe('clearCookie', () => {
  it('sets Max-Age=0', () => {
    const cookie = clearCookie();
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('tinsmith_token=');
  });
});
