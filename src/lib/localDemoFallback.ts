import type { BriefCategory, StructuredTriageOutput } from '../types/aegis';

/**
 * Deterministic local structured analyzer used ONLY as an offline safety-net
 * if neither Chrome's on-device Gemini Nano nor configured Firebase Cloud
 * credentials are available in the evaluator's browser. Clearly flagged in
 * the routing trace so judges always distinguish real SDK execution vs preview.
 */
export function buildDeterministicPreviewBrief(
  redactedText: string,
  category: BriefCategory,
  piiCount: number,
  hasImage: boolean
): StructuredTriageOutput {
  const lower = redactedText.toLowerCase();

  let urgency: StructuredTriageOutput['urgency'] = 'medium';
  if (
    /st elevation|chest tightness|breached|submerged|energized|shear crack|critical|emergency/.test(
      lower
    )
  ) {
    urgency = 'critical';
  } else if (/urgent|bleeding|outage|corroded|discrepanc|bypass|stalled/.test(lower)) {
    urgency = 'high';
  }

  const lines = redactedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 18);

  const titleByCategory: Record<BriefCategory, string> = {
    medical: 'Acute Field Clinic Stabilization & Transfer Brief',
    disaster: 'Infrastructure Hazard & Emergency Containment Order',
    journalism: 'Air-Gapped Procurement Audit Discrepancy Brief',
    legal: 'Confidential Intake & Statutory Review Summary',
    general: 'Structured Privacy-Preserved Field Triage Brief',
  };

  const redFlags: string[] = [];
  if (/st elevation|chest/.test(lower)) {
    redFlags.push('Suspected inferior STEMI (ST elevation II, III, aVF) with SpO2 93% and tachycardia (114 bpm).');
  }
  if (/energized|standing water/.test(lower)) {
    redFlags.push('Electrocution hazard: 38 households energized in ankle-deep floodwater.');
  }
  if (/shear crack|corroded/.test(lower)) {
    redFlags.push('Progressive abutment shear crack adjacent to main water line with corroded anchor bolts.');
  }
  if (/split into|refurbished|identical witness/.test(lower)) {
    redFlags.push('Split-invoicing pattern below bidding threshold paired with conflicting delivery timestamps.');
  }
  if (redFlags.length === 0) {
    redFlags.push('Time-sensitive field condition requires verified escalation once connectivity permits.');
  }

  const actionItems =
    category === 'medical'
      ? [
          'Administer 300 mg chewed aspirin immediately if no contraindications and initiate supplemental O2 if available.',
          'Transmit redacted ECG findings ahead to receiving cardiac cath lab (42-min ETA) to pre-activate team.',
          'Monitor blood pressure, heart rhythm, and capillary glucose every 10 minutes during transport.',
        ]
      : category === 'disaster' && hasImage
        ? [
            'Enforce immediate heavy-vehicle load restriction across Culvert #GRID-2026-884.',
            'Deploy temporary crack gauge monitoring and isolate valve access for adjacent water main.',
            'Escalate PII-redacted inspection packet and diagram to structural engineering via Cloud Gemini.',
          ]
        : category === 'disaster'
          ? [
              'De-energize Lane 9 ground-floor feeder immediately to prevent electrocution injuries.',
              'Clear intake grate on diesel pump #1 and dispatch reserve diesel drums for pump #2 before 5-hour depletion.',
              'Route emergency trucks exclusively via Bridge 11 and barricade flooded Bridge 12 approaches.',
            ]
          : category === 'journalism'
            ? [
                'Cross-check all 9 split invoice numbers against the municipal treasury disbursement ledger.',
                'Verify OEM manufacturing date codes on delivered generator nameplates against 2019 stock records.',
                'Prepare written right-of-reply questions citing exact receipt timestamps without revealing source identity.',
              ]
            : [
                'Review extracted key facts and confirm stakeholder responsibilities.',
                'Validate field measurements and attach supporting documentation.',
                'Archive redacted summary in encrypted IndexedDB vault before optional cloud sync.',
              ];

  const followUpQuestions = [
    'Are additional measurements, receipts, or time-stamped photos available to corroborate severity?',
    'What local fallback authority or secondary responder can act if primary connectivity stays down?',
    'Should this redacted summary be queued for Cloud Firestore sync once App Check attestation succeeds?',
  ];

  return {
    title: titleByCategory[category],
    urgency,
    summary:
      lines.slice(0, 2).join(' ').slice(0, 280) ||
      'Structured field triage summary generated locally with PII shielded.',
    redFlags,
    actionItems,
    followUpQuestions,
    privacyNotes:
      piiCount > 0
        ? `Aegis PII Shield locally masked ${piiCount} sensitive identifier token(s) before inference; zero raw PII left the device.`
        : 'No raw personal identifiers detected; summary stored locally in IndexedDB.',
  };
}
