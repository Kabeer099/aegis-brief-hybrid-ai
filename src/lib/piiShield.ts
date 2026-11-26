import type { PiiMatch, PiiRedactionResult } from '../types/aegis';

interface DetectorRule {
  type: PiiMatch['type'];
  pattern: RegExp;
  label: string;
}

const DETECTOR_RULES: DetectorRule[] = [
  {
    type: 'CNIC_ID',
    // Pakistan CNIC (12345-1234567-1) & regional national IDs
    pattern: /\b\d{5}-\d{7}-\d\b/g,
    label: 'ID',
  },
  {
    type: 'SSN',
    // US SSN / tax ID pattern
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    label: 'GOV_ID',
  },
  {
    type: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    label: 'EMAIL',
  },
  {
    type: 'CARD',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    label: 'CARD',
  },
  {
    type: 'PHONE',
    // International & local mobile numbers (+92 300 1234567, 0334-2978455, +1 (415) 555-0192)
    pattern: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}\b/g,
    label: 'PHONE',
  },
  {
    type: 'DOB',
    pattern: /\b(?:DOB|Date of Birth|Born)[ \t]*[:=-][ \t]*[A-Za-z0-9/., \t-]{4,20}\b/gi,
    label: 'DOB',
  },
  {
    type: 'PERSON_LABEL',
    // Explicitly labeled patient/client/source/witness/resident names
    pattern: /\b(Patient|Client|Source|Witness|Resident|Applicant|Claimant|Name)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){1,3})/g,
    label: 'PERSON',
  },
];

/**
 * Deterministic, 100% local PII redaction shield executed in-memory before any
 * optional cloud escalation or Firestore sync. Ensures zero raw PII leaves the browser.
 */
export function redactPiiLocally(input: string): PiiRedactionResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!input) {
    return { redactedText: '', matches: [], redactionTimeMs: 0 };
  }

  interface RawHit {
    type: PiiMatch['type'];
    label: string;
    start: number;
    end: number;
    prefix?: string;
  }

  const hits: RawHit[] = [];

  for (const rule of DETECTOR_RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(input)) !== null) {
      if (rule.type === 'PHONE') {
        const digits = m[0].replace(/\D/g, '');
        if (digits.length < 9 || digits.length > 15) continue;
      }
      if (rule.type === 'PERSON_LABEL' && m[1] && m[2]) {
        const fullMatch = m[0];
        const nameOffset = fullMatch.indexOf(m[2]);
        const nameStart = m.index + nameOffset;
        hits.push({
          type: rule.type,
          label: rule.label,
          start: nameStart,
          end: nameStart + m[2].length,
        });
      } else {
        hits.push({
          type: rule.type,
          label: rule.label,
          start: m.index,
          end: m.index + m[0].length,
        });
      }
    }
  }

  // Sort by start ascending, longer spans first on tie, then deduplicate overlaps
  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const accepted: RawHit[] = [];
  let cursor = -1;
  for (const h of hits) {
    if (h.start >= cursor) {
      accepted.push(h);
      cursor = h.end;
    }
  }

  const counters: Record<string, number> = {};
  const matches: PiiMatch[] = [];
  let out = '';
  let lastIdx = 0;

  for (const h of accepted) {
    counters[h.label] = (counters[h.label] ?? 0) + 1;
    const placeholder = `[REDACTED_${h.label}_${counters[h.label]}]`;
    out += input.slice(lastIdx, h.start) + placeholder;
    matches.push({
      type: h.type,
      placeholder,
      originalLength: h.end - h.start,
      start: h.start,
      end: h.end,
    });
    lastIdx = h.end;
  }
  out += input.slice(lastIdx);

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    redactedText: out,
    matches,
    redactionTimeMs: Math.max(0.1, Number((t1 - t0).toFixed(2))),
  };
}
