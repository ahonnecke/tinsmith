import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { listProjects, createProject } from '@/domains/projects/queries';
import { insertAuditLog } from '@/domains/audit/queries';
import { CreateProjectSchema } from '@/domains/projects/schemas';
import { ok, created, validateBody } from '@/lib/api-result';

export const GET = withAuth(async (req: NextRequest, _ctx, user) => {
  const search = req.nextUrl.searchParams.get('search') || '';
  const projects = await listProjects(user.organization_id, search);
  return ok(projects);
});

export const POST = withAuth(async (req: NextRequest, _ctx, user) => {
  const body = await req.json();
  const parsed = validateBody(CreateProjectSchema, body);
  if (!parsed.ok) return parsed.response;

  const project = await createProject(user.organization_id, user.id, parsed.data);
  await insertAuditLog(user.id, { action: 'create', entityType: 'project', entityId: project.id });
  return created(project);
});
