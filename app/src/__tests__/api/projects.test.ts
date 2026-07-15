import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fixtures, noParams } from '../fixtures';

const { mockQuery, mockGetCurrentUser } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockGetCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: { query: mockQuery },
}));

vi.mock('@/domains/auth/jwt', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
  setCookie: vi.fn(),
  clearCookie: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

import { GET, POST } from '@/app/api/projects/route';

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/projects');
    const res = await GET(req, noParams);
    expect(res.status).toBe(401);
  });

  it('returns project list for authenticated user', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery.mockResolvedValueOnce({
      rows: [fixtures.project.basic],
    });

    const req = new NextRequest('http://localhost:3000/api/projects');
    const res = await GET(req, noParams);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe('Test Project');
  });

  it('passes search parameter to query', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = new NextRequest('http://localhost:3000/api/projects?search=oak');
    await GET(req, noParams);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['org1', 'oak', '%oak%'],
    );
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New' }),
    });
    const res = await POST(req, noParams);
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, noParams);
    expect(res.status).toBe(400);
  });

  it('creates project and audit log on success', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ ...fixtures.project.basic, id: 'p-new', name: 'Oak Ridge' }],
      })
      .mockResolvedValueOnce({ rows: [] }); // audit log insert

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Oak Ridge',
        city: 'Blacksburg',
        state: 'VA',
        building_type: 'Multi-Family',
      }),
    });

    const res = await POST(req, noParams);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.name).toBe('Oak Ridge');

    // Verify audit log was created
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
