// Shared limits used across admin forms and API validation. Kept as a single
// constant rather than repeated hardcoded numbers per form - see git history
// for the Aug 2026 bug where inconsistent per-form limits silently truncated
// this field.
export const KEYWORDS_MAX_LENGTH = 200

// Full AI prompt template stored per business (replaces the old hardcoded
// system prompt). Generous enough for a real custom prompt, capped so a
// runaway paste can't blow up Groq token costs.
export const PROMPT_TEMPLATE_MAX_LENGTH = 3000
