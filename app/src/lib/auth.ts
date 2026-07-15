/**
 * Barrel re-export of auth domain.
 *
 * Canonical imports should use '@/domains/auth/jwt'.
 * This file exists for backward compatibility.
 */

export { signToken, verifyToken, getCurrentUser, setCookie, clearCookie } from '@/domains/auth/jwt';
export type { JwtPayload } from '@/domains/auth/types';
