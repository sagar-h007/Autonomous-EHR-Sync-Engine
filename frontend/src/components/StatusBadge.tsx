import type { IntakeStatus } from '../types/api.types';

const CONFIG: Record<IntakeStatus, { label: string; dot: string }> = {
  SUCCESS_API:      { label: 'FHIR API',   dot: '●' },
  SUCCESS_FALLBACK: { label: 'Fallback',   dot: '●' },
  FAILED:           { label: 'Failed',     dot: '●' },
};

interface StatusBadgeProps {
  status: IntakeStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span className={`status-badge ${status}`}>
      {cfg.dot} {cfg.label}
    </span>
  );
}
