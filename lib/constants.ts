// Shared limits used across admin forms and API validation. Keeping these as
// single constants (rather than hardcoded numbers repeated in each form)
// prevents the exact bug we hit in Aug 2026: the Add Branch form used 150
// while Add Customer and Edit Branch both used 200, silently truncating
// business_description mid-word for any branch created via that form.
export const BUSINESS_DESCRIPTION_MAX_LENGTH = 200

// Rough heuristic to nudge admins away from typing a comma-separated
// keyword list (e.g. "Air Compressor Seller,Oil-Free Compressor,...")
// instead of a plain sentence. This only shows a soft warning - it never
// blocks submission, since some legitimate descriptions may reasonably
// contain a comma or two.
export function looksLikeKeywordList(description: string): boolean {
  const commaCount = (description.match(/,/g) || []).length
  return commaCount >= 3
}
