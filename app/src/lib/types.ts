/**
 * Barrel re-export of all domain types.
 *
 * Canonical imports should use domain paths (e.g., '@/domains/projects/types').
 * This file exists for backward compatibility with frontend components.
 */

export type { Organization, User } from '@/domains/auth/types';
export type { WeatherStation, DesignCondition } from '@/domains/weather/types';
export type { EquipmentSelections, Project } from '@/domains/projects/types';
export type { BuildingParameters, LoadCondition, LoadData, DwellingUnit } from '@/domains/units/types';
export type { EquipmentPackage, EquipmentPackages, MoistureEntry, MoistureBalance } from '@/domains/equipment/types';
export type { Calculation, Result, CalculationWithResult } from '@/domains/calculations/types';
