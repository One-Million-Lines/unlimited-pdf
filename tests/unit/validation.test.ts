import { describe, it, expect } from 'vitest';
import { detectType, isPdfBytes, validatePdfInput, validateImageInput, ValidationError } from '@/core/validation/input';
import { makeSamplePdf, tinyPng, tinyJpeg } from '../fixtures/pdf';

describe('input validation', () => {
  it('detects a PDF by magic bytes', async () => {
    const pdf = await makeSamplePdf([{}]);
    expect(detectType(pdf)).toBe('pdf');
    expect(isPdfBytes(pdf)).toBe(true);
  });

  it('detects image types', () => {
    expect(detectType(tinyPng())).toBe('png');
    expect(detectType(tinyJpeg())).toBe('jpeg');
  });

  it('rejects non-PDF bytes', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5]);
    expect(isPdfBytes(junk)).toBe(false);
    expect(() => validatePdfInput(junk, 'x.pdf')).toThrow(ValidationError);
  });

  it('rejects empty inputs', () => {
    expect(() => validatePdfInput(new Uint8Array(), 'empty.pdf')).toThrow(ValidationError);
  });

  it('accepts supported images and rejects others', () => {
    expect(validateImageInput(tinyPng(), 'a.png')).toBe('png');
    expect(() => validateImageInput(new Uint8Array([0, 1, 2]), 'a.png')).toThrow(ValidationError);
  });
});
