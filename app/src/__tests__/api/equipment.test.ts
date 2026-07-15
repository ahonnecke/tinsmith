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
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}));

import { GET } from '@/app/api/equipment/route';
import { GET as getStats } from '@/app/api/equipment/stats/route';
import { GET as getMfrs } from '@/app/api/equipment/manufacturers/route';

describe('GET /api/equipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/equipment?type=ac');
    const res = await GET(req, noParams);
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing type', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    const req = new NextRequest('http://localhost/api/equipment');
    const res = await GET(req, noParams);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid type', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    const req = new NextRequest('http://localhost/api/equipment?type=invalid');
    const res = await GET(req, noParams);
    expect(res.status).toBe(400);
  });

  it('queries AC table with filters', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({
        rows: [
          { manufacturer: 'CARR', condenser_model: 'X1', capacity: 24000, seer: 16.0 },
        ],
      });

    const req = new NextRequest(
      'http://localhost/api/equipment?type=ac&manufacturer=CARR&minCapacity=18000&maxCapacity=36000&minSeer=14'
    );
    const res = await GET(req, noParams);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.total).toBe(5);
    expect(json.data.data).toHaveLength(1);

    const countCall = mockQuery.mock.calls[0];
    expect(countCall[0]).toContain('equipment_ac');
    expect(countCall[0]).toContain('manufacturer = $1');
    expect(countCall[0]).toContain('capacity >= $2');
    expect(countCall[0]).toContain('capacity <= $3');
    expect(countCall[0]).toContain('seer >= $4');
    expect(countCall[1]).toEqual(['CARR', 18000, 36000, 14]);
  });

  it('supports free-text search with q param', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = new NextRequest('http://localhost/api/equipment?type=hp&q=mitsubishi');
    const res = await GET(req, noParams);
    expect(res.status).toBe(200);

    const countCall = mockQuery.mock.calls[0];
    expect(countCall[0]).toContain('ILIKE');
    expect(countCall[1]).toEqual(['%mitsubishi%']);
  });

  it('caps limit at 200', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1000' }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = new NextRequest('http://localhost/api/equipment?type=ac&limit=999');
    const res = await GET(req, noParams);
    const json = await res.json();
    expect(json.data.limit).toBe(200);
  });
});

describe('GET /api/equipment/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stats for AC', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery.mockResolvedValueOnce({
      rows: [{
        total: '10000',
        manufacturers: '2',
        min_capacity: 16600,
        max_capacity: 60500,
        min_seer: 13.0,
        max_seer: 18.5,
        min_eer: 8.5,
        max_eer: 14.5,
      }],
    });

    const req = new NextRequest('http://localhost/api/equipment/stats?type=ac');
    const res = await getStats(req, noParams);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.total).toBe('10000');
    expect(json.data.min_seer).toBe(13.0);
  });
});

describe('GET /api/equipment/manufacturers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns manufacturer list with counts', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(fixtures.user.admin);
    mockQuery.mockResolvedValueOnce({
      rows: [
        { code: 'AIRQ', name: 'AirQuest', count: '5000' },
        { code: 'AMAN', name: 'Amana', count: '3000' },
      ],
    });

    const req = new NextRequest('http://localhost/api/equipment/manufacturers?type=ac');
    const res = await getMfrs(req, noParams);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.data[0].code).toBe('AIRQ');
  });
});
