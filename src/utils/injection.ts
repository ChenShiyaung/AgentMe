import { readFileSafe, writeFileSafe } from './fs.js';

const DEFAULT_TAG = 'AGENTME';

function startMarker(tag: string): string {
  return `<!-- ${tag}:START -->`;
}

function endMarker(tag: string): string {
  return `<!-- ${tag}:END -->`;
}

function markerRegex(tag: string): RegExp {
  const s = startMarker(tag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const e = endMarker(tag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${s}[\\s\\S]*?${e}`, 'g');
}

function wrapBlock(content: string, tag: string): string {
  return `${startMarker(tag)}\n${content}\n${endMarker(tag)}`;
}

export async function injectBlock(filePath: string, content: string, tag?: string): Promise<void> {
  const t = tag ?? DEFAULT_TAG;
  const existing = await readFileSafe(filePath);
  const wrapped = wrapBlock(content, t);

  if (!existing) {
    await writeFileSafe(filePath, wrapped + '\n');
    return;
  }

  const re = markerRegex(t);
  if (re.test(existing)) {
    const updated = existing.replace(markerRegex(t), wrapped);
    await writeFileSafe(filePath, updated);
    return;
  }

  await writeFileSafe(filePath, existing.trimEnd() + '\n\n' + wrapped + '\n');
}

export function extractBlock(content: string, tag?: string): string | null {
  const t = tag ?? DEFAULT_TAG;
  const s = startMarker(t);
  const e = endMarker(t);
  const si = content.indexOf(s);
  const ei = content.indexOf(e);
  if (si === -1 || ei === -1 || ei <= si) return null;
  return content.slice(si + s.length, ei).trim();
}

export async function removeBlock(filePath: string, tag?: string): Promise<void> {
  const t = tag ?? DEFAULT_TAG;
  const existing = await readFileSafe(filePath);
  if (!existing) return;

  const re = markerRegex(t);
  if (!re.test(existing)) return;

  const cleaned = existing.replace(markerRegex(t), '').replace(/\n{3,}/g, '\n\n').trim();
  await writeFileSafe(filePath, cleaned + '\n');
}
