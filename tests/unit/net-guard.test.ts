import { describe, it, expect } from 'vitest';
import { evaluateRequest, NetworkGuard } from '@/core/net/guard';

describe('network allowlist', () => {
  it('denies requests that are not explicitly authorized', () => {
    expect(evaluateRequest('https://example.com/a.pdf', []).allowed).toBe(false);
  });

  it('allows an exact authorized https URL', () => {
    const url = 'https://example.com/a.pdf';
    expect(evaluateRequest(url, [url]).allowed).toBe(true);
  });

  it('rejects unsafe schemes even if listed', () => {
    const url = 'file:///etc/passwd';
    expect(evaluateRequest(url, [url]).allowed).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(evaluateRequest('not a url', ['not a url']).allowed).toBe(false);
  });

  it('NetworkGuard consumes a one-time grant', () => {
    const guard = new NetworkGuard();
    const url = 'https://example.com/a.pdf';
    expect(guard.isAllowed(url)).toBe(false);
    guard.allowOnce(url);
    expect(guard.isAllowed(url)).toBe(true);
  });
});
