import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { getProjectRaw, updateProjectStatus } from '@/domains/projects/queries';
import { getUnitsWithLoadData } from '@/domains/units/queries';
import { createCalculation, updateCalculationStatus, insertResult } from '@/domains/calculations/queries';
import { insertAuditLog } from '@/domains/audit/queries';
import { RunCalculationSchema } from '@/domains/calculations/schemas';
import { selectEquipment } from '@/domains/equipment/selection';
import { ok, badRequest, notFound, unprocessable, validateBody } from '@/lib/api-result';

export const POST = withAuth(async (req: NextRequest, _ctx, user) => {
  const body = await req.json();
  const parsed = validateBody(RunCalculationSchema, body);
  if (!parsed.ok) return parsed.response;

  const { projectId } = parsed.data;

  const project = await getProjectRaw(projectId, user.organization_id);
  if (!project) return notFound('Project');

  const units = await getUnitsWithLoadData(projectId);
  if (units.length === 0) {
    return badRequest('No dwelling unit with load data found. Enter load data before running calculations.');
  }

  const equipmentTypes: string[] = project.equipment_selections?.equipment || [];

  const calc = await createCalculation(projectId, user.id);

  try {
    const unitResults: { unitId: string; unitName: string; success: boolean; error?: string }[] = [];

    for (const unit of units) {
      if (!unit.load_data) {
        unitResults.push({ unitId: unit.id, unitName: unit.name, success: false, error: 'No load data' });
        continue;
      }

      const occupants = (unit.bedrooms || 2) + 1;

      try {
        const { equipmentPackages, moistureBalance } = await selectEquipment({
          loadData: unit.load_data,
          equipmentTypes,
          occupants,
        });

        await insertResult(calc.id, unit.id, equipmentPackages, moistureBalance);
        unitResults.push({ unitId: unit.id, unitName: unit.name, success: true });
      } catch (err) {
        unitResults.push({
          unitId: unit.id,
          unitName: unit.name,
          success: false,
          error: err instanceof Error ? err.message : 'Equipment selection failed',
        });
      }
    }

    const successCount = unitResults.filter(r => r.success).length;
    if (successCount === 0) {
      throw new Error(`All ${unitResults.length} unit(s) failed: ${unitResults.map(r => r.error).join('; ')}`);
    }

    await updateCalculationStatus(calc.id, 'completed');
    await insertAuditLog(user.id, { action: 'submit_calculation', entityType: 'calculation', entityId: calc.id });
    await updateProjectStatus(projectId, 'completed');

    return ok({
      calculation: { ...calc, status: 'completed' },
      units: unitResults,
      summary: `${successCount}/${unitResults.length} unit(s) processed`,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Equipment selection failed';
    await updateCalculationStatus(calc.id, 'failed');
    return unprocessable(message);
  }
});
