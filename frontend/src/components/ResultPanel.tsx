import type { IntakeResult } from '../types/api.types';

interface ResultPanelProps {
  result: IntakeResult | null;
  isLoading: boolean;
}

function getBannerClass(status: IntakeResult['status']): string {
  if (status === 'SUCCESS_API')      return 'success';
  if (status === 'SUCCESS_FALLBACK') return 'warning';
  return 'error';
}

function getBannerIcon(status: IntakeResult['status']): string {
  if (status === 'SUCCESS_API')      return '✅';
  if (status === 'SUCCESS_FALLBACK') return '⚠️';
  return '❌';
}

export default function ResultPanel({ result, isLoading }: ResultPanelProps) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title"><div className="card-icon">📋</div> Sync Result</div>
        </div>
        <div className="card-body">
          <div className="result-empty">
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <div className="result-empty-text">Processing intake…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title"><div className="card-icon">📋</div> Sync Result</div>
        </div>
        <div className="card-body">
          <div className="result-empty">
            <div className="result-empty-icon">📭</div>
            <div className="result-empty-text">Submit an intake request to see the sync result here.</div>
          </div>
        </div>
      </div>
    );
  }

  const { patientData, status, fhirId, logId, message } = result;
  const bannerClass = getBannerClass(status);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><div className="card-icon">📋</div> Sync Result</div>
        <span className={`status-badge ${status}`}>
          {status === 'SUCCESS_API' ? '● FHIR API' : status === 'SUCCESS_FALLBACK' ? '● Fallback' : '● Failed'}
        </span>
      </div>
      <div className="card-body">

        {/* Status banner */}
        <div className={`result-status-banner ${bannerClass}`}>
          <div className="result-status-icon">{getBannerIcon(status)}</div>
          <div>
            <div className="result-status-title">
              {status === 'SUCCESS_API' ? 'FHIR API Sync Successful' :
               status === 'SUCCESS_FALLBACK' ? 'UI Automation Fallback Used' : 'All Sync Methods Failed'}
            </div>
            <div className="result-status-msg">{message}</div>
          </div>
        </div>

        {/* Patient demographics */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Extracted Demographics
        </div>
        <div className="result-grid">
          <div className="result-field">
            <div className="result-field-label">First Name</div>
            <div className="result-field-value">{patientData.firstName}</div>
          </div>
          <div className="result-field">
            <div className="result-field-label">Last Name</div>
            <div className="result-field-value">{patientData.lastName}</div>
          </div>
          <div className="result-field">
            <div className="result-field-label">Date of Birth</div>
            <div className="result-field-value mono">{patientData.dateOfBirth}</div>
          </div>
          <div className="result-field">
            <div className="result-field-label">Gender</div>
            <div className="result-field-value" style={{ textTransform: 'capitalize' }}>{patientData.gender}</div>
          </div>
          <div className="result-field full">
            <div className="result-field-label">Chief Complaint / Reason</div>
            <div className="result-field-value" style={{ fontSize: 12, lineHeight: 1.5 }}>{patientData.reason}</div>
          </div>
        </div>

        <div className="divider" />

        {/* IDs */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          System References
        </div>
        <div className="result-grid">
          <div className="result-field">
            <div className="result-field-label">Log ID</div>
            <div className="result-field-value mono" style={{ fontSize: 10 }}>{logId}</div>
          </div>
          <div className="result-field">
            <div className="result-field-label">FHIR Resource ID</div>
            <div className="result-field-value mono">
              {fhirId ? <span className="text-success">{fhirId}</span> : <span className="text-muted">—</span>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
