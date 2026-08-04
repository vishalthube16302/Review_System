/**
 * Generates a random, reasonably readable temporary password for a newly
 * created restaurant owner login. Avoids visually ambiguous characters
 * (0/O, 1/l/I) since these get read off a screen and typed on a phone.
 * Always includes at least one uppercase letter, one digit, and one symbol
 * so it satisfies typical password strength rules.
 */
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%'

function randomChar(charset: string): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return charset[bytes[0] % charset.length]
}

export function generateTempPassword(length = 10): string {
  const required = [randomChar(LETTERS.toUpperCase()), randomChar(DIGITS), randomChar(SYMBOLS)]
  const rest = Array.from({ length: length - required.length }, () =>
    randomChar(LETTERS + DIGITS)
  )
  const all = [...required, ...rest]

  // Shuffle so the required characters aren't always in the same position.
  for (let i = all.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    const j = bytes[0] % (i + 1)
    ;[all[i], all[j]] = [all[j], all[i]]
  }

  return all.join('')
}
