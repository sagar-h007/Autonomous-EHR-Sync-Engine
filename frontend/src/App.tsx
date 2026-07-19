import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Header         from './components/Header';
import IntakeForm     from './components/IntakeForm';
import PipelineDiagram from './components/PipelineDiagram';
import ResultPanel    from './components/ResultPanel';
import LogTable       from './components/LogTable';
import type { IntakeResult, PipelineState } from './types/api.types';

const IDLE_PIPELINE: PipelineState = {
  llm: 'idle', fhir: 'idle', automation: 'idle', database: 'idle',
};

export default function App() {
  const [apiOnline,       setApiOnline]       = useState(false);
  const [pipeline,        setPipeline]        = useState<PipelineState>(IDLE_PIPELINE);
  const [result,          setResult]          = useState<IntakeResult | null>(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [refreshTrigger,  setRefreshTrigger]  = useState(0);

  // Health-check the API on mount and every 30s
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/health');
      setApiOnline(res.ok);
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => void checkHealth(), 30_000);
    return () => clearInterval(id);
  }, [checkHealth]);

  return (
    <div className="app-layout">
      <Header apiOnline={apiOnline} />

      <div className="main-content">
        {/* ── Left column: form + pipeline ─────────────────────────────── */}
        <div className="left-column">
          <IntakeForm
            onResult={(r)    => setResult(r)}
            onPipeline={(p)  => setPipeline(p)}
            onLoading={(l)   => setIsLoading(l)}
            onRefreshLogs={() => setRefreshTrigger((n) => n + 1)}
          />
          <PipelineDiagram pipeline={pipeline} />
        </div>

        {/* ── Right column: result + log table ─────────────────────────── */}
        <div className="right-column">
          <ResultPanel result={result} isLoading={isLoading} />
          <LogTable refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
