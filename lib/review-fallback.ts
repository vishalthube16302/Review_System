/**
 * Offline drafts used only when the AI call fails. Unlike the old fixed pool
 * (~6 lines shared by every business, which is why reviews looked identical),
 * these are assembled from what THIS customer tapped and wrote, so even the
 * fallback is about their visit and varies between customers.
 */

interface FallbackInput {
  business_name: string
  stars: number
  highlights: string[]
  improvements: string[]
  note: string
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function joinNatural(items: string[]): string {
  const l = items.map(lower)
  if (l.length <= 1) return l[0] ?? ''
  return `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}`
}

function endWith(s: string): string {
  return /[.!?]$/.test(s) ? s : `${s}.`
}

export function buildFallbackDrafts(input: FallbackInput, count = 3): string[] {
  const { business_name: name, stars, highlights, improvements, note } = input
  const h = highlights.slice(0, 3)
  const bad = improvements.slice(0, 2)
  const drafts: string[] = []

  // The customer's own words always come first - nothing is more genuine.
  if (note) drafts.push(endWith(upper(note)))

  if (stars >= 4) {
    const positive = h.length
      ? [
          `${upper(joinNatural(h))}. ${pick(['Happy with it', 'Good experience overall', 'Will come back', 'No complaints'])}.`,
          `${pick(['Really liked', 'Liked', 'Quite happy with'])} the ${joinNatural(h)} at ${name}.`,
          `${pick(['Good experience', 'Nice experience', 'Went well'])} - ${lower(h[0])} ${pick(['stood out', 'was the best part', 'was really good'])}.`,
          `${upper(h[0])}${h[1] ? `, ${lower(h[1])}` : ''}. ${stars === 5 ? 'Would go again.' : 'Overall decent.'}`,
        ]
      : [
          `${pick(['Good experience', 'Nice experience', 'Happy with the service'])} at ${name}.`,
          `${pick(['Went well', 'All good', 'Smooth experience'])}, ${pick(['would come back', 'no complaints', 'worth it'])}.`,
          `${stars === 5 ? 'Really happy' : 'Pretty happy'} overall.`,
        ]
    drafts.push(...positive.sort(() => Math.random() - 0.5))
  } else if (stars === 3) {
    drafts.push(
      ...[
        `${h.length ? `${upper(joinNatural(h))} was fine` : 'Some things were fine'}, but ${bad.length ? joinNatural(bad) : 'a few things'} could be better.`,
        `Mixed experience at ${name}.${bad.length ? ` ${upper(joinNatural(bad))} needs work.` : ''}`,
        `Okay overall.${h.length ? ` Liked the ${lower(h[0])}.` : ''}${bad.length ? ` ${upper(lower(bad[0]))} could improve.` : ''}`,
      ].sort(() => Math.random() - 0.5)
    )
  } else {
    drafts.push(
      ...[
        `Not a good experience at ${name}.${bad.length ? ` ${upper(joinNatural(bad))} was a problem.` : ''}`,
        `${bad.length ? `${upper(joinNatural(bad))} let it down.` : 'Disappointed this time.'} Hope they improve.`,
        `Expected better.${bad.length ? ` Mainly ${joinNatural(bad)}.` : ''}`,
      ].sort(() => Math.random() - 0.5)
    )
  }

  return Array.from(new Set(drafts)).slice(0, count)
}
