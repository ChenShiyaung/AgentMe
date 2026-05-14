import path from 'node:path';
import { readFileSafe, writeFileSafe } from './fs.js';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js';
import { nowISO } from './fs.js';

export interface EvolutionEntry {
  date: string;
  file: string;
  action: 'NEW' | 'APPEND' | 'MERGE' | 'SKIP';
  before: number | null;
  after: number;
  delta: number | null;
  source: string;
  note: string;
}

const EVOLUTION_FILE = '_Evolution.md';
const TABLE_HEADER = '| date | file | action | before | after | delta | source | note |';
const TABLE_SEPARATOR = '|------|------|--------|--------|-------|-------|--------|------|';

function evolutionPath(agentmeDir: string): string {
  return path.join(agentmeDir, EVOLUTION_FILE);
}

function createEmptyEvolution(): string {
  const fm = { type: 'evolution-log', entries: 0, last_updated: nowISO() };
  const body = `\n${TABLE_HEADER}\n${TABLE_SEPARATOR}\n`;
  return serializeFrontmatter(fm, body);
}

function parseTableRow(line: string): EvolutionEntry | null {
  const cells = line.split('|').map(c => c.trim()).filter(Boolean);
  if (cells.length < 8) return null;

  const before = cells[3] === '-' ? null : Number(cells[3]);
  const after = Number(cells[4]);
  const delta = cells[5] === '-' ? null : Number(cells[5]);

  if (Number.isNaN(after)) return null;

  return {
    date: cells[0],
    file: cells[1],
    action: cells[2] as EvolutionEntry['action'],
    before: before !== null && Number.isNaN(before) ? null : before,
    after,
    delta: delta !== null && Number.isNaN(delta) ? null : delta,
    source: cells[6],
    note: cells[7],
  };
}

export async function readEvolution(agentmeDir: string): Promise<EvolutionEntry[]> {
  const raw = await readFileSafe(evolutionPath(agentmeDir));
  if (!raw) return [];

  const doc = parseFrontmatter(raw);
  const lines = doc.content.split('\n');
  const entries: EvolutionEntry[] = [];

  let pastHeader = false;
  for (const line of lines) {
    if (line.startsWith('|---')) { pastHeader = true; continue; }
    if (!pastHeader) continue;
    if (!line.startsWith('|')) continue;

    const entry = parseTableRow(line);
    if (entry) entries.push(entry);
  }

  return entries;
}

function formatEntry(e: EvolutionEntry): string {
  const b = e.before === null ? '-' : String(e.before);
  const d = e.delta === null ? '-' : (e.delta >= 0 ? `+${e.delta}` : String(e.delta));
  return `| ${e.date} | ${e.file} | ${e.action} | ${b} | ${e.after} | ${d} | ${e.source} | ${e.note} |`;
}

export async function appendEvolution(agentmeDir: string, entry: EvolutionEntry): Promise<void> {
  const fp = evolutionPath(agentmeDir);
  let raw = await readFileSafe(fp);

  if (!raw) {
    raw = createEmptyEvolution();
  }

  const doc = parseFrontmatter(raw);
  const newLine = formatEntry(entry);
  const updatedBody = doc.content.trimEnd() + '\n' + newLine + '\n';

  const currentEntries = typeof doc.data['entries'] === 'number' ? doc.data['entries'] : 0;
  const updatedFm = {
    ...doc.data,
    entries: currentEntries + 1,
    last_updated: nowISO(),
  };

  await writeFileSafe(fp, serializeFrontmatter(updatedFm, updatedBody));
}
