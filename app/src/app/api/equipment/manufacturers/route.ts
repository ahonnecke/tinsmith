import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getEquipmentManufacturers } from '@/domains/equipment/queries';
import { ok, badRequest } from '@/lib/api-result';

/**
 * GET /api/equipment/manufacturers?type=ac
 *
 * Returns distinct manufacturer codes with full names and equipment counts.
 */

const MFR_QUERIES: Record<string, string> = {
  ac: `SELECT e.manufacturer as code, m.mfr_name as name, COUNT(*) as count
    FROM equipment_ac e
    LEFT JOIN equipment_clg_mfr m ON e.manufacturer = m.mfr_code
    GROUP BY e.manufacturer, m.mfr_name
    ORDER BY count DESC`,
  hp: `SELECT e.manufacturer as code, m.mfr_name as name, COUNT(*) as count
    FROM equipment_hp e
    LEFT JOIN equipment_clg_mfr m ON e.manufacturer = m.mfr_code
    GROUP BY e.manufacturer, m.mfr_name
    ORDER BY count DESC`,
  furnace: `SELECT e.manufacturer as code, m.mfr_name as name, COUNT(*) as count
    FROM equipment_furnace e
    LEFT JOIN equipment_htg_mfr m ON e.manufacturer = m.mfr_code
    GROUP BY e.manufacturer, m.mfr_name
    ORDER BY count DESC`,
  boiler: `SELECT e.manufacturer as code, m.mfr_name as name, COUNT(*) as count
    FROM equipment_boiler e
    LEFT JOIN equipment_htg_mfr m ON e.manufacturer = m.mfr_code
    GROUP BY e.manufacturer, m.mfr_name
    ORDER BY count DESC`,
};

export const GET = withAuth(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get('type');
  if (!type || !MFR_QUERIES[type]) {
    return badRequest(`Invalid type. Must be one of: ${Object.keys(MFR_QUERIES).join(', ')}`);
  }

  const manufacturers = await getEquipmentManufacturers(MFR_QUERIES[type]);
  return ok(manufacturers);
});
