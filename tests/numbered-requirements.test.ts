import { describe, expect, it } from 'vitest';
import { numberedRequirements } from '../src/server/numbered-requirements';

describe('numbered requirement recovery', () => {
  it('recovers atomic R-numbered sentences when AI returns an empty list', () => {
    const result = numberedRequirements(
      'Mandatory requirements R1. Complete two projects since 2023. R2. Hold a valid ISO 27001 certificate. Submission note: provide sources.',
      'page-1',
    );
    expect(result.map((r) => r.text)).toEqual([
      'Complete two projects since 2023.',
      'Hold a valid ISO 27001 certificate.',
    ]);
    expect(result.every((r) => r.tenderCitationIds[0] === 'page-1')).toBe(true);
  });

  it('does not infer requirements from an isolated numbered reference', () => {
    expect(numberedRequirements('See R1. in the annexure.', 'page-1')).toEqual([]);
  });
});
