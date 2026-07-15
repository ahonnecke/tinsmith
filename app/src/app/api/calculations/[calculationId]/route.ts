import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getCalculationWithResult } from '@/domains/calculations/queries';
import { ok, notFound } from '@/lib/api-result';

export const GET = withAuth(async (_req: NextRequest, { params }, user) => {
  const { calculationId } = await params;
  const calc = await getCalculationWithResult(calculationId, user.organization_id);
  if (!calc) return notFound('Calculation');
  return ok(calc);
});
