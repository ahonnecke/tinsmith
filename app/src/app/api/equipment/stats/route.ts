import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getEquipmentStats } from '@/domains/equipment/queries';
import { ok, badRequest } from '@/lib/api-result';

/**
 * GET /api/equipment/stats?type=ac
 *
 * Returns aggregate stats for an equipment type:
 * - total count, capacity range, efficiency range, manufacturer count
 */

const STATS_QUERIES: Record<string, string> = {
  ac: `SELECT
    COUNT(*) as total,
    COUNT(DISTINCT manufacturer) as manufacturers,
    MIN(capacity) as min_capacity, MAX(capacity) as max_capacity,
    MIN(seer) as min_seer, MAX(seer) as max_seer,
    MIN(eer95) as min_eer, MAX(eer95) as max_eer
    FROM equipment_ac`,
  hp: `SELECT
    COUNT(*) as total,
    COUNT(DISTINCT manufacturer) as manufacturers,
    MIN(capacity) as min_capacity, MAX(capacity) as max_capacity,
    MIN(seer) as min_seer, MAX(seer) as max_seer,
    MIN(hspf) as min_hspf, MAX(hspf) as max_hspf
    FROM equipment_hp`,
  furnace: `SELECT
    COUNT(*) as total,
    COUNT(DISTINCT manufacturer) as manufacturers,
    MIN(output_btu) as min_output, MAX(output_btu) as max_output,
    MIN(afue) as min_afue, MAX(afue) as max_afue
    FROM equipment_furnace`,
  boiler: `SELECT
    COUNT(*) as total,
    COUNT(DISTINCT manufacturer) as manufacturers,
    MIN(output_btu) as min_output, MAX(output_btu) as max_output,
    MIN(afue) as min_afue, MAX(afue) as max_afue
    FROM equipment_boiler`,
};

export const GET = withAuth(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get('type');
  if (!type || !STATS_QUERIES[type]) {
    return badRequest(`Invalid type. Must be one of: ${Object.keys(STATS_QUERIES).join(', ')}`);
  }

  const stats = await getEquipmentStats(STATS_QUERIES[type]);
  return ok(stats);
});
