import type { BriefCategory, RoutingMode } from '../types/aegis';

export interface FieldPreset {
  id: string;
  label: string;
  badge: string;
  category: BriefCategory;
  recommendedMode: RoutingMode;
  summary: string;
  attachSampleImage?: boolean;
  input: string;
}

export const FIELD_PRESETS: FieldPreset[] = [
  {
    id: 'clinic-triage',
    label: 'Rural Clinic Intake',
    badge: 'ON-DEVICE PII SHIELD',
    category: 'medical',
    recommendedMode: 'prefer_on_device',
    summary: 'Sensitive patient vitals with CNIC & phone — stays 100% local on Gemini Nano.',
    input: `Patient: Tariq Mahmood
CNIC: 42301-8841290-3
DOB: 1968-04-14
Contact: +92 300 4829104 | Email: tariq.m68@example.org
Location: Outpost Clinic B, Grid Outage (running on solar inverter, intermittent 3G).

Chief Complaint: 58yo male arrived after 4 hours of worsening chest tightness radiating to left shoulder, diaphoresis, and mild dizziness.
Vitals: BP 162/98 mmHg, HR 114 bpm irregular, SpO2 93% on room air, Temp 36.8 C, Blood Glucose 218 mg/dL.
History: Type 2 diabetes, missed metformin for 3 days, no known drug allergies.
Available onsite: Aspirin 300mg, portable ECG strip shows ST elevation in leads II, III, aVF. Nearest cardiac catheterization unit is 42 minutes away by ambulance.

Need immediate structured triage, red flags, stabilization checklist, and handover brief without exposing patient identifiers to external cloud servers.`,
  },
  {
    id: 'disaster-grid',
    label: 'Flood & Power Outage',
    badge: 'ZERO-SIGNAL OFFLINE',
    category: 'disaster',
    recommendedMode: 'prefer_on_device',
    summary: 'Zero-connectivity municipal field dispatch — survives total internet blackout.',
    input: `Resident: Nadia Qureshi
Phone: 0334-9102488
Sector 7-C Substation & Coastal Drain Inspection (02:15 local time, cellular towers offline).

Observations:
- Stormwater surge has breached retaining barrier B2 by 0.6 meters; water advancing toward transformer bay #4.
- Backup diesel pump #1 stalled due to clogged intake grate; pump #2 operating at 65% capacity with 5 hours of fuel remaining.
- 38 households on low-lying Lane 9 still have ground-floor power energized despite ankle-deep standing water.
- Access road via Bridge 11 is passable only for high-clearance trucks; Bridge 12 is submerged.

Produce an emergency action order, immediate life-safety cutoffs, resource allocation list, and radio-ready status summary.`,
  },
  {
    id: 'multimodal-inspection',
    label: 'Photo Damage Escalation',
    badge: 'HYBRID CLOUD HANDOFF',
    category: 'disaster',
    recommendedMode: 'prefer_on_device',
    attachSampleImage: true,
    summary: 'Attaches a field inspection diagram/photo + PII-redacted notes to showcase seamless Local-to-Cloud handoff.',
    input: `Claimant: Salman Siddiqui
CNIC: 42101-7734129-5
Contact: +92 321 7741029
Inspection Ticket: #GRID-2026-884

Attached field photo shows hairline shear cracking along the concrete culvert abutment and corroded steel anchor bolts adjacent to the main water distribution pipe.
Local field crew needs:
1. Visual assessment of the attached inspection photo combined with structural risk notes.
2. Immediate load-restriction recommendation for municipal vehicles.
3. Redacted escalation brief safe to transmit to structural engineers over Cloud Gemini when connectivity returns.`,
  },
  {
    id: 'journalist-vault',
    label: 'Air-Gapped Source Memo',
    badge: 'ONLY_ON_DEVICE LOCK',
    category: 'journalism',
    recommendedMode: 'only_on_device',
    summary: 'Forces InferenceMode.ONLY_ON_DEVICE — hard-blocks cloud egress to protect whistleblowers.',
    input: `Source: Kamran Jalil
Phone: +92 315 6602918
Email: k.jalil.whistle@proton.example
Meeting notes from municipal procurement audit review:
- Three emergency generator supply contracts totaling 14.8M PKR were split into 9 sub-threshold invoices dated 48 hours apart to bypass public competitive bidding rules.
- Serial numbers on delivered units match refurbished 2019 warehouse stock rather than the invoiced 2026 Tier-4 specifications.
- Two signed delivery receipts bear identical witness timestamps from facilities 19 km apart.

Organize verifiable document discrepancies, corroboration steps, and right-of-reply questions strictly on-device with zero cloud transmission.`,
  },
];
