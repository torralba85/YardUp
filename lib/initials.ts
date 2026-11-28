const firstLetter = new RegExp("\\p{L}", "u");

/**
 * Up to two initials for an avatar, from letters only.
 *
 * A display name like `A "Cookie" T` rendered `A“` because the old split took
 * the first character of every word, quotes included (2026-11-27 audit).
 * Each word contributes its first letter, past any quotes or punctuation, and
 * a word with no letter is skipped. Letters in any script count (`\p{L}`), so
 * "Émile Zoë" gives "ÉZ". First and last name, like most avatars.
 */
export function initialsFor(name: string | null | undefined, fallback = "U"): string {
  const letters = (name ?? "")
    .split(/\s+/)
    .map((word) => word.match(firstLetter)?.[0])
    .filter((letter): letter is string => Boolean(letter));
  if (letters.length === 0) return fallback;
  const picked = letters.length === 1 ? letters : [letters[0], letters[letters.length - 1]];
  return picked.join("").toUpperCase();
}
