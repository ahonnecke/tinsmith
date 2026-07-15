import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getProjectById, updateProject, deleteProject } from '@/domains/projects/queries';
import { ok, notFound } from '@/lib/api-result';

export const GET = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId } = await params;
  const project = await getProjectById(projectId, user.organization_id);
  if (!project) return notFound('Project');
  return ok(project);
});

export const PUT = withAuth(async (req: NextRequest, { params }, user) => {
  const { projectId } = await params;
  const body = await req.json();
  const project = await updateProject(projectId, user.organization_id, body);
  if (!project) return notFound('Project');
  return ok(project);
});

export const DELETE = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId } = await params;
  const deleted = await deleteProject(projectId, user.organization_id);
  if (!deleted) return notFound('Project');
  return ok({ id: projectId });
});
