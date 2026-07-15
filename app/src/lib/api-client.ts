import type { ApiResult } from '@/lib/api-result';
import type { User } from '@/domains/auth/types';
import type { Project } from '@/domains/projects/types';
import type { DwellingUnit } from '@/domains/units/types';
import type { Calculation } from '@/domains/calculations/types';

/**
 * Typed API client for frontend fetch calls.
 *
 * Every method returns ApiResult<T> — callers check `result.ok` before
 * accessing `result.data`. No more `any` responses from fetch().
 */

async function request<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, options);
  return res.json() as Promise<ApiResult<T>>;
}

function post<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function put<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  auth: {
    login: (email: string, password?: string) =>
      post<{ user: User }>('/api/auth/login', { email, password }),

    register: (email: string, password: string, name: string, organizationName: string) =>
      post<{ user: User }>('/api/auth/register', { email, password, name, organizationName }),

    logout: () =>
      post<{ ok: true }>('/api/auth/logout', {}),

    demo: () =>
      post<{ user: User }>('/api/auth/demo', {}),
  },

  projects: {
    update: (projectId: string, fields: Partial<Project>) =>
      put<Project>(`/api/projects/${projectId}`, fields),
  },

  units: {
    update: (projectId: string, unitId: string, fields: Record<string, unknown>) =>
      put<DwellingUnit>(`/api/projects/${projectId}/units/${unitId}`, fields),

    clone: (projectId: string, unitId: string) =>
      post<DwellingUnit>(`/api/projects/${projectId}/units/${unitId}/clone`, {}),
  },

  calculations: {
    run: (projectId: string) =>
      post<{
        calculation: Calculation & { status: string };
        units: { unitId: string; unitName: string; success: boolean; error?: string }[];
        summary: string;
      }>('/api/calculations', { projectId }),
  },
};
