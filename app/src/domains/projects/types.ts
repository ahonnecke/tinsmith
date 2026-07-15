import type { WeatherStation, DesignCondition } from '@/domains/weather/types';

export interface EquipmentSelections {
  ventilation: string[];
  equipment: string[];
  moisture: string[];
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  building_type: string;
  num_units: number | null;
  stories: number | null;
  year_built: number | null;
  weather_station: WeatherStation | null;
  design_conditions: DesignCondition[] | null;
  equipment_selections: EquipmentSelections | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  unit_count?: number;
}
