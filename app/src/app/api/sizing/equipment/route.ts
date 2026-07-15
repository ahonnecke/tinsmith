import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, badRequest, validateBody } from '@/lib/api-result';
import { matchEquipment } from '@/domains/sizing/match';

/**
 * POST /api/sizing/equipment
 * Public (the estimate wizard is unauthenticated). Body:
 *   { coolingBtuh, heatingOutputBtuh, systemType? }
 * Returns real AHRI-listed models that fit the coarse target size.
 */
const schema = z.object({
  coolingBtuh: z.number().min(0).max(500000),
  heatingOutputBtuh: z.number().min(0).max(500000),
  systemType: z
    .enum(['central_ac', 'heat_pump', 'furnace', 'mini_split', 'dual_fuel'])
    .nullish(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = validateBody(schema, body);
  if (!parsed.ok) return parsed.response;

  const matches = await matchEquipment(parsed.data);
  return ok(matches);
}
