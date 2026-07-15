/**
 * Barrel re-export of all domain schemas.
 *
 * Canonical imports should use domain paths (e.g., '@/domains/projects/schemas').
 * This file exists for backward compatibility.
 */

export { LoginSchema } from '@/domains/auth/schemas';
export type { LoginInput } from '@/domains/auth/schemas';

export { CreateProjectSchema } from '@/domains/projects/schemas';
export type { CreateProjectInput } from '@/domains/projects/schemas';

export { CreateUnitSchema } from '@/domains/units/schemas';
export type { CreateUnitInput } from '@/domains/units/schemas';

export { RunCalculationSchema } from '@/domains/calculations/schemas';
export type { RunCalculationInput } from '@/domains/calculations/schemas';
