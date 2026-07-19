import { useState, useEffect, useCallback } from 'react';
import type { IntakeLog, ApiResponse, LogsResult } from '../types/api.types';
import StatusBadge from './StatusBadge';

interface LogTableProps {
  refreshTrigger: number;  // increment to force a refresh
}

export default function LogTable({ refreshTrigger }: LogTableProps) {
  const [logs, setLogs]         = useState<IntakeLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [newIds, setNewIds]     = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/intake-logs?limit=25`);
      const json = await res.json() as ApiResponse<LogsResult>;
      if (json.success && json.data) {
        const incoming = json.data.logs;
        // Detect genuinely new rows (not in previous state)
        setLogs((prev) => {
          const prevIds = new Set(prev.map((l) => l.id));
          const added   = incoming.filter((l) => !prevIds.has(l.id)).map((l) => l.id);
          if (added.length > 0) {
            setNewIds(new Set(added));
            setTimeout(() => setNewIds(new Set()), 2000);
          }
          return incoming;
        });
        setTotal(json.data.total);
      }
    } catch {
      // Silent failure — table shows last known data
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + refresh trigger from parent (after each submission)
  useEffect(() => { void fetchLogs(); }, [fetchLogs, refreshTrigger]);

  // Poll every 8 seconds for background updates
  useEffect(() => {
    const id = setInterval(() => void fetchLogs(true), 8000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month:  'short',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  function formatPatient(log: IntakeLog): string {
    if (!log.patientData) return '—';
    return `${log.patientData.firstName} ${log.patientData.lastName}`;
  }

  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-header">
        <div className="card-title">
          <div className="card-icon">🗃️</div>
          Intake Log History
          <span className="log-count">{total} records</span>
        </div>
        <button
          className={`refresh-btn ${loading ? 'spinning' : ''}`}
          onClick={() => void fetchLogs()}
          title="Refresh"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="log-table-wrap">
        <table className="log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Patient</th>
              <th>Status</th>
              <th>FHIR ID</th>
              <th>Log ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={5}>
                  {loading ? 'Loading…' : 'No intake records yet. Submit your first intake above.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={newIds.has(log.id) ? 'new-row' : ''}>
                  <td className="table-mono">{formatDate(log.createdAt)}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {formatPatient(log)}
                  </td>
                  <td><StatusBadge status={log.status} /></td>
                  <td className="table-mono">
                    {log.fhirId
                      ? <span className="text-success">{log.fhirId}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="table-mono truncate" title={log.id}>{log.id.slice(0, 8)}…</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
