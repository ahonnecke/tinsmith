import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Project } from '@/lib/types';
import Header from '@/components/layout/Header';
import WeatherFetcher from './SetupClient';

export default async function SetupPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { projectId } = await params;
  const result = await pool.query<Project>(
    'SELECT * FROM projects WHERE id=$1 AND organization_id=$2',
    [projectId, user.organization_id]
  );
  const project = result.rows[0];
  if (!project) notFound();

  const dc = project.design_conditions ?? [];
  const ws = project.weather_station;

  return (
    <>
      <Header title="Phase 1: Project Setup" user={user} />
      <div className="content">

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Project Information</div>
              <div className="card-subtitle">Basic project details and location</div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-control form-readonly" type="text" defaultValue={project.name} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Building Type</label>
              <input className="form-control form-readonly" type="text" defaultValue={project.building_type} readOnly />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input className="form-control form-readonly" type="text" defaultValue={project.address ?? ''} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">ZIP Code</label>
              <input className="form-control form-readonly" type="text" defaultValue={project.zip_code ?? ''} readOnly />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-control form-readonly" type="text" defaultValue={project.city ?? ''} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-control form-readonly" type="text" defaultValue={project.state ?? ''} readOnly />
            </div>
          </div>
        </div>

        <WeatherFetcher
          projectId={projectId}
          address={project.address ?? ''}
          city={project.city ?? ''}
          state={project.state ?? ''}
          zip={project.zip_code ?? ''}
          weatherStation={ws ?? null}
          designConditions={dc}
        />

        <div className="flex-between mt-6">
          <Link href="/dashboard" className="btn btn-secondary">&larr; Back to Projects</Link>
          <Link href={`/projects/${projectId}/units`} className="btn btn-primary">Continue to Dwelling Units &rarr;</Link>
        </div>

      </div>
    </>
  );
}
