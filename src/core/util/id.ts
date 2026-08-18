/**
 * Identifier and hashing helpers. Uses the Web Crypto API for secure
 * randomness (spec §9.1) — never Math.random for identifiers.
 */

const cryptoObj: Crypto = globalThis.crypto;

/** A short, collision-resistant id for pages, objects, sessions and jobs. */
export function makeId(prefix = ''): string {
  const bytes = new Uint8Array(9);
  cryptoObj.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(36).padStart(2, '0');
  return prefix ? `${prefix}_${s}` : s;
}

/** A UUID v4 for session ids where a standard format is preferred. */
export function makeUuid(): string {
  return cryptoObj.randomUUID();
}

/**
 * A local, non-transmitted fingerprint of document bytes (SHA-256, hex).
 * Used only to de-duplicate/identify inputs in the current session — it never
 * leaves the device.
 */
export async function fingerprint(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Copy into a fresh, non-shared ArrayBuffer for the digest call.
  const buf = view.slice().buffer;
  const digest = await cryptoObj.subtle.digest('SHA-256', buf);
  const arr = new Uint8Array(digest);
  let hex = '';
  for (const b of arr) hex += b.toString(16).padStart(2, '0');
  return hex;
}
