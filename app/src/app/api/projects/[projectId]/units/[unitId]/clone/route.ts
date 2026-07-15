import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getUnitById, createUnit } from '@/domains/units/queries';
import { created, notFound } from '@/lib/api-result';

export const POST = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId, unitId } = await params;
  const src = await getUnitById(unitId, projectId, user.organization_id);
  if (!src) return notFound('Dwelling unit');

  const clone = await createUnit(src.project_id, {
    name: src.name + ' (Copy)',
    unit_type: src.unit_type,
    bedrooms: src.bedrooms,
    floor_area: src.floor_area,
    building_parameters: src.building_parameters,
    load_data: src.load_data,
  });
  return created(clone);
});
