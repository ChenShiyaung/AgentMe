import path from 'node:path';
import fs from 'node:fs/promises';
import { listMarkdownFiles, readFileSafe } from './fs.js';
import { parseFrontmatter, getFrontmatterField } from './frontmatter.js';

export interface HealthWarning {
  file: string;
  message: string;
}

const MERGE_LINES = 150;
const MAX_SOURCES = 5;
const FOCUS_STALE_DAYS = 7;

function toPosixRel(agentmeDir: string, filePath: string): string {
  return path.relative(agentmeDir, filePath).split(path.sep).join('/');
}

function lineCount(content: string): number {
  if (!content) {
    return 1;
  }
  return content.split(/\n/).length;
}

function parseVersion(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function daysSinceUpdate(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return -1;
  }
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

function isIndexPath(filePath: string): boolean {
  return path.basename(filePath) === '_Index.md';
}

/**
 * 健康检查：行数、sources、Current/focus 时效、Me/SOUL 版本等。
 */
export async function checkHealth(agentmeDir: string): Promise<HealthWarning[]> {
  const warnings: HealthWarning[] = [];

  let exists = false;
  try {
    const st = await fs.stat(agentmeDir);
    exists = st.isDirectory();
  } catch {
    return warnings;
  }
  if (!exists) {
    return warnings;
  }

  const files = await listMarkdownFiles(agentmeDir);
  for (const file of files) {
    if (isIndexPath(file)) {
      continue;
    }
    const raw = await readFileSafe(file);
    if (raw === null) {
      continue;
    }
    const doc = parseFrontmatter(raw);
    const rel = toPosixRel(agentmeDir, file);
    const bodyLines = lineCount(doc.content);

    if (bodyLines > MERGE_LINES) {
      warnings.push({ file: rel, message: `${bodyLines}行，超过${MERGE_LINES}行阈值，建议合并(MERGE)` });
    }

    const sourcesRaw = getFrontmatterField(doc, 'sources');
    let sourceCount: number | undefined;
    if (typeof sourcesRaw === 'number' && Number.isFinite(sourcesRaw)) {
      sourceCount = sourcesRaw;
    } else if (Array.isArray(sourcesRaw)) {
      sourceCount = sourcesRaw.length;
    } else if (typeof sourcesRaw === 'string') {
      const n = Number(sourcesRaw);
      sourceCount = Number.isFinite(n) ? n : undefined;
    }
    if (sourceCount !== undefined && sourceCount >= MAX_SOURCES) {
      warnings.push({ file: rel, message: `sources=${sourceCount}，已归档${sourceCount}次，建议合并整理` });
    }
  }

  const focusPath = path.join(agentmeDir, 'Current', 'focus.md');
  const focusRaw = await readFileSafe(focusPath);
  if (focusRaw !== null) {
    const focusDoc = parseFrontmatter(focusRaw);
    const rawUpdated = getFrontmatterField(focusDoc, 'updated');
    const updated = rawUpdated instanceof Date
      ? rawUpdated.toISOString()
      : typeof rawUpdated === 'string' ? rawUpdated : undefined;
    if (updated) {
      const days = daysSinceUpdate(updated);
      if (days >= 0 && days > FOCUS_STALE_DAYS) {
        warnings.push({
          file: toPosixRel(agentmeDir, focusPath),
          message: `上次更新: ${updated.slice(0, 10)}，已超过${FOCUS_STALE_DAYS}天，建议更新当前工作状态`,
        });
      }
    }
  }

  const soulPath = path.join(agentmeDir, 'Me', 'SOUL.md');
  const soulRaw = await readFileSafe(soulPath);
  if (soulRaw !== null) {
    const soulDoc = parseFrontmatter(soulRaw);
    const ver = parseVersion(soulDoc.data['version']);
    if (ver === 1) {
      warnings.push({
        file: toPosixRel(agentmeDir, soulPath),
        message: 'version=1，初始化后未更新，建议丰富人格描述',
      });
    }
  }

  return warnings;
}
