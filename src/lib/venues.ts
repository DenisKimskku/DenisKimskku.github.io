export function formatVenue(conference: string): string {
  // Tighten verbose journal names while preserving the academic feel.
  return conference
    .replace(/^Journal of The Korea Institute of Information Security & Cryptology\s*/i, 'J. Korea Inst. Inf. Security & Cryptology, ')
    .replace(/^Review of KIISC \(정보보호학회지\)\s*/i, 'Review of KIISC, ')
    .replace(/Vol\.?\s*(\d+)\.?\s*,?\s*No\.?\s*(\d+)/i, 'Vol. $1, No. $2');
}

export function formatVenueShort(conference: string): string {
  // Compact abbreviation for the papers-list small-caps venue label,
  // e.g. "Journal of The Korea Institute of Information Security &
  // Cryptology Vol 35. No. 6" → "J. KIISC, Vol. 35, No. 6".
  return formatVenue(
    conference.replace(
      /^Journal of The Korea Institute of Information Security & Cryptology\s*/i,
      'J. KIISC, '
    )
  );
}
