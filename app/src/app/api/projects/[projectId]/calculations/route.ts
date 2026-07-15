import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { projectExists } from '@/domains/projects/queries';
import { listCalculationsWithResults } from '@/domains/calculations/queries';
import { ok, notFound } from '@/lib/api-result';

export const GET = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId } = await params;
  if (!(await projectExists(projectId, user.organization_id))) return notFound('Project');

  const calcs = await listCalculationsWithResults(projectId);
  return ok(calcs);
});
