/**
 * Barrel re-export of all domain queries.
 *
 * Canonical imports should use domain paths (e.g., '@/domains/projects/queries').
 * This file exists for backward compatibility.
 */

export { getUserByEmail } from '@/domains/auth/queries';
export { listProjects, getProjectById, createProject, updateProject, deleteProject, projectExists, getProjectRaw, updateProjectStatus } from '@/domains/projects/queries';
export { listUnits, getUnitById, createUnit, updateUnit, getUnitsWithLoadData } from '@/domains/units/queries';
export { createCalculation, updateCalculationStatus, insertResult, listCalculationsWithResults, getCalculationWithResult, getLatestCompletedCalc } from '@/domains/calculations/queries';
export { getEquipmentStats, getEquipmentManufacturers } from '@/domains/equipment/queries';
export { insertAuditLog } from '@/domains/audit/queries';
