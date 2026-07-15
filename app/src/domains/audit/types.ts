/**
 * Discriminated union of all auditable actions.
 *
 * Adding a new action variant here forces every call site to handle it.
 * Each action documents what entity it targets.
 *
 * Registry of where each action is triggered:
 *   - project.created    → POST /api/projects
 *   - calculation.submitted → POST /api/calculations (on success)
 */
export type AuditAction =
  | { action: 'create'; entityType: 'project'; entityId: string }
  | { action: 'submit_calculation'; entityType: 'calculation'; entityId: string };
