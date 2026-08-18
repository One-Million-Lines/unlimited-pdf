import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const dir of ['dist', 'dist-zip']) {
  rmSync(resolve(root, dir), { recursive: true, force: true });
}
console.log('Cleaned dist/ and dist-zip/.');
