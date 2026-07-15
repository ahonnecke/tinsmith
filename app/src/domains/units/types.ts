export interface BuildingParameters {
  cfm50: number;
  ceilingHeight: number;
  conditionedVolume: number;
  shelterClass: number;
  terrainClass: string;
  ventSystems: string;
  manualJSoftware: string;
  manualJVersion: string;
}

export interface LoadCondition {
  sensible?: number;
  latent?: number;
  total: number;
  shf?: number;
  infiltrationRate: number;
  infiltrationSensible?: number;
  infiltrationLatent?: number;
  infiltrationLoad?: number;
  ventilationRate: number;
  ventilationSensible?: number;
  ventilationLatent?: number;
  ventilationLoad?: number;
  floorArea: number;
  bedrooms: number;
  occupants?: number;
  internalGains?: number;
  designDB: number;
  designWB?: number;
  indoorDB: number;
  indoorRH?: number;
}

export interface LoadData {
  cooling1?: LoadCondition;
  dehu1?: LoadCondition;
  heating99?: LoadCondition;
  heating996?: LoadCondition;
}

export interface DwellingUnit {
  id: string;
  project_id: string;
  name: string;
  unit_type: string | null;
  bedrooms: number | null;
  floor_area: number | null;
  building_parameters: BuildingParameters | null;
  load_data: LoadData | null;
  created_at: string;
  updated_at: string;
}
