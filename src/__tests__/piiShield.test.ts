import { describe, expect, it } from 'vitest';
import { redactPiiLocally } from '../lib/piiShield';
import { buildDeterministicPreviewBrief } from '../lib/localDemoFallback';

describe('AegisBrief Local PII Shield', () => {
  it('masks CNIC, phone, email, DOB, and labeled patient names locally', () => {
    const raw = `Patient: Tariq Mahmood
CNIC: 42301-8841290-3
DOB: 1968-04-14
Contact: +92 300 4829104 | Email: tariq.m68@example.org`;

    const res = redactPiiLocally(raw);
    expect(res.matches.length).toBeGreaterThanOrEqual(5);
    expect(res.redactedText).not.toContain('Tariq Mahmood');
    expect(res.redactedText).not.toContain('42301-8841290-3');
    expect(res.redactedText).not.toContain('tariq.m68@example.org');
    expect(res.redactedText).not.toContain('4829104');
    expect(res.redactedText).toContain('[REDACTED_PERSON_1]');
    expect(res.redactedText).toContain('[REDACTED_ID_1]');
    expect(res.redactedText).toContain('[REDACTED_EMAIL_1]');
  });

  it('masks SSN and 16-digit card numbers without altering clinical metrics', () => {
    const raw = 'SSN 123-45-6789 Card 4532-1190-8832-7741 BP 162/98 SpO2 93% HR 114';
    const res = redactPiiLocally(raw);
    expect(res.redactedText).not.toContain('123-45-6789');
    expect(res.redactedText).not.toContain('4532-1190-8832-7741');
    expect(res.redactedText).toContain('BP 162/98 SpO2 93% HR 114');
  });

  it('handles empty input cleanly', () => {
    const res = redactPiiLocally('');
    expect(res.redactedText).toBe('');
    expect(res.matches).toHaveLength(0);
  });
});

describe('AegisBrief Deterministic Offline Fallback', () => {
  it('escalates ST-elevation clinic note to critical urgency with medical actions', () => {
    const out = buildDeterministicPreviewBrief(
      'Patient [REDACTED_PERSON_1] chest tightness ST elevation in leads II, III, aVF SpO2 93%',
      'medical',
      4,
      false
    );
    expect(out.urgency).toBe('critical');
    expect(out.redFlags.length).toBeGreaterThan(0);
    expect(out.actionItems.length).toBeGreaterThanOrEqual(3);
    expect(out.privacyNotes).toContain('4 sensitive identifier');
  });
});
