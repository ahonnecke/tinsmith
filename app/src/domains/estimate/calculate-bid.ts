import type { WizardAnswers, BidResult, LineItem } from "./types";

// AHRI-aligned SEER ranges by efficiency tier
const SEER_RANGES: Record<string, { low: number; high: number }> = {
  standard: { low: 14, high: 15 },  // Code-minimum equipment
  mid: { low: 16, high: 18 },       // Mid-range (e.g. Carrier 24ACC636)
  high: { low: 19, high: 21 },      // Premium (e.g. Daikin DZ20VC)
};

// HSPF ranges for heat pumps by efficiency tier
const HSPF_RANGES: Record<string, { low: number; high: number }> = {
  standard: { low: 8.2, high: 8.8 },
  mid: { low: 9.0, high: 10.0 },
  high: { low: 10.5, high: 13.0 },
};

// AFUE ranges for furnaces by efficiency tier
const AFUE_RANGES: Record<string, { low: number; high: number }> = {
  standard: { low: 80, high: 83 },
  mid: { low: 90, high: 95 },
  high: { low: 96, high: 98 },
};

// Defaults for annual energy cost estimates
const DEFAULT_COOLING_HOURS = 1000;
const DEFAULT_ELECTRICITY_RATE = 0.14; // $/kWh

/**
 * Bid calculator using national-average price ranges and AHRI-aligned
 * efficiency data (SEER, HSPF, AFUE). Prices are national averages;
 * efficiency tiers match real AHRI-certified equipment ranges.
 */
export function calculateBid(answers: WizardAnswers): BidResult {
  const sqft = answers.homeDetails.squareFootage ?? 2000;
  const lineItems: LineItem[] = [];
  const notes: string[] = [];

  // Equipment cost — base ranges by system type (national averages)
  const equipmentRanges: Record<string, { low: number; high: number }> = {
    central_ac: { low: 3500, high: 7500 },
    heat_pump: { low: 4500, high: 10000 },
    furnace: { low: 2500, high: 6000 },
    mini_split: { low: 3000, high: 8000 },
    dual_fuel: { low: 6000, high: 14000 },
  };

  const systemType = answers.desiredSystem.systemType ?? "central_ac";
  const baseEquipment = equipmentRanges[systemType] ?? equipmentRanges.central_ac;
  const efficiencyTier = answers.desiredSystem.efficiencyTier ?? "standard";

  // Scale by size (baseline 2000 sqft)
  const sizeMultiplier = Math.max(0.7, Math.min(2.0, sqft / 2000));

  // Efficiency tier multiplier
  const efficiencyMultipliers: Record<string, number> = {
    standard: 1.0,
    mid: 1.2,
    high: 1.5,
  };
  const effMult = efficiencyMultipliers[efficiencyTier] ?? 1.0;

  // Build equipment description with SEER range
  const seerRange = SEER_RANGES[efficiencyTier] ?? SEER_RANGES.standard;
  const equipmentDesc = buildEquipmentDescription(systemType, efficiencyTier, seerRange);

  lineItems.push({
    category: "Equipment",
    description: equipmentDesc,
    estimatedCost: {
      low: Math.round(baseEquipment.low * sizeMultiplier * effMult),
      high: Math.round(baseEquipment.high * sizeMultiplier * effMult),
    },
  });

  // Annual energy cost estimates based on AHRI efficiency data
  addEnergyCostNotes(systemType, efficiencyTier, sqft, notes);

  // Labor
  const laborBase = systemType === "mini_split" ? { low: 2000, high: 4000 } : { low: 2500, high: 5000 };
  const laborMultiplier = answers.existingSystem.projectType === "new_install" ? 1.4 : 1.0;

  lineItems.push({
    category: "Labor",
    description: `Installation labor (${formatProjectType(answers.existingSystem.projectType ?? "replacement")})`,
    estimatedCost: {
      low: Math.round(laborBase.low * laborMultiplier * sizeMultiplier),
      high: Math.round(laborBase.high * laborMultiplier * sizeMultiplier),
    },
  });

  // Removal of old system
  if (answers.existingSystem.projectType === "replacement") {
    lineItems.push({
      category: "Removal",
      description: "Remove and dispose of existing equipment",
      estimatedCost: { low: 500, high: 1500 },
    });
  }

  // Ductwork
  if (answers.existingSystem.ductworkCondition === "needs_repair") {
    lineItems.push({
      category: "Ductwork",
      description: "Duct repair and sealing",
      estimatedCost: { low: 500, high: 2000 },
    });
  } else if (answers.existingSystem.ductworkCondition === "needs_replacement") {
    lineItems.push({
      category: "Ductwork",
      description: "Full ductwork replacement",
      estimatedCost: {
        low: Math.round(2000 * sizeMultiplier),
        high: Math.round(6000 * sizeMultiplier),
      },
    });
  } else if (answers.existingSystem.ductworkCondition === "no_ducts" && systemType !== "mini_split") {
    lineItems.push({
      category: "Ductwork",
      description: "New ductwork installation",
      estimatedCost: {
        low: Math.round(3000 * sizeMultiplier),
        high: Math.round(8000 * sizeMultiplier),
      },
    });
    notes.push("New ductwork required — consider mini-split to avoid this cost.");
  }

  // Additional ductwork mods
  if (answers.additionalWork.ductworkModification) {
    lineItems.push({
      category: "Ductwork",
      description: "Ductwork modifications and extensions",
      estimatedCost: { low: 800, high: 2500 },
    });
  }

  // Multi-zone
  const zones = answers.desiredSystem.zones ?? 1;
  if (zones > 1) {
    const zoneCost = systemType === "mini_split"
      ? { low: 1500 * (zones - 1), high: 3000 * (zones - 1) }
      : { low: 1000 * (zones - 1), high: 2500 * (zones - 1) };
    lineItems.push({
      category: "Zoning",
      description: `${zones}-zone setup (dampers, controls)`,
      estimatedCost: zoneCost,
    });
  }

  // Thermostat
  if (answers.additionalWork.thermostat) {
    lineItems.push({
      category: "Thermostat",
      description: "Smart thermostat (installed)",
      estimatedCost: { low: 200, high: 500 },
    });
  }

  // Electrical upgrade
  if (answers.additionalWork.electricalUpgrade) {
    lineItems.push({
      category: "Electrical",
      description: "Electrical panel upgrade",
      estimatedCost: { low: 1500, high: 4000 },
    });
  }

  // Permit
  if (answers.additionalWork.permitRequired) {
    lineItems.push({
      category: "Permit",
      description: "Building permit and inspection",
      estimatedCost: { low: 200, high: 800 },
    });
  }

  // Notes based on conditions
  if (answers.homeDetails.insulationQuality === "poor") {
    notes.push("Poor insulation may increase equipment sizing and energy costs. Consider insulation upgrades.");
  }
  if ((answers.homeDetails.yearBuilt ?? 2000) < 1980) {
    notes.push("Older home may require additional modifications for modern equipment.");
  }
  if (systemType === "heat_pump" && answers.existingSystem.fuelType === "natural_gas") {
    notes.push("Switching from gas to heat pump — verify electrical capacity for the new system.");
  }

  const totalLow = lineItems.reduce((sum, item) => sum + item.estimatedCost.low, 0);
  const totalHigh = lineItems.reduce((sum, item) => sum + item.estimatedCost.high, 0);

  return {
    lineItems,
    totalLow,
    totalHigh,
    notes,
    generatedAt: new Date().toISOString(),
  };
}

function formatSystemType(type: string): string {
  const labels: Record<string, string> = {
    central_ac: "Central AC + Furnace",
    heat_pump: "Heat Pump",
    furnace: "Furnace",
    mini_split: "Mini Split",
    dual_fuel: "Dual Fuel System",
  };
  return labels[type] ?? type;
}

function buildEquipmentDescription(
  systemType: string,
  tier: string,
  seerRange: { low: number; high: number },
): string {
  const effLabels: Record<string, string> = {
    standard: "Standard",
    mid: "Mid",
    high: "High",
  };
  const effLabel = effLabels[tier] ?? tier;

  if (systemType === "furnace") {
    const afue = AFUE_RANGES[tier] ?? AFUE_RANGES.standard;
    return `${formatSystemType(systemType)} (AFUE ${afue.low}-${afue.high}%) - ${effLabel} efficiency`;
  }

  return `${formatSystemType(systemType)} (SEER ${seerRange.low}-${seerRange.high}) - ${effLabel} efficiency`;
}

/**
 * Add annual energy cost projection notes based on AHRI efficiency data.
 * Formula: annualCost = (capacity * hours) / (efficiency * 1000) * rate
 * Capacity estimated at 1 BTU/sqft for rough sizing.
 */
function addEnergyCostNotes(
  systemType: string,
  tier: string,
  sqft: number,
  notes: string[],
): void {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
  // Rough capacity estimate: ~1 ton per 500 sqft = 12000 BTU per 500 sqft
  const coolingCapacity = (sqft / 500) * 12000; // BTU/h

  if (systemType !== "furnace") {
    const seer = SEER_RANGES[tier] ?? SEER_RANGES.standard;
    const costHigh = (coolingCapacity * DEFAULT_COOLING_HOURS) / (seer.low * 1000) * DEFAULT_ELECTRICITY_RATE;
    const costLow = (coolingCapacity * DEFAULT_COOLING_HOURS) / (seer.high * 1000) * DEFAULT_ELECTRICITY_RATE;
    notes.push(
      `Est. annual cooling cost: ${fmt(costLow)}-${fmt(costHigh)}/yr (SEER ${seer.low}-${seer.high}, 1000 cooling hrs, $0.14/kWh).`
    );
  }

  if (systemType === "heat_pump" || systemType === "dual_fuel") {
    const hspf = HSPF_RANGES[tier] ?? HSPF_RANGES.standard;
    const heatingHours = 1000;
    const costHigh = (coolingCapacity * heatingHours) / (hspf.low * 1000) * DEFAULT_ELECTRICITY_RATE;
    const costLow = (coolingCapacity * heatingHours) / (hspf.high * 1000) * DEFAULT_ELECTRICITY_RATE;
    notes.push(
      `Est. annual heating cost (heat pump): ${fmt(costLow)}-${fmt(costHigh)}/yr (HSPF ${hspf.low}-${hspf.high}).`
    );
  }
}

function formatProjectType(type: string): string {
  const labels: Record<string, string> = {
    replacement: "replacement",
    new_install: "new installation",
    addon: "add-on",
  };
  return labels[type] ?? type;
}
