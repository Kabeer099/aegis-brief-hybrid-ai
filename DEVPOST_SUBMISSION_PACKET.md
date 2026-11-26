# AegisBrief — `#BuildHybridAI 2026` Devpost Submission Packet

- **Hackathon:** Google Firebase `#BuildHybridAI 2026` (`https://buildhybridai2026.devpost.com`)
- **Target Categories:** Grand Prize ($10,000) + Best Web / Chrome App ($3,000)
- **Deadline:** November 30, 2026 — 2:00 PM PST
- **Project Directory:** `C:\Users\Batman\.gemini\antigravity\scratch\aegis-brief-hybrid-ai`

---

## 1. Project Name & Tagline
- **Name:** `AegisBrief`
- **Tagline (<= 100 chars):** Offline-first hybrid AI field triage with local PII redaction via Firebase AI Logic & Gemini Nano.

## 2. Inspiration (Copy-Paste to Devpost)
Across South Asia and rural communities worldwide, frontline clinic workers, municipal disaster responders, legal aid offices, and local journalists regularly work through power load-shedding and cellular blackouts while handling deeply sensitive records (national IDs, patient vitals, phone numbers, witness names). Cloud-only AI tools fail the moment signal drops—and uploading raw patient or source PII to external servers violates trust and privacy.

We built **AegisBrief** to turn **Firebase AI Logic Hybrid Inference** from a simple fallback into a **zero-knowledge privacy and resilience architecture**: personal identifiers are masked locally in under 1 millisecond, routine triage runs strictly on-device with **Gemini Nano** (0 bytes cloud egress, works offline), and multimodal photo/deep-escalation handoffs seamlessly switch to **Cloud `gemini-4-hydrogen`** over **Firebase App Check** only after PII has been stripped.

## 3. What It Does
1. **Live Local PII Shield (0.4ms, zero network):** Detects and masks CNIC/national IDs, SSNs, phone numbers, email addresses, card numbers, dates of birth, and labeled patient/source names in-memory before any prompt leaves the browser.
2. **Real Firebase AI Logic Hybrid Router (`InferenceMode`):** Users can switch live between:
   - `InferenceMode.PREFER_ON_DEVICE`: Runs locally on Chrome Gemini Nano (`0 B` sent to cloud, works completely offline) and seamlessly hands off to Cloud `gemini-4-hydrogen` if on-device inference isn't available.
   - `InferenceMode.ONLY_ON_DEVICE`: Air-gapped privacy lock for whistleblower memos and sensitive clinical drafts—hard-blocks cloud transmission if Gemini Nano is unavailable.
   - `InferenceMode.PREFER_IN_CLOUD`: Uses Cloud `gemini-4-hydrogen` (dynamically controlled by Firebase Remote Config) for heavy multimodal inspection photos, dropping cleanly to on-device Nano when connectivity fails.
3. **Structured JSON Streaming + Live Handoff Telemetry HUD:** Streams live responses via `generateContentStream(...)`, enforces structured output with `Schema.object(...)`, reads the SDK's real `response.inferenceSource` (`on_device` vs `in_cloud`), and displays a transparent 4-step trace showing latency, PII tokens masked, and exact bytes sent to cloud.
4. **Offline-First IndexedDB Vault + Hardened Firestore Sync:** Every triage brief saves immediately to browser IndexedDB. Raw unredacted text NEVER leaves the device; only sanitized summaries and routing telemetry sync to Cloud Firestore under strict owner-isolated `rules_version = '2'` security rules (`firestore.rules`).

## 4. How We Built It
- **Frontend:** React 19 + TypeScript + Vite (`src/App.tsx`, `src/styles/app.css`).
- **AI Engine (`src/lib/firebaseHybrid.ts`):** `firebase@12` (`firebase/ai`: `getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode`, `InferenceSource`, `Schema`), Chrome Prompt API (`LanguageModel.availability()` + live download progress monitor), multimodal `FileReader` inline image parts + a 1-click synthetic engineering inspection diagram generator.
- **Firebase Security & Ops:** **Firebase App Check** (`ReCaptchaEnterpriseProvider` + automatic debug token support), **Firebase Remote Config** (`aegis_cloud_model` defaulting to free-tier `gemini-4-hydrogen`), **Firebase Auth** (Anonymous), **Cloud Firestore** (`firestore.rules` with default deny, `hasOnly`, immutable `createdAt`, size bounds), and **Firebase Hosting** (`firebase.json`).

## 5. 2.5-Minute Demo Video Script (YouTube — Max 3 Minutes!)
1. **0:00 – 0:25 (The Problem):** Show the AegisBrief workspace open in Chrome Desktop. Explain: "In field clinics and disaster zones with load-shedding, cloud-only AI crashes offline and leaks sensitive patient IDs. AegisBrief solves both with Firebase AI Logic Hybrid Inference."
2. **0:25 – 0:55 (On-Device + PII Shield + Offline Proof):** Click **Rural Clinic Intake**. Point to the green **Local PII Shield** masking CNIC, phone, email, and patient name in `< 1ms`. Toggle **Offline Mode** (or disable Wi-Fi). Keep `PREFER_ON_DEVICE` selected and click **Run Hybrid AI Triage**. Show the structured `CRITICAL` cardiac triage card streaming locally with **0 B sent to cloud** and `inferenceSource="on_device"`.
3. **0:55 – 1:35 (Air-Gap Privacy Lock):** Click **Air-Gapped Source Memo** (`ONLY_ON_DEVICE`). Show that sensitive whistleblower notes are locked to on-device execution—zero cloud egress allowed.
4. **1:35 – 2:15 (Multimodal Local-to-Cloud Handoff):** Re-enable online mode. Click **Photo Damage Escalation** (attaches the culvert structural inspection diagram + masks claimant CNIC & phone). Switch to `PREFER_IN_CLOUD` (or show automatic cloud fallback) and click **Run Hybrid AI Triage**. Point to the **Live Hybrid Handoff Trace** showing **App Check verification**, **Remote Config `gemini-4-hydrogen`**, and only the PII-redacted payload reaching the cloud!
5. **2:15 – 2:45 (Offline Vault + Security Architecture):** Show the **IndexedDB Local Vault**, **Privacy & Hybrid Ledger** KPIs, Export `.md`, and briefly flash `firestore.rules` + `src/lib/firebaseHybrid.ts` proving real Firebase AI Logic SDK & App Check integration.

## 6. Built With (Devpost Tags)
`firebase`, `firebase-ai-logic`, `gemini-nano`, `gemini-4-hydrogen`, `firebase-app-check`, `firebase-remote-config`, `cloud-firestore`, `firebase-hosting`, `chrome-built-in-ai`, `react`, `typescript`, `vite`, `indexeddb`
