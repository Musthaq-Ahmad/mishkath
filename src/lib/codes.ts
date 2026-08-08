/**
 * Bijective base-26 numbering: 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA, ...
 * Used for anonymous participant codes so they read like spreadsheet
 * columns rather than exposing a plain incrementing integer.
 */
export function codeForIndex(n: number): string {
  let result = "";
  let remaining = n;
  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return result;
}
