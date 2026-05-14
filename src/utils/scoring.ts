import path from 'node:path';
import { readFileSafe } from './fs.js';
import { parseFrontmatter, getFrontmatterField } from './frontmatter.js';

export interface L1Dimensions {
  frontmatter: number;
  volume: number;
  freshness: number;
  connectivity: number;
  density: number;
}

export interface L1Score {
  total: number;
  dimensions: L1Dimensions;
}

const FM_FIELDS = ['type', 'tags', 'created', 'updated', 'sources'] as const;

function hasField(data: Record<string, unknown>, key: string): boolean {
  const v = data[key];
  if (v === undefined || v === null) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function scoreFrontmatter(data: Record<string, unknown>): number {
  let s = 0;
  for (const f of FM_FIELDS) {
    if (hasField(data, f)) s += 2;
  }
  return s;
}

function scoreVolume(bodyLines: number): number {
  if (bodyLines >= 10 && bodyLines <= 150) return 10;
  if (bodyLines < 10) return Math.max(0, Math.round((bodyLines / 10) * 10));
  return Math.max(0, Math.round(10 - (bodyLines - 150) / 30));
}

function toIsoString(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string' && v.trim()) return v;
  return undefined;
}

function scoreFreshness(data: Record<string, unknown>): number {
  const raw = toIsoString(data['updated']);
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return 0;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 7) return 10;
  const periods = Math.floor((days - 7) / 7);
  return Math.max(0, 10 - periods * 2);
}

function scoreConnectivity(
  data: Record<string, unknown>,
  body: string,
  indexContent: string | null,
  fileName: string,
): number {
  let s = 0;

  const tags = data['tags'];
  const hasTags = Array.isArray(tags) ? tags.length > 0
    : typeof tags === 'string' ? tags.trim().length > 0
    : false;
  if (hasTags) s += 3;

  if (indexContent && indexContent.includes(fileName)) s += 4;

  if (/\[.*?\]\(.*?\.md\)/.test(body) || /\.md(?:\s|$|[)#|])/m.test(body)) s += 3;

  return s;
}

function scoreDensity(body: string): number {
  const lines = body.split('\n');
  const total = lines.length;
  if (total === 0) return 0;

  let s = 0;

  const nonEmpty = lines.filter(l => l.trim().length > 0).length;
  const ratio = nonEmpty / total;
  if (ratio >= 0.8) s += 5;
  else if (ratio >= 0.6) s += 3;
  else s += 1;

  if (lines.some(l => /^#{1,6}\s/.test(l))) s += 3;

  let consecutive = 0;
  let hasLongGap = false;
  for (const l of lines) {
    if (l.trim() === '') { consecutive++; if (consecutive >= 3) hasLongGap = true; }
    else consecutive = 0;
  }
  if (!hasLongGap) s += 2;

  return s;
}

export async function scoreDocument(filePath: string, agentmeDir: string): Promise<L1Score> {
  const raw = await readFileSafe(filePath);
  if (raw === null) {
    return { total: 0, dimensions: { frontmatter: 0, volume: 0, freshness: 0, connectivity: 0, density: 0 } };
  }

  const doc = parseFrontmatter(raw);
  const body = doc.content;
  const bodyLines = body.split('\n').length;
  const fileName = path.basename(filePath);

  const indexPath = path.join(path.dirname(filePath), '_Index.md');
  const indexContent = await readFileSafe(indexPath);

  const dimensions: L1Dimensions = {
    frontmatter: scoreFrontmatter(doc.data),
    volume: scoreVolume(bodyLines),
    freshness: scoreFreshness(doc.data),
    connectivity: scoreConnectivity(doc.data, body, indexContent, fileName),
    density: scoreDensity(body),
  };

  return {
    total: dimensions.frontmatter + dimensions.volume + dimensions.freshness + dimensions.connectivity + dimensions.density,
    dimensions,
  };
}
