import pool from '@/lib/db';
import { MATCH_WINDOW } from '@/domains/sizing/config';
import type { LoadData } from '@/domains/units/types';
import type { EquipmentPackage, EquipmentPackages, MoistureBalance, MoistureEntry } from './types';

/**
 * Equipment selection engine: queries AHRI equipment database,
 * filters by capacity range matching dwelling unit loads,
 * ranks by efficiency into good/better/best tiers.
 *
 * The capacity window comes from sizing/config MATCH_WINDOW — the single
 * definition shared with the coarse matcher. This file previously carried its
 * own 0.90–1.25 window described as "ACCA Manual S"; that attribution was false
 * (those percentages were refuted during source verification — see
 * docs/sizing-methodology.md) and the two windows silently disagreed.
 */

interface EquipmentRow {
  id: string;
  manufacturer: string;
  condenser_model?: string;
  coil_model?: string;
  model?: string;
  capacity?: number;
  seer?: number;
  hspf?: number;
  eer95?: number;
  classification?: string;
  trade_name?: string;
  stages?: number;
  output_btu?: number;
  afue?: number;
  fuel?: string;
  high_capacity?: number;
  low_capacity?: number;
  high_cop?: number;
  low_cop?: number;
}

interface MfrName {
  mfr_code: string;
  mfr_name: string;
}

const CANDIDATE_LIMIT = 100;

function extractPeakLoads(loadData: LoadData): { peakCooling: number; peakHeating: number } {
  let peakCooling = 0;
  let peakHeating = 0;

  if (loadData.cooling1) {
    peakCooling = loadData.cooling1.total || 0;
  }
  if (loadData.dehu1) {
    peakCooling = Math.max(peakCooling, loadData.dehu1.total || 0);
  }
  if (loadData.heating99) {
    peakHeating = loadData.heating99.total || 0;
  }
  if (loadData.heating996) {
    peakHeating = Math.max(peakHeating, loadData.heating996.total || 0);
  }

  return { peakCooling, peakHeating };
}

async function lookupMfrName(mfrCode: string, type: 'cooling' | 'heating'): Promise<string> {
  const table = type === 'cooling' ? 'equipment_clg_mfr' : 'equipment_htg_mfr';
  const result = await pool.query<MfrName>(
    `SELECT mfr_name FROM ${table} WHERE mfr_code = $1 LIMIT 1`,
    [mfrCode]
  );
  return result.rows[0]?.mfr_name || mfrCode;
}

async function queryCoolingEquipment(
  table: 'equipment_ac' | 'equipment_hp',
  peakCooling: number,
): Promise<EquipmentRow[]> {
  const minCap = peakCooling * MATCH_WINDOW.coolingMin;
  const maxCap = peakCooling * MATCH_WINDOW.coolingMax;

  const result = await pool.query<EquipmentRow>(
    `SELECT id, manufacturer, condenser_model, coil_model, capacity, seer, eer95,
            classification, trade_name, stages
            ${table === 'equipment_hp' ? ', hspf, high_capacity, low_capacity, high_cop, low_cop' : ''}
     FROM ${table}
     WHERE capacity >= $1 AND capacity <= $2
     ORDER BY seer DESC
     LIMIT $3`,
    [minCap, maxCap, CANDIDATE_LIMIT]
  );

  return result.rows;
}

function pickTiers<T>(sorted: T[]): { good: T; better: T; best: T } | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return { good: sorted[0], better: sorted[0], best: sorted[0] };
  if (sorted.length === 2) return { good: sorted[0], better: sorted[1], best: sorted[1] };

  return {
    good: sorted[0],
    better: sorted[Math.floor(sorted.length / 2)],
    best: sorted[sorted.length - 1],
  };
}

function formatEquipmentLabel(row: EquipmentRow, mfrName: string): string {
  const model = row.condenser_model || row.model || 'Unknown';
  const tons = row.capacity ? `${(row.capacity / 12000).toFixed(1)}-ton` : '';
  return `${mfrName} ${model}${tons ? ` – ${tons}` : ''}`;
}

function estimateAnnualCost(
  peakCooling: number,
  peakHeating: number,
  seer: number,
  hspf: number,
  electricityRate = 0.12,
): number {
  const coolingKwh = seer > 0 ? (peakCooling * 1000) / (seer * 1000) : 0;
  const heatingKwh = hspf > 0 ? (peakHeating * 1500) / (hspf * 1000) : 0;
  return Math.round((coolingKwh + heatingKwh) * electricityRate);
}

function estimateComfortScore(seer: number, hspf: number, moisturePass: boolean): number {
  let score = 50;
  if (moisturePass) score += 15;
  score += Math.min((seer - 14) * 3, 20);
  score += Math.min((hspf - 7.5) * 3, 15);
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function estimateMoistureBalance(
  peakCooling: number,
  capacity: number,
  occupants: number,
): MoistureBalance {
  const runtime = Math.min(peakCooling / capacity, 1.0);
  const occMoisture = occupants * 2.1;
  const cookingMoisture = 4.1;
  const infiltration = 5.8;
  const ventilation = 8.4;

  const latentFraction = 0.25;
  const latentBtu = capacity * latentFraction;
  const acPints = (runtime * 24 * latentBtu) / 1054;

  const waterIn: MoistureEntry[] = [
    { source: `Occupant respiration (${occupants} occ)`, pintsPerDay: round1(occMoisture) },
    { source: 'Cooking / bathing', pintsPerDay: cookingMoisture },
    { source: 'Infiltration moisture', pintsPerDay: infiltration },
    { source: 'Ventilation moisture', pintsPerDay: ventilation },
  ];

  const waterOut: MoistureEntry[] = [
    { source: 'AC latent removal', pintsPerDay: round1(acPints) },
    { source: 'Exhaust (bath/kitchen)', pintsPerDay: 1.8 },
  ];

  const totalIn = waterIn.reduce((s, e) => s + e.pintsPerDay, 0);
  const totalOut = waterOut.reduce((s, e) => s + e.pintsPerDay, 0);

  if (totalIn > totalOut) {
    const dehuNeeded = (totalIn - totalOut) * 1.2;
    waterOut.push({ source: 'Dehumidifier removal', pintsPerDay: round1(dehuNeeded) });
  }

  const finalOut = waterOut.reduce((s, e) => s + e.pintsPerDay, 0);

  return {
    waterIn,
    waterOut,
    totalIn: round1(totalIn),
    totalOut: round1(finalOut),
    netBalance: round1(totalIn - finalOut),
    pass: totalIn <= finalOut,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface SelectionInput {
  loadData: LoadData;
  equipmentTypes: string[];
  occupants?: number;
}

export interface SelectionResult {
  equipmentPackages: EquipmentPackages;
  moistureBalance: MoistureBalance;
}

export async function selectEquipment(input: SelectionInput): Promise<SelectionResult> {
  const { loadData, equipmentTypes, occupants = 3 } = input;
  const { peakCooling, peakHeating } = extractPeakLoads(loadData);

  if (peakCooling === 0 && peakHeating === 0) {
    throw new Error('No load data available — cannot select equipment');
  }

  const queryAC = equipmentTypes.length === 0 || equipmentTypes.some(t =>
    ['ac', 'split_ducted', 'split', 'central_ac'].includes(t.toLowerCase())
  );
  const queryHP = equipmentTypes.some(t =>
    ['hp', 'heat_pump', 'mini_split', 'ducted_hp'].includes(t.toLowerCase())
  );

  let coolingRows: EquipmentRow[] = [];
  if (peakCooling > 0) {
    if (queryHP) {
      coolingRows = await queryCoolingEquipment('equipment_hp', peakCooling);
    }
    if (coolingRows.length === 0 && (queryAC || !queryHP)) {
      coolingRows = await queryCoolingEquipment('equipment_ac', peakCooling);
    }
    if (coolingRows.length === 0) {
      const wideResult = await pool.query<EquipmentRow>(
        `SELECT id, manufacturer, condenser_model, coil_model, capacity, seer, eer95,
                classification, trade_name, stages
         FROM equipment_ac
         WHERE capacity >= $1
         ORDER BY capacity ASC, seer DESC
         LIMIT $2`,
        [peakCooling * MATCH_WINDOW.wideningFloor, CANDIDATE_LIMIT]
      );
      coolingRows = wideResult.rows;
    }
  }

  coolingRows.sort((a, b) => (a.seer || 0) - (b.seer || 0));

  const tiers = pickTiers(coolingRows);
  if (!tiers) {
    throw new Error('No matching equipment found for the given load requirements');
  }

  const [goodMfr, betterMfr, bestMfr] = await Promise.all([
    lookupMfrName(tiers.good.manufacturer, 'cooling'),
    lookupMfrName(tiers.better.manufacturer, 'cooling'),
    lookupMfrName(tiers.best.manufacturer, 'cooling'),
  ]);

  const buildPackage = (
    tier: string,
    row: EquipmentRow,
    mfrName: string,
  ): EquipmentPackage => {
    const seer = row.seer || 14;
    const hspf = row.hspf || 8.0;
    const capacity = row.capacity || peakCooling;
    const moisture = estimateMoistureBalance(peakCooling, capacity, occupants);

    return {
      title: tier,
      equipment: formatEquipmentLabel(row, mfrName),
      seer2: seer.toFixed(1),
      hspf2: hspf.toFixed(1),
      ventilation: tier === 'Best' ? 'ERV (Energy Recovery Ventilator)' :
                   tier === 'Better' ? 'HRV (Heat Recovery Ventilator)' :
                   'Exhaust-Only (bath fans)',
      moisture: moisture.pass ? 'AC latent removal sufficient' : 'Supplemental dehumidifier recommended',
      annualCost: estimateAnnualCost(peakCooling, peakHeating, seer, hspf),
      comfortScore: estimateComfortScore(seer, hspf, moisture.pass),
      moisturePass: moisture.pass,
    };
  };

  const goodPkg = buildPackage('Good', tiers.good, goodMfr);
  const betterPkg = buildPackage('Better', tiers.better, betterMfr);
  const bestPkg = buildPackage('Best', tiers.best, bestMfr);

  const bestCapacity = tiers.best.capacity || peakCooling;
  const moistureBalance = estimateMoistureBalance(peakCooling, bestCapacity, occupants);

  return {
    equipmentPackages: {
      peakCooling: { value: peakCooling, unit: 'BTU/h' },
      peakHeating: { value: peakHeating, unit: 'BTU/h' },
      moistureDeficit: {
        value: round1(Math.max(moistureBalance.totalIn - moistureBalance.totalOut, 0)),
        unit: 'pints/day',
      },
      good: goodPkg,
      better: betterPkg,
      best: bestPkg,
    },
    moistureBalance,
  };
}
