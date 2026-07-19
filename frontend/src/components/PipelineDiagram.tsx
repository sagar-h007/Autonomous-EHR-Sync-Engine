import type { PipelineState, StepState } from '../types/api.types';

interface Step {
  key: keyof PipelineState;
  icon: string;
  name: string;
  desc: string;
  successLabel?: string;
  errorLabel?: string;
  warningLabel?: string;
}

const STEPS: Step[] = [
  {
    key:          'llm',
    icon:         '🤖',
    name:         'LLM Extraction',
    desc:         'Parse raw text → structured PatientData via Zod schema',
    successLabel: 'Extracted',
  },
  {
    key:          'fhir',
    icon:         '🔗',
    name:         'FHIR R4 Push',
    desc:         'POST Patient resource → hapi.fhir.org/baseR4',
    successLabel: 'Synced',
    errorLabel:   'Failed',
  },
  {
    key:          'automation',
    icon:         '🤖',
    name:         'Playwright Fallback',
    desc:         'Chromium fills legacy EHR portal (child_process.spawn)',
    successLabel: 'Submitted',
    errorLabel:   'Failed',
    warningLabel: 'Triggered',
  },
  {
    key:          'database',
    icon:         '🗄️',
    name:         'Prisma / Postgres',
    desc:         'Append-only IntakeLog record written to database',
    successLabel: 'Logged',
  },
];

function getBadge(state: StepState, step: Step) {
  if (state === 'success') return <span className="step-badge success">{step.successLabel ?? 'Done'}</span>;
  if (state === 'error')   return <span className="step-badge error">{step.errorLabel ?? 'Error'}</span>;
  if (state === 'active')  return <span className="step-badge active">Running…</span>;
  if (state === 'skipped') return <span className="step-badge warning">{step.warningLabel ?? 'Skipped'}</span>;
  return null;
}

interface PipelineDiagramProps {
  pipeline: PipelineState;
}

export default function PipelineDiagram({ pipeline }: PipelineDiagramProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-icon">⚡</div>
          Sync Pipeline
        </div>
      </div>
      <div className="card-body">
        <div className="pipeline">
          {STEPS.map((step) => {
            const state = pipeline[step.key];
            // Show automation step only when relevant
            if (step.key === 'automation' && state === 'idle') return null;
            return (
              <div key={step.key} className={`pipeline-step ${state}`}>
                <div className="step-node">{step.icon}</div>
                <div className="step-content">
                  <div className="step-name">
                    {step.name}
                    {getBadge(state, step)}
                  </div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
