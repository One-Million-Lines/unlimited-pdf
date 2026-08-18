/**
 * QPDF-WASM bridge: protect (AES-256 password encrypt) and unlock (decrypt).
 *
 * Uses the qpdf CLI compiled to WASM via Emscripten. A fresh module instance is
 * created for every call so stale WASM state is never a problem. The WASM binary
 * is fetched once from the bundled extension asset (served from 'self', so CSP
 * `wasm-unsafe-eval` applies and no external fetch is made).
 *
 * Spec compliance:
 *  - Protect: AES-256, non-empty user password, randomly generated owner
 *    password that is distinct from the user password (spec §5.14).
 *  - Unlock: requires the correct user (or owner) password. We do NOT market
 *    this as bypassing security — the user simply owns their document.
 *  - Passwords are never logged.
 *  - Input bytes are always from the caller's copy; the original is untouched.
 */

// Vite bundles the WASM as an extension asset and provides its URL at runtime.
// The browser fetches it from the extension origin ('self') — CSP permits this.
import qpdfWasmUrl from 'qpdf-wasm/qpdf.wasm?url';
import initQpdf from 'qpdf-wasm';

import { ToolError } from '../core/pipeline/types';

/** Cached WASM binary so we fetch it only once per worker lifetime. */
let cachedBinary: ArrayBuffer | null = null;

async function getWasmBinary(): Promise<ArrayBuffer> {
  if (cachedBinary) return cachedBinary;
  const resp = await fetch(qpdfWasmUrl);
  if (!resp.ok) throw new Error(`Failed to load qpdf.wasm: ${resp.status}`);
  cachedBinary = await resp.arrayBuffer();
  return cachedBinary;
}

interface QpdfModule {
  callMain(args: string[]): number;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  };
}

/**
 * Run a qpdf CLI operation on `inputBytes` and return the output bytes.
 * `args` must NOT include the input/output paths — those are added here.
 */
async function runQpdf(inputBytes: Uint8Array, args: string[]): Promise<Uint8Array> {
  const wasmBinary = await getWasmBinary();

  let exitCode = 0;
  let stderr = '';

  const mod = (await initQpdf({
    wasmBinary: new Uint8Array(wasmBinary),
    noInitialRun: true,
    print: () => undefined,
    printErr: (s: string) => { stderr += s + '\n'; },
    onExit: (code: number) => { exitCode = code; },
  })) as unknown as QpdfModule;

  const inputPath = '/input.pdf';
  const outputPath = '/output.pdf';

  mod.FS.writeFile(inputPath, inputBytes);

  try {
    mod.callMain([...args, '--', inputPath, outputPath]);
  } catch {
    // Emscripten re-throws process.exit as an exception; output is still readable.
  }

  // exitCode 0 = success; 3 = success with warnings (xref repaired, etc.)
  if (exitCode !== 0 && exitCode !== 3) {
    const err = stderr.trim();
    throw mapQpdfError(err, exitCode);
  }

  let outputBytes: Uint8Array;
  try {
    outputBytes = mod.FS.readFile(outputPath);
  } catch {
    const err = stderr.trim();
    throw mapQpdfError(err || 'qpdf produced no output.', exitCode);
  }

  return outputBytes;
}

function mapQpdfError(stderr: string, exitCode: number): ToolError {
  const lower = stderr.toLowerCase();
  if (lower.includes('invalid password') || lower.includes('password required') || lower.includes('wrong password')) {
    return new ToolError('passwordRequired', 'Incorrect password. Please check and try again.');
  }
  if (lower.includes('not encrypted') || lower.includes('not password-protected')) {
    return new ToolError('validation', 'This PDF is not password-protected, so there is nothing to unlock.');
  }
  if (lower.includes('damaged') || lower.includes('syntax error') || lower.includes('not a pdf')) {
    return new ToolError('damaged', 'This PDF could not be read. It may be damaged or unsupported.');
  }
  const msg = stderr || `qpdf exited with code ${exitCode}.`;
  return new ToolError('unknown', `PDF processing failed: ${msg.split('\n')[0].substring(0, 200)}`);
}

/** Secure random base-62 string for the owner password. */
function randomOwnerPassword(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
    .slice(0, length);
}

/* -------------------------------- Protect -------------------------------- */

export interface ProtectOptions {
  /** The password the user will need to open the PDF. */
  userPassword: string;
  /** Key bits: 256 (AES-256, recommended), 128 (AES-128), or 40 (RC4-40). */
  keyBits?: 256 | 128 | 40;
}

export async function protectPdf(bytes: Uint8Array, options: ProtectOptions): Promise<Uint8Array> {
  const { userPassword, keyBits = 256 } = options;
  if (!userPassword) throw new ToolError('validation', 'Enter a password to protect the PDF.');

  // Generate a distinct, strong owner password. The UI does not expose this.
  let ownerPassword = randomOwnerPassword();
  // Very unlikely but guard against accidental equality.
  while (ownerPassword === userPassword) ownerPassword = randomOwnerPassword();

  // qpdf: --encrypt USER OWNER BITS [options] --
  const args = ['--encrypt', userPassword, ownerPassword, String(keyBits)];
  return runQpdf(bytes, args);
}

/* -------------------------------- Unlock --------------------------------- */

export interface UnlockOptions {
  /** The password required to open the PDF. */
  password: string;
}

export async function unlockPdf(bytes: Uint8Array, options: UnlockOptions): Promise<Uint8Array> {
  const { password } = options;
  if (!password) throw new ToolError('validation', 'Enter the password to unlock the PDF.');
  // qpdf: --password='PASSWORD' --decrypt --
  const args = [`--password=${password}`, '--decrypt'];
  return runQpdf(bytes, args);
}
