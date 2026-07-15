import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { DwellingUnit } from '@/lib/types';
import Header from '@/components/layout/Header';
import UnitEditorClient from './UnitEditorClient';

export default async function UnitEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; unitId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { projectId, unitId } = await params;
  const result = await pool.query<DwellingUnit>(
    `SELECT du.* FROM dwelling_units du
     JOIN projects p ON p.id = du.project_id
     WHERE du.id=$1 AND du.project_id=$2 AND p.organization_id=$3`,
    [unitId, projectId, user.organization_id]
  );
  const unit = result.rows[0];
  if (!unit) notFound();

  return (
    <>
      <Header title={unit.name} user={user} />
      <div className="content">
        <UnitEditorClient unit={unit} projectId={projectId} />
      </div>
    </>
  );
}
