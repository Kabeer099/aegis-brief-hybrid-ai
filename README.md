# AegisBrief — Offline-First Hybrid AI Privacy & Field Triage Workspace

> Built for **Google Firebase `#BuildHybridAI 2026`** — Powered by **Firebase AI Logic Hybrid Inference** (`InferenceMode.PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`), **Gemini Nano** (Chrome Prompt API), **Gemini 4 Hydrogen** (`gemini-4-hydrogen` via Gemini Developer API), **Firebase App Check**, **Firebase Remote Config**, **Firebase Auth**, **Cloud Firestore**, and an offline-first **IndexedDB** vault.

## Why AegisBrief?

Field clinics, disaster response teams, legal aid workers, and investigative journalists in regions with unreliable power or mobile networks face an impossible trade-off:

1. **Cloud-only AI fails during blackouts / load-shedding** and forces sensitive patient, claimant, or source identifiers (CNIC, SSN, phone, DOB, names) across external networks.
2. **On-device-only AI cannot always run** on every device or handle deep cloud-scale multimodal analysis when connectivity returns.

**AegisBrief turns Firebase AI Logic Hybrid Inference into a privacy-and-resilience security architecture:**

```
Raw Field Note (+ Optional Inspection Photo)
   │
   ▼
[1] Local In-Memory PII Shield (0.4ms, zero network)
    Masks CNIC / SSN / Phone / Email / DOB / Card / Labeled Names -> [REDACTED_*]
   │
   ▼
[2] Chrome Built-in AI Probe (`LanguageModel.availability()`)
    + Live On-Device Gemini Nano Download Monitor
   │
   ▼
[3] Firebase AI Logic SDK (`getGenerativeModel(ai, { mode, onDeviceParams, inCloudParams })`)
    ├─ InferenceMode.PREFER_ON_DEVICE  ──▶ Runs locally on Gemini Nano (0 B cloud egress, works offline!)
    │                                       Falls back seamlessly to Cloud `gemini-4-hydrogen` if Nano unavailable
    ├─ InferenceMode.ONLY_ON_DEVICE    ──▶ Air-Gapped Lock (hard-blocks cloud egress; throws if Nano missing)
    └─ InferenceMode.PREFER_IN_CLOUD   ──▶ Cloud `gemini-4-hydrogen` (via App Check + Remote Config),
                                            falls back to On-Device Nano if offline!
   │
   ▼
[4] Streaming Structured JSON Output (`Schema.object(...)`) + Live Routing Trace HUD
    Saved immediately to local IndexedDB Vault; optional PII-redacted sync to Cloud Firestore
    under owner-isolated `firestore.rules`.
```

## Key Features

- **Real Firebase AI Logic Hybrid Inference (`src/lib/firebaseHybrid.ts`)**: Uses `getAI(app, { backend: new GoogleAIBackend() })`, `getGenerativeModel(ai, { mode, onDeviceParams, inCloudParams })`, `generateContentStream(...)`, structured `Schema.object(...)`, and reads the SDK's real `response.inferenceSource` (`on_device` vs `in_cloud`).
- **Firebase App Check Built-In**: Automatically initializes `initializeAppCheck` with `ReCaptchaEnterpriseProvider` in production or `FIREBASE_APPCHECK_DEBUG_TOKEN` for local/CI verification.
- **Firebase Remote Config Dynamic Model Switching**: Fetches `aegis_cloud_model` remotely so the cloud fallback model (default `gemini-4-hydrogen` on the free Gemini Developer API tier — no billing required) can be updated without redeploying the frontend.
- **Chrome Gemini Nano Setup & Download Progress Helper**: Detects `LanguageModel.availability()` live in the top bar and provides a 1-click download progress bar right inside the workspace.
- **Live Zero-Knowledge PII Shield**: Highlights every masked token before inference, tracks `Bytes Sent to Cloud` (`0 B` on-device), and NEVER uploads raw unredacted notes to Firestore.
- **Multimodal Inspection Escalation**: Supports PNG/JPEG drag-and-drop plus a 1-click synthetic engineering inspection diagram generator so judges can test multimodal Local-to-Cloud handoff instantly.
- **Offline-First Vault + Hardened Firestore Rules**: Every triage brief persists in browser IndexedDB immediately and syncs only PII-redacted summaries to `users/{uid}/briefs/{briefId}` with strict schema validation in `firestore.rules`.

## Quick Start (Local Development & Judging)

### Prerequisites

- **Node.js 20+** and `npm`
- **Google Chrome Desktop v139+** (for on-device Gemini Nano inference):
  1. Open `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and set to **Enabled**.
  2. Relaunch Chrome.
  3. Open AegisBrief and click **Download Gemini Nano** in the top status bar if status shows `Downloadable`.

### 1. Install & Run Locally

```bash
npm install
cp .env.example .env
# Fill in your Firebase Web App config from Firebase Console (Free Spark tier works!)
npm run dev
```

*(Tip for judges: You can also click **Firebase Config** in the top-right bar to paste your Firebase Web Config JSON at runtime in-browser without editing `.env`!)*

### 2. Enable Firebase AI Logic & App Check

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use <your-project-id>
npx -y firebase-tools@latest init ailogic
npx -y firebase-tools@latest deploy --only firestore:rules,hosting
```

- In **Firebase Console → App Check**, register the debug token printed in DevTools Console (when `VITE_APP_CHECK_DEBUG_TOKEN=true`) or configure a **reCAPTCHA Enterprise** site key.
- In **Firebase Console → Remote Config**, optionally add string parameter `aegis_cloud_model` with value `gemini-4-hydrogen` (or `gemini-3.8-flash` / `gemini-3.5-flash-lite`).

### 3. Run Tests & Production Build

```bash
npm test
npm run build
```

## Architecture & Security

- `src/lib/firebaseHybrid.ts`: Initializes Firebase App, App Check, Remote Config, Auth (Anonymous), Firestore, and Firebase AI Logic hybrid inference (`InferenceMode.PREFER_ON_DEVICE` / `ONLY_ON_DEVICE` / `PREFER_IN_CLOUD`).
- `src/lib/piiShield.ts`: Sub-millisecond local PII detector & redactor (CNIC, SSN, phone, email, card numbers, DOB, labeled names).
- `src/lib/vaultDb.ts`: Offline-first IndexedDB storage for briefs and hybrid telemetry ledger.
- `firestore.rules`: Strict `rules_version = '2'` owner-isolated schema-enforcing security rules (default deny, `hasOnly`, immutable `createdAt`, DoS size caps).

## License

MIT License — see [LICENSE](./LICENSE).
