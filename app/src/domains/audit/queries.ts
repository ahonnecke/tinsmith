import pool from '@/lib/db';
import type { AuditAction } from './types';

export async function insertAuditLog(userId: string, auditAction: AuditAction): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4)`,
    [userId, auditAction.action, auditAction.entityType, auditAction.entityId]
  );
}
