/**
 * Network policy guard (spec §7.8).
 *
 * The core promise is that document workflows make **no** network requests.
 * The only permitted request in Phase 1 is fetching the exact PDF URL the user
 * explicitly asked to import from the active tab. This module centralizes the
 * allow/deny decision so it can be unit-tested and so every fetch in the app
 * routes through one auditable place.
 */

export interface NetworkDecision {
  allowed: boolean;
  reason: string;
}

const SAFE_SCHEMES = ['http:', 'https:'];

/**
 * Decide whether a request to `url` may proceed. A request is allowed only if
 * its exact string appears in the one-shot allowlist (registered immediately
 * before a user-initiated active-tab import) and uses a safe scheme.
 * Pure function — no side effects — so it is fully unit-testable.
 */
export function evaluateRequest(url: string, allowlist: Iterable<string>): NetworkDecision {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'Malformed URL.' };
  }
  if (!SAFE_SCHEMES.includes(parsed.protocol)) {
    return { allowed: false, reason: `Scheme "${parsed.protocol}" is not permitted.` };
  }
  const set = allowlist instanceof Set ? allowlist : new Set(allowlist);
  if (!set.has(url)) {
    return {
      allowed: false,
      reason: 'This URL was not explicitly authorized for import. Document processing is offline-only.',
    };
  }
  return { allowed: true, reason: 'User-authorized active-tab PDF import.' };
}

/**
 * Runtime guard around fetch. Only URLs registered via allowOnce() may be
 * fetched, and each authorization is consumed after a single use.
 */
export class NetworkGuard {
  private allowlist = new Set<string>();

  /** Authorize exactly one fetch of this URL (a user-initiated import). */
  allowOnce(url: string): void {
    this.allowlist.add(url);
  }

  /** Whether a URL is currently authorized (without consuming it). */
  isAllowed(url: string): boolean {
    return evaluateRequest(url, this.allowlist).allowed;
  }

  /** Guarded fetch: refuses any non-authorized request. Consumes the grant. */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const decision = evaluateRequest(url, this.allowlist);
    if (!decision.allowed) {
      throw new Error(`Blocked network request: ${decision.reason}`);
    }
    this.allowlist.delete(url);
    return fetch(url, { ...init, redirect: 'follow' });
  }
}
