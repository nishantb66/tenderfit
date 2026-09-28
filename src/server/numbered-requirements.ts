export function numberedRequirements(text: string, citationId: string) {
  const matches = [...text.matchAll(/\bR\d+\.\s+([^.!?]+[.!?])/gi)];
  // Only use this fallback when the document clearly contains a numbered set.
  if (matches.length < 2) return [];
  return matches.map((match) => ({
    text: match[1].trim(),
    category: 'other',
    mandatory: true,
    tenderCitationIds: [citationId],
  }));
}
