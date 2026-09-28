export type Status =
  | 'satisfied'
  | 'not_satisfied'
  | 'needs_verification'
  | 'not_applicable'
  | 'analysis_error';
export type Requirement = {
  id: string;
  text: string;
  category: string;
  mandatory: boolean;
  tenderCitationIds: string[];
  companyCitationIds: string[];
  status: Status;
  reason: string;
  gaps: string[];
  needsHumanReview: boolean;
  reviewed?: { by: string; reason: string; at: string };
};
export function verdict(requirements: Requirement[], coverageOk: boolean) {
  if (requirements.some((r) => r.mandatory && r.status === 'not_satisfied'))
    return 'Likely ineligible';
  if (
    !requirements.length ||
    !coverageOk ||
    requirements.some(
      (r) =>
        r.mandatory &&
        r.status !== 'satisfied' &&
        r.status !== 'not_applicable',
    )
  )
    return 'Needs review';
  return 'Likely eligible';
}
export function validateComparison(
  raw: Partial<Requirement>,
  candidates: Set<string>,
  tenderCitations: Set<string>,
): Pick<
  Requirement,
  | 'status'
  | 'reason'
  | 'companyCitationIds'
  | 'tenderCitationIds'
  | 'gaps'
  | 'needsHumanReview'
> {
  const allowed: Status[] = [
    'satisfied',
    'not_satisfied',
    'needs_verification',
    'not_applicable',
    'analysis_error',
  ];
  const companyCitationIds = (raw.companyCitationIds || []).filter((id) =>
    candidates.has(id),
  );
  const tenderCitationIds = (raw.tenderCitationIds || []).filter((id) =>
    tenderCitations.has(id),
  );
  let status: Status = allowed.includes(raw.status as Status)
    ? (raw.status as Status)
    : 'analysis_error';
  if (
    (status === 'satisfied' || status === 'not_satisfied') &&
    (!companyCitationIds.length || !tenderCitationIds.length)
  )
    status = 'needs_verification';
  return {
    status,
    reason: String(raw.reason || 'Evidence requires human review'),
    companyCitationIds,
    tenderCitationIds,
    gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [],
    needsHumanReview:
      Boolean(raw.needsHumanReview) ||
      status === 'needs_verification' ||
      status === 'analysis_error',
  };
}
export function numericGuard(
  text: string,
  raw: {
    status?: Status;
    actualValue?: number | null;
    requiredValue?: number | null;
    unit?: string | null;
  },
): Status | undefined {
  const match = text.match(
    /(?:at least|minimum(?: of)?|not less than|>=)\s*(?:INR|Rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(crore|lakh|million|%|years?|projects?|employees?)/i,
  );
  if (!match || (raw.status !== 'satisfied' && raw.status !== 'not_satisfied'))
    return undefined;
  const threshold = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (text.toLowerCase().includes('average')) return 'needs_verification';
  if (
    typeof raw.actualValue !== 'number' ||
    !Number.isFinite(raw.actualValue) ||
    typeof raw.requiredValue !== 'number' ||
    Math.abs(raw.requiredValue - threshold) > 1e-9 ||
    raw.unit?.toLowerCase() !== unit
  )
    return 'needs_verification';
  const passes = raw.actualValue >= threshold;
  if ((raw.status === 'satisfied') !== passes) return 'needs_verification';
  return raw.status;
}
