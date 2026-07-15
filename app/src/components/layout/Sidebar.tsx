'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  projectId: string;
  projectName: string;
}

const steps = [
  { num: 1, label: 'Project Setup', path: 'setup' },
  { num: 2, label: 'Dwelling Units', path: 'units' },
  { num: 3, label: 'System Selection', path: 'systems' },
  { num: 4, label: 'Calculation', path: 'calculation' },
  { num: 5, label: 'Results', path: 'results' },
];

const tools = [
  { label: 'Equipment Comparison', path: 'comparison' },
  { label: 'Software Guidance', path: 'guidance' },
  { label: 'Audit Trail', path: 'audit' },
  { label: 'Report / PDF', path: 'report' },
];

export default function Sidebar({ projectId, projectName }: SidebarProps) {
  const pathname = usePathname();

  function getStepState(stepPath: string): 'active' | 'completed' | '' {
    const base = `/projects/${projectId}`;
    if (pathname.startsWith(`${base}/${stepPath}`)) return 'active';
    const stepIndex = steps.findIndex(s => s.path === stepPath);
    const activeIndex = steps.findIndex(s => pathname.startsWith(`${base}/${s.path}`));
    if (activeIndex > stepIndex) return 'completed';
    return '';
  }

  function isToolActive(toolPath: string): boolean {
    return pathname.startsWith(`/projects/${projectId}/${toolPath}`);
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">HVAC <span>3.0</span></div>
      <div className="sidebar-nav">
        <div className="sidebar-section">{projectName}</div>
        {steps.map(step => {
          const state = getStepState(step.path);
          return (
            <Link
              key={step.path}
              href={`/projects/${projectId}/${step.path}`}
              className={`sidebar-link${state ? ' ' + state : ''}`}
            >
              <span className="icon">
                {state === 'completed' ? '✓' : step.num}
              </span>
              {step.label}
            </Link>
          );
        })}

        <div className="sidebar-section" style={{ marginTop: 24 }}>Tools</div>
        {tools.map(tool => (
          <Link
            key={tool.path}
            href={`/projects/${projectId}/${tool.path}`}
            className={`sidebar-link${isToolActive(tool.path) ? ' active' : ''}`}
          >
            <span className="icon" style={{ fontSize: '0.65rem' }}>
              {tool.path === 'comparison' ? '⇄' : tool.path === 'guidance' ? '?' : tool.path === 'audit' ? '⌚' : '📄'}
            </span>
            {tool.label}
            <span className="deferred-tag">MVP-2</span>
          </Link>
        ))}
      </div>
      <div className="sidebar-footer">
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
          &larr; All Projects
        </Link>
      </div>
    </nav>
  );
}
