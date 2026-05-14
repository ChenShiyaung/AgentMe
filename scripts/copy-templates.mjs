import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src', 'templates');
const dest = path.join(root, 'dist', 'templates');

if (!fs.existsSync(src)) {
  console.warn('copy-templates: no src/templates, skipping');
  process.exit(0);
}

await fs.promises.mkdir(path.dirname(dest), { recursive: true });
await fs.promises.cp(src, dest, { recursive: true });
