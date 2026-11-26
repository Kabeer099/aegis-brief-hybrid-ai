import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Cpu,
  Database,
  Download,
  Eye,
  EyeOff,
  FileImage,
  Lock,
  Play,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { FIELD_PRESETS, type FieldPreset } from './data/presets';
import {
  executeHybridTriage,
  initializeFirebaseServices,
  loadSavedFirebaseConfig,
  probeChromeOnDeviceModel,
  saveRuntimeFirebaseConfig,
  syncRedactedBriefToFirestore,
  triggerChromeOnDeviceDownload,
} from './lib/firebaseHybrid';
import { redactPiiLocally } from './lib/piiShield';
import { generateSampleInspectionImage } from './lib/sampleImage';
import {
  deleteBriefLocal,
  listBriefsLocal,
  listTelemetryLocal,
  saveBriefLocal,
  saveTelemetryLocal,
} from './lib/vaultDb';
import type {
  BriefCategory,
  FirebaseRuntimeStatus,
  OnDeviceAvailability,
  RoutingMode,
  RuntimeFirebaseConfig,
  TelemetryEvent,
  TraceStep,
  TriageBriefRecord,
} from './types/aegis';

function renderHighlightedRedactedText(redactedText: string) {
  const parts = redactedText.split(/(\[REDACTED_[A-Z0-9_]+\])/g);
  return parts.map((segment, i) =>
    segment.startsWith('[REDACTED_') ? (
      <span key={i} className="pii-token">
        {segment}
      </span>
    ) : (
      <span key={i}>{segment}</span>
    )
  );
}

export default function App() {
  const [category, setCategory] = useState<BriefCategory>('medical');
  const [routingMode, setRoutingMode] = useState<RoutingMode>('prefer_on_device');
  const [rawInput, setRawInput] = useState<string>(FIELD_PRESETS[0].input);
  const [piiShieldEnabled, setPiiShieldEnabled] = useState<boolean>(true);
  const [showRedactedPreview, setShowRedactedPreview] = useState<boolean>(true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [deviceStatus, setDeviceStatus] = useState<OnDeviceAvailability>('checking');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [fbStatus, setFbStatus] = useState<FirebaseRuntimeStatus>({
    configured: false,
    projectId: null,
    appCheckMode: 'unconfigured',
    remoteConfigModel: 'gemini-4-hydrogen',
    remoteConfigSource: 'default',
    authUid: null,
    firestoreReady: false,
  });

  const [running, setRunning] = useState<boolean>(false);
  const [streamBuffer, setStreamBuffer] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeBrief, setActiveBrief] = useState<TriageBriefRecord | null>(null);
  const [usedPreviewNotice, setUsedPreviewNotice] = useState<boolean>(false);
  const [vaultBriefs, setVaultBriefs] = useState<TriageBriefRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);

  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [cfgDraft, setCfgDraft] = useState<RuntimeFirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    recaptchaSiteKey: '',
    appCheckDebugToken: 'true',
    defaultCloudModel: 'gemini-4-hydrogen',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    void probeChromeOnDeviceModel().then(setDeviceStatus);

    const savedCfg = loadSavedFirebaseConfig();
    if (savedCfg) {
      setCfgDraft(savedCfg);
    }
    void initializeFirebaseServices(savedCfg).then(setFbStatus);

    void Promise.all([listBriefsLocal(), listTelemetryLocal()]).then(([briefs, events]) => {
      setVaultBriefs(briefs);
      setTelemetry(events);
      if (briefs.length > 0) {
        setActiveBrief(briefs[0]);
      }
    });

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const redaction = useMemo(() => redactPiiLocally(rawInput), [rawInput]);
  const effectiveInputForAi = piiShieldEnabled ? redaction.redactedText : rawInput;
  const effectiveOffline = simulatedOffline || !browserOnline;

  const stats = useMemo(() => {
    const onDeviceRuns = telemetry.filter((t) => t.resolvedPath === 'on_device').length;
    const cloudRuns = telemetry.filter((t) => t.resolvedPath === 'in_cloud').length;
    const totalPiiMasked = telemetry.reduce((acc, t) => acc + t.piiMasked, 0);
    const avgLatency =
      telemetry.length > 0
        ? Math.round(telemetry.reduce((acc, t) => acc + t.latencyMs, 0) / telemetry.length)
        : 0;
    return { onDeviceRuns, cloudRuns, totalPiiMasked, avgLatency };
  }, [telemetry]);

  async function handleSelectPreset(preset: FieldPreset) {
    setCategory(preset.category);
    setRoutingMode(preset.recommendedMode);
    setRawInput(preset.input);
    setErrorMsg(null);
    if (preset.attachSampleImage) {
      const sample = await generateSampleInspectionImage();
      setImageFile(sample.file);
      setImagePreviewUrl(sample.dataUrl);
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  }

  async function handleAttachSampleImage() {
    const sample = await generateSampleInspectionImage();
    setImageFile(sample.file);
    setImagePreviewUrl(sample.dataUrl);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreviewUrl(url);
  }

  async function handleDownloadNano() {
    setErrorMsg(null);
    setDownloadProgress(0);
    try {
      const nextStatus = await triggerChromeOnDeviceDownload((pct) => setDownloadProgress(pct));
      setDeviceStatus(nextStatus);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to trigger Chrome Gemini Nano download. Check chrome://flags.'
      );
    } finally {
      setDownloadProgress(null);
    }
  }

  async function handleRunTriage() {
    if (!rawInput.trim()) return;
    setRunning(true);
    setErrorMsg(null);
    setStreamBuffer('');
    setUsedPreviewNotice(false);

    try {
      const result = await executeHybridTriage({
        category,
        redactedInput: effectiveInputForAi,
        piiRedactedCount: piiShieldEnabled ? redaction.matches.length : 0,
        redactionTimeMs: redaction.redactionTimeMs,
        routingMode,
        simulatedOffline,
        imageFile,
        onStreamChunk: (acc) => setStreamBuffer(acc),
      });

      const nowIso = new Date().toISOString();
      const id = `brief_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const teleEvent: TelemetryEvent = {
        id: `tele_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        mode: routingMode,
        resolvedPath: result.resolvedPath,
        latencyMs: result.latencyMs,
        piiMasked: piiShieldEnabled ? redaction.matches.length : 0,
        offline: effectiveOffline,
        modelName: result.modelUsed,
        bytesSentToCloud: result.bytesSentToCloud,
        createdAt: nowIso,
      };

      const briefRecord: TriageBriefRecord = {
        id,
        title: result.output.title,
        category,
        rawInputLocalOnly: rawInput,
        redactedInput: effectiveInputForAi,
        output: result.output,
        routingMode,
        inferenceSource: result.inferenceSource,
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
        piiRedactedCount: piiShieldEnabled ? redaction.matches.length : 0,
        bytesSentToCloud: result.bytesSentToCloud,
        hasImageAttachment: Boolean(imageFile),
        trace: result.trace,
        syncedToCloud: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Sync ONLY redacted summary + telemetry to Firestore if online & configured
      if (!effectiveOffline && fbStatus.firestoreReady && !result.usedPreviewSimulator) {
        const synced = await syncRedactedBriefToFirestore(briefRecord, teleEvent);
        briefRecord.syncedToCloud = synced;
      }

      await Promise.all([saveBriefLocal(briefRecord), saveTelemetryLocal(teleEvent)]);

      setUsedPreviewNotice(result.usedPreviewSimulator);
      setActiveBrief(briefRecord);
      setVaultBriefs((prev) => [briefRecord, ...prev]);
      setTelemetry((prev) => [teleEvent, ...prev]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    saveRuntimeFirebaseConfig(cfgDraft);
    const status = await initializeFirebaseServices(cfgDraft);
    setFbStatus(status);
    setConfigOpen(false);
  }

  async function handleClearConfig() {
    saveRuntimeFirebaseConfig(null);
    const status = await initializeFirebaseServices(null);
    setFbStatus(status);
    setConfigOpen(false);
  }

  async function handleDeleteBrief(id: string) {
    await deleteBriefLocal(id);
    setVaultBriefs((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeBrief?.id === id) {
        setActiveBrief(next[0] ?? null);
      }
      return next;
    });
  }

  function handleExportMarkdown(brief: TriageBriefRecord) {
    const md = `# ${brief.output.title}
- **Urgency:** ${brief.output.urgency.toUpperCase()}
- **Execution Path:** ${brief.inferenceSource} (${brief.modelUsed})
- **Latency:** ${brief.latencyMs}ms | **PII Redacted Locally:** ${brief.piiRedactedCount} | **Bytes Sent to Cloud:** ${brief.bytesSentToCloud} B

## Executive Summary
${brief.output.summary}

## Red Flags
${brief.output.redFlags.map((r) => `- ${r}`).join('\n')}

## Prioritized Action Items
${brief.output.actionItems.map((a, idx) => `${idx + 1}. ${a}`).join('\n')}

## Follow-Up Questions
${brief.output.followUpQuestions.map((q) => `- ${q}`).join('\n')}

## Privacy Audit
${brief.output.privacyNotes}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      {/* Top Hybrid AI Telemetry Bar */}
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-logo" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="brand-title">
              AegisBrief <span className="pill pill-emerald">#BuildHybridAI 2026</span>
            </h1>
            <p className="brand-sub">
              Firebase AI Logic Hybrid Inference · Local PII Shield · Offline-First Field Triage
            </p>
          </div>
        </div>

        <div className="status-pills">
          {/* On-Device Gemini Nano Status */}
          <span
            className={`pill ${
              deviceStatus === 'available'
                ? 'pill-emerald'
                : deviceStatus === 'downloadable' || deviceStatus === 'downloading'
                  ? 'pill-amber'
                  : 'pill-sky'
            }`}
            title="Chrome Prompt API / Gemini Nano on-device model readiness"
          >
            <Cpu size={14} />
            Nano: {deviceStatus === 'available' ? 'On-Device Ready' : deviceStatus}
          </span>

          {deviceStatus === 'downloadable' && (
            <button
              type="button"
              className="btn"
              onClick={handleDownloadNano}
              disabled={downloadProgress !== null}
            >
              <Download size={14} />
              {downloadProgress !== null ? `Downloading ${downloadProgress}%` : 'Download Nano'}
            </button>
          )}

          {/* Remote Config + Cloud Model */}
          <span
            className={`pill ${fbStatus.configured ? 'pill-sky' : 'pill-amber'}`}
            title="Cloud model resolved via Firebase Remote Config"
          >
            <Cloud size={14} />
            Cloud: {fbStatus.remoteConfigModel}
          </span>

          {/* Firebase App Check Badge */}
          <span
            className={`pill ${
              fbStatus.appCheckMode === 'unconfigured' ? 'pill-amber' : 'pill-violet'
            }`}
          >
            <Lock size={14} />
            App Check:{' '}
            {fbStatus.appCheckMode === 'recaptcha_enterprise'
              ? 'reCAPTCHA Ent.'
              : fbStatus.appCheckMode === 'debug_token'
                ? 'Debug Token'
                : 'Ready to Link'}
          </span>

          {/* Simulate Offline Toggle (for instant hybrid handoff testing) */}
          <button
            type="button"
            className={`btn ${effectiveOffline ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => setSimulatedOffline((v) => !v)}
            title="Toggle simulated cellular blackout to test offline-first hybrid handoff"
          >
            {effectiveOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
            {effectiveOffline ? 'Offline Mode' : 'Online'}
          </button>

          <button type="button" className="btn" onClick={() => setConfigOpen(true)}>
            <Settings size={14} />
            Firebase Config
          </button>
        </div>
      </header>

      {downloadProgress !== null && (
        <div style={{ padding: '8px 20px 0' }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Main 3-Column Hybrid Workspace */}
      <main className="workspace-grid">
        {/* LEFT RAIL: Field Scenarios + Offline IndexedDB Vault */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <Sparkles size={15} /> Field Scenarios
              </h2>
              <span className="small-meta">1-Click Test</span>
            </div>
            <div className="preset-list">
              {FIELD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-btn"
                  onClick={() => void handleSelectPreset(preset)}
                >
                  <div className="preset-top">
                    <span className="preset-name">{preset.label}</span>
                    <span className="preset-tag">{preset.badge}</span>
                  </div>
                  <div className="preset-desc">{preset.summary}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <h2 className="panel-title">
                <Database size={15} /> Local Vault ({vaultBriefs.length})
              </h2>
              <span className="small-meta">IndexedDB</span>
            </div>

            {vaultBriefs.length === 0 ? (
              <p className="preset-desc" style={{ margin: 0 }}>
                Saved triage briefs persist locally offline in IndexedDB. Only PII-redacted
                summaries sync to Firestore.
              </p>
            ) : (
              <div className="vault-list">
                {vaultBriefs.slice(0, 8).map((b) => (
                  <div
                    key={b.id}
                    className={`vault-item ${activeBrief?.id === b.id ? 'selected' : ''}`}
                    onClick={() => setActiveBrief(b)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setActiveBrief(b);
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <strong style={{ fontSize: '0.82rem' }}>{b.title}</strong>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ border: 'none', padding: 2, cursor: 'pointer', color: '#94a3b8' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteBrief(b.id);
                        }}
                        aria-label="Delete brief"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="small-meta">
                      <span className={`urgency-badge urgency-${b.output.urgency}`}>
                        {b.output.urgency}
                      </span>
                      <span>{b.inferenceSource}</span>
                      <span>{b.latencyMs}ms</span>
                      {b.syncedToCloud ? (
                        <span style={{ color: '#6ee7b7' }}>Synced</span>
                      ) : (
                        <span>Local Only</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        {/* CENTER WORKBENCH: Hybrid Mode Router + Composer + PII Shield + Live Output */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <Zap size={15} /> Firebase AI Logic InferenceMode Router
              </h2>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BriefCategory)}
                className="field-input"
                style={{ padding: '5px 9px', fontSize: '0.76rem' }}
                aria-label="Brief Category"
              >
                <option value="medical">Category: Rural Medical</option>
                <option value="disaster">Category: Disaster / Grid</option>
                <option value="journalism">Category: Investigative Source</option>
                <option value="legal">Category: Legal Aid Intake</option>
                <option value="general">Category: General Field Ops</option>
              </select>
            </div>

            <div className="mode-selector">
              <button
                type="button"
                className={`mode-card ${
                  routingMode === 'prefer_on_device' ? 'active-emerald' : ''
                }`}
                onClick={() => setRoutingMode('prefer_on_device')}
              >
                <div className="mode-card-title">
                  <Cpu size={14} /> PREFER_ON_DEVICE
                </div>
                <div className="mode-card-desc">
                  Runs Gemini Nano locally ($0, 0 B egress). Auto-hands off to Cloud{' '}
                  {fbStatus.remoteConfigModel} if needed.
                </div>
              </button>

              <button
                type="button"
                className={`mode-card ${routingMode === 'only_on_device' ? 'active-violet' : ''}`}
                onClick={() => setRoutingMode('only_on_device')}
              >
                <div className="mode-card-title">
                  <Lock size={14} /> ONLY_ON_DEVICE
                </div>
                <div className="mode-card-desc">
                  Strict air-gap privacy lock. Hard-blocks all cloud calls for whistleblower or
                  sensitive medical notes.
                </div>
              </button>

              <button
                type="button"
                className={`mode-card ${routingMode === 'prefer_in_cloud' ? 'active-sky' : ''}`}
                onClick={() => setRoutingMode('prefer_in_cloud')}
              >
                <div className="mode-card-title">
                  <Cloud size={14} /> PREFER_IN_CLOUD
                </div>
                <div className="mode-card-desc">
                  Prioritizes Cloud {fbStatus.remoteConfigModel} via App Check; drops seamlessly to
                  on-device Nano offline.
                </div>
              </button>
            </div>

            <textarea
              className="composer-area"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste raw clinic intake, disaster dispatch, legal intake, or field inspection notes..."
              aria-label="Field Note Input"
            />

            {/* Live Zero-Knowledge Local PII Shield Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="panel-header">
                <span className="pill pill-emerald">
                  <Shield size={13} />
                  Local PII Shield: {redaction.matches.length} identifier(s) masked in{' '}
                  {redaction.redactionTimeMs}ms
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setPiiShieldEnabled((v) => !v)}
                  >
                    {piiShieldEnabled ? 'Redaction ON' : 'Redaction OFF'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowRedactedPreview((v) => !v)}
                  >
                    {showRedactedPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showRedactedPreview ? 'Hide Sanitized' : 'Inspect Sanitized'}
                  </button>
                </div>
              </div>

              {showRedactedPreview && piiShieldEnabled && (
                <div className="pii-preview-box">
                  {renderHighlightedRedactedText(redaction.redactedText)}
                </div>
              )}
            </div>

            {/* Multimodal Photo Attachment + Action Run Row */}
            <div className="attachment-bar">
              <div className="thumb-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {imagePreviewUrl ? (
                  <>
                    <img src={imagePreviewUrl} alt="Field attachment" className="thumb-img" />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {imageFile?.name}
                      </div>
                      <div className="small-meta">
                        {Math.round((imageFile?.size || 0) / 1024)} KB · Multimodal JPEG/PNG input
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl(null);
                      }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileImage size={14} /> Attach Field Photo
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void handleAttachSampleImage()}
                    >
                      Generate Sample Inspection Diagram
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleRunTriage()}
                disabled={running || !rawInput.trim()}
              >
                <Play size={15} />
                {running ? 'Streaming Hybrid Inference...' : 'Run Hybrid AI Triage'}
              </button>
            </div>

            {errorMsg && (
              <div
                className="trace-item"
                style={{
                  borderColor: 'rgba(244, 63, 94, 0.5)',
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: '#fecdd3',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{errorMsg}</div>
              </div>
            )}
          </div>

          {/* Live Stream Output / Structured Triage Result */}
          {running && streamBuffer && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Activity size={15} /> Live Token Stream
                </h3>
                <span className="pill pill-sky">generateContentStream()</span>
              </div>
              <div className="stream-box">{streamBuffer}</div>
            </div>
          )}

          {activeBrief && (
            <article className="triage-card">
              <div className="panel-header" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    <span className={`urgency-badge urgency-${activeBrief.output.urgency}`}>
                      {activeBrief.output.urgency} urgency
                    </span>
                    <span
                      className={`pill ${
                        activeBrief.bytesSentToCloud === 0 ? 'pill-emerald' : 'pill-sky'
                      }`}
                    >
                      {activeBrief.bytesSentToCloud === 0 ? (
                        <Cpu size={12} />
                      ) : (
                        <Cloud size={12} />
                      )}
                      {activeBrief.modelUsed}
                    </span>
                    <span className="pill">
                      {activeBrief.latencyMs}ms · Cloud Egress: {activeBrief.bytesSentToCloud} B
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{activeBrief.output.title}</h2>
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={() => handleExportMarkdown(activeBrief)}
                >
                  <Download size={14} /> Export Brief (.md)
                </button>
              </div>

              {usedPreviewNotice && (
                <div
                  className="trace-item"
                  style={{
                    borderColor: 'rgba(245, 158, 11, 0.45)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#fde68a',
                  }}
                >
                  <CloudOff size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Interactive Preview Mode:</strong> Neither Chrome Gemini Nano nor
                    Firebase Web Config is active in this browser session. Click{' '}
                    <strong>Firebase Config</strong> above to connect your free Spark-tier Firebase
                    project for live <code>gemini-4-hydrogen</code> + on-device Gemini Nano
                    inference.
                  </div>
                </div>
              )}

              <div className="triage-section">
                <h4>Executive Summary</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: '#e2e8f0' }}>
                  {activeBrief.output.summary}
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 14,
                }}
              >
                <div className="triage-section">
                  <h4>Red Flags &amp; Hazards</h4>
                  <ul className="triage-list">
                    {activeBrief.output.redFlags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>

                <div className="triage-section">
                  <h4>Prioritized Field Actions</h4>
                  <ol className="triage-list">
                    {activeBrief.output.actionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="triage-section">
                <h4>Clarifying Questions for Responders</h4>
                <ul className="triage-list">
                  {activeBrief.output.followUpQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>

              <div
                className="trace-item"
                style={{
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  background: 'rgba(16, 185, 129, 0.08)',
                }}
              >
                <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                  <strong>Privacy Integrity:</strong> {activeBrief.output.privacyNotes}
                </div>
              </div>
            </article>
          )}
        </section>

        {/* RIGHT RAIL: Hybrid Routing Trace + Privacy & Cost Ledger */}
        <aside className="right-rail" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <Activity size={15} /> Live Hybrid Handoff Trace
              </h2>
            </div>

            {activeBrief?.trace?.length ? (
              <div className="trace-list">
                {activeBrief.trace.map((step: TraceStep) => (
                  <div key={step.id} className="trace-item">
                    <span className={`trace-dot dot-${step.status}`} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{step.label}</div>
                      <div style={{ color: '#94a3b8', lineHeight: 1.4 }}>{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="preset-desc" style={{ margin: 0 }}>
                Run any field scenario to inspect step-by-step PII redaction, Chrome Prompt API
                probing, Firebase AI Logic <code>InferenceMode</code> routing, and App Check
                verification.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">
                <ShieldCheck size={15} /> Privacy &amp; Hybrid Ledger
              </h2>
            </div>
            <div className="kpi-grid">
              <div className="kpi-box">
                <div className="kpi-val" style={{ color: '#6ee7b7' }}>
                  {stats.onDeviceRuns}
                </div>
                <div className="kpi-lbl">On-Device Runs ($0)</div>
              </div>
              <div className="kpi-box">
                <div className="kpi-val" style={{ color: '#7dd3fc' }}>
                  {stats.cloudRuns}
                </div>
                <div className="kpi-lbl">Cloud Escalations</div>
              </div>
              <div className="kpi-box">
                <div className="kpi-val" style={{ color: '#fcd34d' }}>
                  {stats.totalPiiMasked}
                </div>
                <div className="kpi-lbl">PII Tokens Shielded</div>
              </div>
              <div className="kpi-box">
                <div className="kpi-val">{stats.avgLatency}ms</div>
                <div className="kpi-lbl">Avg Inference Time</div>
              </div>
            </div>

            <div className="trace-item" style={{ flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>Firebase Stack Active</div>
              <div className="small-meta">
                <span>• Firebase AI Logic (<code>firebase/ai</code>)</span>
              </div>
              <div className="small-meta">
                <span>• App Check (<code>ReCaptchaEnterpriseProvider</code> / Debug)</span>
              </div>
              <div className="small-meta">
                <span>• Remote Config (<code>aegis_cloud_model</code>)</span>
              </div>
              <div className="small-meta">
                <span>• Firestore (<code>rules_version = '2'</code> owner-isolated)</span>
              </div>
            </div>
          </section>
        </aside>
      </main>

      {/* Runtime Firebase Config Modal for Judges & Developers */}
      {configOpen && (
        <div className="modal-backdrop" onClick={() => setConfigOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>
                Connect Firebase Project (Free Spark Tier)
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfigOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="preset-desc" style={{ margin: 0 }}>
              Connect any Firebase Web App with Firebase AI Logic (Gemini Developer API) enabled.
              Stored locally in your browser only.
            </p>
            <form
              onSubmit={(e) => void handleSaveConfig(e)}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {(
                [
                  ['apiKey', 'Firebase API Key'],
                  ['projectId', 'Project ID'],
                  ['appId', 'App ID'],
                  ['authDomain', 'Auth Domain (optional)'],
                  ['messagingSenderId', 'Messaging Sender ID (optional)'],
                  ['recaptchaSiteKey', 'reCAPTCHA Enterprise Site Key (leave blank for Debug Token)'],
                  ['appCheckDebugToken', 'App Check Debug Token ("true" or UUID)'],
                  ['defaultCloudModel', 'Default Cloud Model (Remote Config fallback)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="field-label">
                  {label}
                  <input
                    className="field-input"
                    value={cfgDraft[key] ?? ''}
                    onChange={(e) =>
                      setCfgDraft((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    required={key === 'apiKey' || key === 'projectId' || key === 'appId'}
                  />
                </label>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void handleClearConfig()}
                >
                  Disconnect
                </button>
                <button type="submit" className="btn btn-primary">
                  Save &amp; Initialize Firebase SDK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
