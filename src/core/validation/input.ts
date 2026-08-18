/**
 * Input validation and type sniffing (spec §9.1: validate magic bytes as well
 * as extensions/MIME). Treats every input as hostile.
 */

export type DetectedType = 'pdf' | 'jpeg' | 'png' | 'webp' | 'unknown';

export interface ValidationLimits {
  /** Reject inputs larger than this (bytes). 0 disables the cap. */
  maxBytes: number;
}

export const DEFAULT_LIMITS: ValidationLimits = {
  // 750 MB hard ceiling; large-file mode kicks in well before this.
  maxBytes: 750 * 1024 * 1024,
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function bytesOf(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function startsWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (bytes[offset + i] !== sig[i]) return false;
  return true;
}

/** Sniff a supported file type from its leading magic bytes. */
export function detectType(input: ArrayBuffer | Uint8Array): DetectedType {
  const b = bytesOf(input);
  if (isPdfBytes(b)) return 'pdf';
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  // WEBP: "RIFF"...."WEBP"
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return 'unknown';
}

/**
 * A PDF must contain "%PDF-" within the first 1024 bytes (the spec permits a
 * small amount of leading junk before the header).
 */
export function isPdfBytes(input: ArrayBuffer | Uint8Array): boolean {
  const b = bytesOf(input);
  const scanEnd = Math.min(b.length, 1024);
  // "%PDF-"
  const sig = [0x25, 0x50, 0x44, 0x46, 0x2d];
  for (let i = 0; i <= scanEnd - sig.length; i++) {
    let ok = true;
    for (let j = 0; j < sig.length; j++) {
      if (b[i + j] !== sig[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function isSupportedImage(type: DetectedType): type is 'jpeg' | 'png' | 'webp' {
  return type === 'jpeg' || type === 'png' || type === 'webp';
}

/** Validate a PDF input: non-empty, within size cap, correct magic bytes. */
export function validatePdfInput(
  input: ArrayBuffer | Uint8Array,
  name: string,
  limits: ValidationLimits = DEFAULT_LIMITS,
): void {
  const b = bytesOf(input);
  if (b.length === 0) throw new ValidationError(`"${name}" is empty.`);
  if (limits.maxBytes > 0 && b.length > limits.maxBytes) {
    throw new ValidationError(`"${name}" is too large to process safely in the browser.`);
  }
  if (!isPdfBytes(b)) {
    throw new ValidationError(`"${name}" is not a valid PDF (missing %PDF header).`);
  }
}

/** Validate an image input for image→PDF. */
export function validateImageInput(
  input: ArrayBuffer | Uint8Array,
  name: string,
  limits: ValidationLimits = DEFAULT_LIMITS,
): 'jpeg' | 'png' | 'webp' {
  const b = bytesOf(input);
  if (b.length === 0) throw new ValidationError(`"${name}" is empty.`);
  if (limits.maxBytes > 0 && b.length > limits.maxBytes) {
    throw new ValidationError(`"${name}" is too large to process safely.`);
  }
  const type = detectType(b);
  if (!isSupportedImage(type)) {
    throw new ValidationError(`"${name}" is not a supported image (use JPEG, PNG or WebP).`);
  }
  return type;
}
