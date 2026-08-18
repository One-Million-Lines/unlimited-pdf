/**
 * Output and saving (spec §4.5). Prefers the File System Access API from a user
 * gesture (Save As / choose folder), with a Blob-download fallback. Multiple
 * outputs can be saved individually, to a chosen directory, or as one local ZIP
 * built with fflate. No permissions beyond the pickers are required.
 */
import { zipSync } from 'fflate';
import type { NamedBytes } from '../core/pipeline/types';
import { uniqueName } from '../core/util/filename';

interface FsWindow {
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
  showDirectoryPicker?: (options?: unknown) => Promise<FileSystemDirectoryHandle>;
}

export function canUseFilePicker(): boolean {
  return typeof (window as unknown as FsWindow).showSaveFilePicker === 'function';
}

export function canUseDirectoryPicker(): boolean {
  return typeof (window as unknown as FsWindow).showDirectoryPicker === 'function';
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function acceptFor(mime: string, ext: string): Record<string, string[]> {
  return { [mime]: [`.${ext}`] };
}

/** Save a single output. Returns false if the user cancelled the picker. */
export async function saveNamedBytes(file: NamedBytes): Promise<boolean> {
  const mime = file.mime ?? 'application/pdf';
  const ext = extOf(file.name) || 'pdf';
  const fsw = window as unknown as FsWindow;

  if (fsw.showSaveFilePicker) {
    try {
      const handle = await fsw.showSaveFilePicker({
        suggestedName: file.name,
        types: [{ description: 'File', accept: acceptFor(mime, ext) }],
      });
      const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
      await writable.write(bytesToBlob(file.bytes, mime));
      await writable.close();
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return false;
      // Fall through to the download fallback on any picker failure.
    }
  }
  downloadBlob(bytesToBlob(file.bytes, mime), file.name);
  return true;
}

/** Save many outputs into a user-chosen directory. Returns count written, or -1 if unsupported/cancelled. */
export async function saveToDirectory(files: NamedBytes[]): Promise<number> {
  const fsw = window as unknown as FsWindow;
  if (!fsw.showDirectoryPicker) return -1;
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await fsw.showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    return -1;
  }
  const used = new Set<string>();
  let written = 0;
  for (const file of files) {
    const name = uniqueName(file.name, used);
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
    await writable.write(bytesToBlob(file.bytes, file.mime ?? 'application/pdf'));
    await writable.close();
    written += 1;
  }
  return written;
}

/** Build a ZIP of the outputs locally and save/download it. */
export async function saveAsZip(files: NamedBytes[], zipName: string): Promise<boolean> {
  const entries: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const file of files) {
    entries[uniqueName(file.name, used)] = file.bytes;
  }
  const zipped = zipSync(entries, { level: 6 });
  return saveNamedBytes({ name: zipName, bytes: zipped, mime: 'application/zip' });
}

export function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  // Copy into a standalone ArrayBuffer to avoid SharedArrayBuffer typing issues.
  return new Blob([bytes.slice().buffer], { type: mime });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke shortly after to let the download start.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
