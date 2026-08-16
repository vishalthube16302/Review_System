// Shared limits used across admin forms and API validation. Kept as a single
// constant rather than repeated hardcoded numbers per form - see git history
// for the Aug 2026 bug where inconsistent per-form limits silently truncated
// this field.
export const KEYWORDS_MAX_LENGTH = 200
