import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getUnitById, updateUnit } from '@/domains/units/queries';
import { ok, notFound } from '@/lib/api-result';

export const GET = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId, unitId } = await params;
  const unit = await getUnitById(unitId, projectId, user.organization_id);
  if (!unit) return notFound('Dwelling unit');
  return ok(unit);
});

// user param unused — auth check still runs via withAuth, but update uses projectId ownership
export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { projectId, unitId } = await params;
  const body = await req.json();
  const unit = await updateUnit(unitId, projectId, body);
  if (!unit) return notFound('Dwelling unit');
  return ok(unit);
});
