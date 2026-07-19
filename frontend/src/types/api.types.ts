// Shared types between frontend and backend (mirrored — no dep on backend pkg)

export type IntakeStatus = 'SUCCESS_API' | 'SUCCESS_FALLBACK' | 'FAILED';

export interface PatientData {
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;
  gender:      'male' | 'female' | 'other' | 'unknown';
  reason:      string;
}

export interface IntakeResult {
  logId:       string;
  status:      IntakeStatus;
  patientData: PatientData;
  fhirId?:     string;
  message:     string;
}

export interface IntakeLog {
  id:          string;
  rawText:     string;
  patientData: PatientData | null;
  fhirId:      string | null;
  status:      IntakeStatus;
  errorDetail: string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  error?:  { code: string; message: string; };
}

export interface LogsResult {
  logs:  IntakeLog[];
  total: number;
}

// Pipeline step state
export type StepState = 'idle' | 'active' | 'success' | 'error' | 'skipped';

export interface PipelineState {
  llm:        StepState;
  fhir:       StepState;
  automation: StepState;
  database:   StepState;
}
