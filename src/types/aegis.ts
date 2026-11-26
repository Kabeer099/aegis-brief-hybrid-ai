export type RoutingMode =
  | 'prefer_on_device'
  | 'only_on_device'
  | 'prefer_in_cloud';

export type BriefCategory =
  | 'medical'
  | 'legal'
  | 'disaster'
  | 'journalism'
  | 'general';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type ResolvedExecutionPath = 'on_device' | 'in_cloud';

export type OnDeviceAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'checking';

export interface PiiMatch {
  type: 'CNIC_ID' | 'SSN' | 'PHONE' | 'EMAIL' | 'CARD' | 'DOB' | 'PERSON_LABEL';
  placeholder: string;
  originalLength: number;
  start: number;
  end: number;
}

export interface PiiRedactionResult {
  redactedText: string;
  matches: PiiMatch[];
  redactionTimeMs: number;
}

export interface StructuredTriageOutput {
  title: string;
  urgency: UrgencyLevel;
  summary: string;
  redFlags: string[];
  actionItems: string[];
  followUpQuestions: string[];
  privacyNotes: string;
}

export interface TraceStep {
  id: string;
  label: string;
  detail: string;
  status: 'ok' | 'warn' | 'active' | 'fallback';
  durationMs?: number;
}

export interface TriageBriefRecord {
  id: string;
  title: string;
  category: BriefCategory;
  rawInputLocalOnly: string; // Never synced to Firestore! Kept strictly in local IndexedDB.
  redactedInput: string;
  output: StructuredTriageOutput;
  routingMode: RoutingMode;
  inferenceSource: 'on_device' | 'in_cloud' | 'hybrid_fallback';
  modelUsed: string;
  latencyMs: number;
  piiRedactedCount: number;
  bytesSentToCloud: number;
  hasImageAttachment: boolean;
  trace: TraceStep[];
  syncedToCloud: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryEvent {
  id: string;
  mode: RoutingMode;
  resolvedPath: ResolvedExecutionPath;
  latencyMs: number;
  piiMasked: number;
  offline: boolean;
  modelName: string;
  bytesSentToCloud: number;
  createdAt: string;
}

export interface RuntimeFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  recaptchaSiteKey?: string;
  appCheckDebugToken?: string;
  defaultCloudModel?: string;
}

export interface FirebaseRuntimeStatus {
  configured: boolean;
  projectId: string | null;
  appCheckMode: 'recaptcha_enterprise' | 'debug_token' | 'unconfigured';
  remoteConfigModel: string;
  remoteConfigSource: 'remote' | 'default';
  authUid: string | null;
  firestoreReady: boolean;
}
