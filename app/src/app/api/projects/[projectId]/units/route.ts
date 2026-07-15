import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { projectExists } from '@/domains/projects/queries';
import { listUnits, createUnit } from '@/domains/units/queries';
import { CreateUnitSchema } from '@/domains/units/schemas';
import { ok, created, notFound, validateBody } from '@/lib/api-result';

export const GET = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId } = await params;
  if (!(await projectExists(projectId, user.organization_id))) return notFound('Project');

  const units = await listUnits(projectId);
  return ok(units);
});

export const POST = withAuth(async (req: NextRequest, { params }, user) => {
  const { projectId } = await params;
  if (!(await projectExists(projectId, user.organization_id))) return notFound('Project');

  const body = await req.json();
  const parsed = validateBody(CreateUnitSchema, body);
  if (!parsed.ok) return parsed.response;

  const unit = await createUnit(projectId, parsed.data);
  return created(unit);
});
