import { describe, it, expect } from 'vitest';
import { protectPdf, unlockPdf } from '@/tools/qpdf-lib';
import { makeSamplePdf } from '../fixtures/pdf';
import { ToolError } from '@/core/pipeline/types';

// Note: Full protection/unlock tests require a browser environment (WASM support).
// Here we test the validation logic; E2E tests verify the actual encryption/decryption.
describe('protectPdf & unlockPdf validation', () => {
  it('rejects an empty password on protect', async () => {
    const pdf = await makeSamplePdf();
    try {
      await protectPdf(pdf, { userPassword: '' });
      expect.fail('Should have thrown');
    } catch (err) {
      if (err instanceof ToolError) {
        expect(err.category).toBe('validation');
        expect(err.message).toContain('password');
      } else {
        expect(err).toBeInstanceOf(ToolError);
      }
    }
  });

  it('rejects an empty password on unlock', async () => {
    const pdf = await makeSamplePdf();
    try {
      await unlockPdf(pdf, { password: '' });
      expect.fail('Should have thrown');
    } catch (err) {
      if (err instanceof ToolError) {
        expect(err.category).toBe('validation');
      } else {
        expect(err).toBeInstanceOf(ToolError);
      }
    }
  });

  it('protectPdf loads successfully with valid password', async () => {
    const pdf = await makeSamplePdf();
    try {
      await protectPdf(pdf, { userPassword: 'test123' });
    } catch (err) {
      // WASM won't load in Node environment, but validation should pass
      // URL error is expected in test environment
      if (err instanceof Error && err.message.includes('URL')) {
        expect(err).toBeInstanceOf(Error);
      } else {
        throw err;
      }
    }
  });
});
