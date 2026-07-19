import { useState } from 'react';
import type { IntakeResult, ApiResponse, PipelineState } from '../types/api.types';

const SAMPLE_TEXTS = [
  'Patient John Doe, male, born March 15 1985, presenting with persistent chest pain radiating to the left arm and shortness of breath on exertion. History of hypertension.',
  'Jane Smith, female, DOB 1990-07-22. Chief complaint: severe migraine with aura lasting 3 days, photosensitivity, nausea. No prior history.',
  'Robert Chen, 45yo male, DOB 1979-11-08. Presenting with fatigue, unexplained weight loss of 12lbs over 6 weeks, night sweats.',
];

const IDLE_PIPELINE: PipelineState = {
  llm: 'idle', fhir: 'idle', automation: 'idle', database: 'idle',
};

interface IntakeFormProps {
  onResult:      (result: IntakeResult) => void;
  onPipeline:    (state: PipelineState) => void;
  onLoading:     (loading: boolean) => void;
  onRefreshLogs: () => void;
}

export default function IntakeForm({ onResult, onPipeline, onLoading, onRefreshLogs }: IntakeFormProps) {
  const [rawText,           setRawText]           = useState(SAMPLE_TEXTS[0] ?? '');
  const [simulateFailure,   setSimulateFailure]   = useState(false);
  const [isSubmitting,      setIsSubmitting]       = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim() || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    onLoading(true);

    // Animate the pipeline in sequence
    onPipeline({ ...IDLE_PIPELINE, llm: 'active' });
    await delay(600);
    onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'active' });

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = `${baseUrl}/api/process-intake${simulateFailure ? '?simulateFhirFailure=true' : ''}`;
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rawText }),
      });

      const json = await res.json() as ApiResponse<IntakeResult>;

      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Unknown error');
      }

      const { status } = json.data;

      // Animate final states based on outcome
      if (status === 'SUCCESS_API') {
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'success', automation: 'idle', database: 'active' });
        await delay(400);
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'success', automation: 'idle', database: 'success' });
      } else if (status === 'SUCCESS_FALLBACK') {
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'error', automation: 'active', database: 'idle' });
        await delay(800);
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'error', automation: 'success', database: 'active' });
        await delay(400);
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'error', automation: 'success', database: 'success' });
      } else {
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'error', automation: 'error', database: 'active' });
        await delay(400);
        onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'error', automation: 'error', database: 'success' });
      }

      onResult(json.data);
      onRefreshLogs();

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      onPipeline({ ...IDLE_PIPELINE, llm: 'success', fhir: 'error', automation: 'idle', database: 'idle' });
    } finally {
      setIsSubmitting(false);
      onLoading(false);
    }
  }

  function loadSample() {
    const idx  = Math.floor(Math.random() * SAMPLE_TEXTS.length);
    setRawText(SAMPLE_TEXTS[idx] ?? '');
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-icon">📝</div>
          Patient Intake
        </div>
        <button
          onClick={loadSample}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: 11,
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border-accent)'; (e.target as HTMLElement).style.color = 'var(--cyan)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          ✦ Sample Text
        </button>
      </div>

      <div className="card-body">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-group">
            <label className="form-label">Raw Intake Text</label>
            <textarea
              className="form-textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste unstructured patient intake notes, physician dictation, or nurse observations…"
              disabled={isSubmitting}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
              {rawText.length} chars
            </div>
          </div>

          {/* Simulate FHIR failure toggle */}
          <div
            className={`toggle-row ${simulateFailure ? 'active' : ''}`}
            onClick={() => setSimulateFailure((v) => !v)}
          >
            <div className="toggle-label">
              <div className="toggle-title">⚡ Simulate FHIR Failure</div>
              <div className="toggle-desc">
                Force FHIR to fail → triggers Playwright automation fallback
              </div>
            </div>
            <div className={`toggle-switch ${simulateFailure ? 'on' : ''}`} />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: 12,
              marginBottom: 14,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn-submit ${simulateFailure ? 'warn' : ''} ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting || rawText.trim().length < 10}
          >
            {isSubmitting ? (
              <><div className="spinner" /> Processing…</>
            ) : simulateFailure ? (
              '⚡ Process Intake (Force Fallback)'
            ) : (
              '▶ Process Intake via FHIR'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
