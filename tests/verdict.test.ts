import { describe, it, expect } from 'vitest';
import {
  certificateAbsenceGuard,
  verdict,
  validateComparison,
  numericGuard,
  type Requirement,
} from '../src/server/verdict';
const base: Requirement = {
  id: 'r1',
  text: 'Audited turnover above threshold',
  category: 'financial',
  mandatory: true,
  tenderCitationIds: ['t1'],
  companyCitationIds: ['c1'],
  status: 'satisfied',
  reason: 'Audited result supports threshold',
  gaps: [],
  needsHumanReview: false,
};
describe('conservative verdict', () => {
  it('requires coverage and all mandatory evidence for likely eligible', () => {
    expect(verdict([base], true)).toBe('Likely eligible');
    expect(verdict([base], false)).toBe('Needs review');
    expect(verdict([{ ...base, status: 'needs_verification' }], true)).toBe(
      'Needs review',
    );
  });
  it('treats cited mandatory counterevidence as a blocker', () => {
    expect(verdict([{ ...base, status: 'not_satisfied' }], true)).toBe(
      'Likely ineligible',
    );
  });
  it('downgrades unsupported positive and negative model claims', () => {
    for (const status of ['satisfied', 'not_satisfied'] as const) {
      const result = validateComparison(
        {
          status,
          companyCitationIds: ['fabricated'],
          tenderCitationIds: ['t1'],
          reason: 'claim',
        },
        new Set(['c1']),
        new Set(['t1']),
      );
      expect(result.status).toBe('needs_verification');
      expect(result.companyCitationIds).toEqual([]);
    }
  });
  it('checks simple numeric minimums and routes averages to review', () => {
    expect(
      numericGuard('At least 3 projects', {
        status: 'satisfied',
        actualValue: 2,
        requiredValue: 3,
        unit: 'projects',
      }),
    ).toBe('needs_verification');
    expect(
      numericGuard('At least 3 projects', {
        status: 'satisfied',
        actualValue: 4,
        requiredValue: 3,
        unit: 'projects',
      }),
    ).toBe('satisfied');
    expect(
      numericGuard('Average annual turnover of at least INR 5 crore', {
        status: 'satisfied',
        actualValue: 6,
        requiredValue: 5,
        unit: 'crore',
      }),
    ).toBe('needs_verification');
  });
  it('does not treat a missing uploaded certificate as proof the company lacks one', () => {
    expect(certificateAbsenceGuard(
      'Provide a valid ISO 27001 certificate',
      ['No ISO 27001 certificate is included in these test documents.'],
      'not_satisfied',
    )).toBe('needs_verification');
    expect(certificateAbsenceGuard(
      'Provide a valid ISO 27001 certificate',
      ['The company does not hold ISO 27001 certification.'],
      'not_satisfied',
    )).toBe('not_satisfied');
  });
});
