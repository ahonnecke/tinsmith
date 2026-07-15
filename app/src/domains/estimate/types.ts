export type SystemType = "central_ac" | "heat_pump" | "furnace" | "mini_split" | "dual_fuel";
export type FuelType = "electric" | "natural_gas" | "propane" | "oil";
export type HomeType = "single_family" | "townhouse" | "condo" | "manufactured";
export type DuctworkCondition = "good" | "needs_repair" | "needs_replacement" | "no_ducts";
export type ProjectType = "replacement" | "new_install" | "addon";

export interface HomeDetails {
  homeType: HomeType | null;
  squareFootage: number | null;
  stories: number | null;
  yearBuilt: number | null;
  insulationQuality: "poor" | "average" | "good" | null;
  /** IECC climate zone 1–8, for the coarse sizing estimate. */
  climateZone: number | null;
}

export interface ExistingSystem {
  projectType: ProjectType | null;
  currentSystemType: SystemType | null;
  currentSystemAge: number | null;
  fuelType: FuelType | null;
  ductworkCondition: DuctworkCondition | null;
}

export interface DesiredSystem {
  systemType: SystemType | null;
  fuelType: FuelType | null;
  efficiencyTier: "standard" | "mid" | "high" | null;
  zones: number | null;
}

export interface AdditionalWork {
  thermostat: boolean;
  ductworkModification: boolean;
  electricalUpgrade: boolean;
  permitRequired: boolean;
}

export interface WizardAnswers {
  homeDetails: HomeDetails;
  existingSystem: ExistingSystem;
  desiredSystem: DesiredSystem;
  additionalWork: AdditionalWork;
}

export interface LineItem {
  category: string;
  description: string;
  estimatedCost: { low: number; high: number };
}

export interface BidResult {
  lineItems: LineItem[];
  totalLow: number;
  totalHigh: number;
  notes: string[];
  generatedAt: string;
}

export const EMPTY_ANSWERS: WizardAnswers = {
  homeDetails: {
    homeType: null,
    squareFootage: null,
    stories: null,
    yearBuilt: null,
    insulationQuality: null,
    climateZone: null,
  },
  existingSystem: {
    projectType: null,
    currentSystemType: null,
    currentSystemAge: null,
    fuelType: null,
    ductworkCondition: null,
  },
  desiredSystem: {
    systemType: null,
    fuelType: null,
    efficiencyTier: null,
    zones: null,
  },
  additionalWork: {
    thermostat: false,
    ductworkModification: false,
    electricalUpgrade: false,
    permitRequired: true,
  },
};
