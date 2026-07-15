import type { User } from '@/domains/auth/types';
import type { Project } from '@/domains/projects/types';

/**
 * Typed test fixtures.
 *
 * Each fixture conforms to its domain type at compile time.
 * Tests import these instead of defining ad-hoc plain objects.
 */

export const fixtures = {
  user: {
    admin: {
      id: 'u1',
      organization_id: 'org1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    } satisfies User,

    ben: {
      id: 'u1',
      organization_id: 'org1',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    } satisfies User,
  },

  /** User row as returned by getUserByEmail (includes password_hash + org_name). */
  userRow: {
    withPassword: {
      id: 'u1',
      organization_id: 'org1',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
      password_hash: '$2b$10$lguykqHwU4PFUB6hASxwF.LYRa/PQmiCvFlMIKmkyTOMEbbi3Sr/C', // password123
      org_name: 'Demo Org',
    },

    withoutPassword: {
      id: 'u1',
      organization_id: 'org1',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
      password_hash: null,
      org_name: 'Demo Org',
    },
  },

  project: {
    basic: {
      id: 'p1',
      organization_id: 'org1',
      name: 'Test Project',
      address: null,
      city: null,
      state: null,
      zip_code: null,
      building_type: 'Multi-Family',
      num_units: null,
      stories: null,
      year_built: null,
      weather_station: null,
      design_conditions: null,
      equipment_selections: null,
      status: 'draft',
      created_by: 'u1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } satisfies Project,
  },
} as const;

/** Empty route context for routes that don't use params. */
export const noParams = { params: Promise.resolve({}) };
