import type { EquipmentPackages, MoistureBalance } from '@/domains/equipment/types';

export interface Calculation {
  id: string;
  project_id: string;
  submitted_by: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  submitted_by_name?: string;
}

export interface Result {
  id: string;
  calculation_id: string;
  equipment_packages: EquipmentPackages | null;
  moisture_balance: MoistureBalance | null;
  created_at: string;
}

export interface CalculationWithResult extends Calculation {
  result?: Result;
  result_id?: string;
  equipment_packages?: EquipmentPackages | null;
  moisture_balance?: MoistureBalance | null;
  dwelling_unit_id?: string | null;
}
