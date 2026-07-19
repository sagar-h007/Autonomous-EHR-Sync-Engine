import { useClock } from '../hooks/useClock';

interface HeaderProps {
  apiOnline: boolean;
}

export default function Header({ apiOnline }: HeaderProps) {
  const time = useClock();

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-icon">🏥</div>
        <div>
          <div className="header-title">EHR Sync Engine</div>
          <div className="header-subtitle">Operations Dashboard</div>
        </div>
      </div>

      <div className="header-indicators">
        <div className="indicator">
          <div className={`indicator-dot ${apiOnline ? 'online' : ''}`} />
          <span>{apiOnline ? 'API Online' : 'API Offline'}</span>
        </div>
        <div className="indicator">
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>FHIR R4 · HAPI Server</span>
        </div>
        <div className="header-time">{time}</div>
      </div>
    </header>
  );
}
