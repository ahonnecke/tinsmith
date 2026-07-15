export interface EquipmentPackage {
  title: string;
  equipment: string;
  seer2: string;
  hspf2: string;
  ventilation: string;
  moisture: string;
  annualCost: number;
  comfortScore: number;
  moisturePass: boolean;
}

export interface EquipmentPackages {
  peakCooling: { value: number; unit: string };
  peakHeating: { value: number; unit: string };
  moistureDeficit: { value: number; unit: string };
  good: EquipmentPackage;
  better: EquipmentPackage;
  best: EquipmentPackage;
}

export interface MoistureEntry {
  source: string;
  pintsPerDay: number;
}

export interface MoistureBalance {
  waterIn: MoistureEntry[];
  waterOut: MoistureEntry[];
  totalIn: number;
  totalOut: number;
  netBalance: number;
  pass: boolean;
}
