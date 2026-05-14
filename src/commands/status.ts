import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import chalk from 'chalk';
import {
  directoryExists,
  listMarkdownFiles,
  readFileSafe,
  resolveAgentmeDir,
} from '../utils/fs.js';
import { parseFrontmatter, getFrontmatterField } from '../utils/frontmatter.js';
import { checkHealth } from '../utils/health.js';
import { readEvolution } from '../utils/evolution.js';
import { scoreDocument } from '../utils/scoring.js';

const LINE = chalk.dim('─────');
const TOP_DIRS = ['Me', 'Knowledge', 'Product', 'Tools', 'Skills', 'Current'] as const;

function isIndexMd(filePath: string): boolean {
  return path.basename(filePath) === '_Index.md';
}

async function fileExistsQuick(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function fileContains(p: string, keyword: string): Promise<boolean> {
  try {
    const content = await fs.readFile(p, 'utf8');
    return content.includes(keyword);
  } catch {
    return false;
  }
}

function formatDateHint(iso?: string): string {
  if (!iso) return chalk.dim('—');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return chalk.dim('—');
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days === 0) return chalk.green('今天');
  if (days === 1) return '1天前';
  return `${days}天前`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

async function totalBytes(root: string): Promise<number> {
  let sum = 0;
  async function walk(dir: string): Promise<void> {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(full); }
      else if (e.isFile()) {
        try { sum += (await fs.stat(full)).size; } catch { /* skip */ }
      }
    }
  }
  await walk(root);
  return sum;
}

async function dirStats(root: string, dirName: string): Promise<{ count: number; latest?: string }> {
  const base = path.join(root, dirName);
  let count = 0;
  let bestT = -1;
  let bestIso: string | undefined;

  async function walk(dir: string): Promise<void> {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(full); }
      else if (e.isFile() && e.name.endsWith('.md') && e.name !== '_Index.md') {
        count++;
        const raw = await readFileSafe(full);
        if (raw) {
          const iso = toIsoString(getFrontmatterField(parseFrontmatter(raw), 'updated'));
          if (iso) {
            const t = new Date(iso).getTime();
            if (!Number.isNaN(t) && t > bestT) { bestT = t; bestIso = iso; }
          }
        }
      }
    }
  }
  await walk(base);
  return { count, latest: bestIso };
}

function toIsoString(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string' && v.trim()) return v;
  return undefined;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  return [];
}

export async function statusCommand(options: { fix?: boolean }): Promise<void> {
  const agentmeDir = await resolveAgentmeDir();

  console.log(chalk.bold.cyan('AgentMe Status'));
  console.log(chalk.dim('═════════════'));
  console.log();

  const exists = await directoryExists(agentmeDir);
  if (exists) {
    console.log(`数据目录:  ${chalk.green('✓')} ${agentmeDir}`);
  } else {
    console.log(`数据目录:  ${chalk.red('✗')} ${agentmeDir}`);
    console.log(chalk.dim('运行 agentme init 创建画像'));
    return;
  }

  let allMd = await listMarkdownFiles(agentmeDir);
  allMd = allMd.filter(f => !isIndexMd(f));

  if (allMd.length === 0) {
    console.log(chalk.yellow('暂无文档数据'));
    console.log();
    await printPlatforms();
    await printHealth(agentmeDir);
    return;
  }

  let totalSources = 0;
  const createdDates: string[] = [];
  const updatedDates: string[] = [];
  const tagCounts = new Map<string, number>();

  for (const file of allMd) {
    const raw = await readFileSafe(file);
    if (!raw) continue;
    const doc = parseFrontmatter(raw);

    const c = toIsoString(getFrontmatterField(doc, 'created'));
    const u = toIsoString(getFrontmatterField(doc, 'updated'));
    if (c) createdDates.push(c);
    if (u) updatedDates.push(u);

    const s = getFrontmatterField(doc, 'sources');
    if (typeof s === 'number' && Number.isFinite(s)) totalSources += s;
    else if (typeof s === 'string') { const n = Number(s); if (Number.isFinite(n)) totalSources += n; }

    for (const t of normalizeTags(getFrontmatterField(doc, 'tags'))) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }

  const sorted = (dates: string[]) => dates
    .map(v => ({ raw: v, t: new Date(v).getTime() }))
    .filter(x => !Number.isNaN(x.t))
    .sort((a, b) => a.t - b.t);

  const createdSorted = sorted(createdDates);
  const updatedSorted = sorted(updatedDates);
  const earliest = createdSorted[0]?.raw;
  const latest = updatedSorted[updatedSorted.length - 1]?.raw;
  const sizeBytes = await totalBytes(agentmeDir);

  console.log(`文档数:    ${chalk.green(String(allMd.length))}`);
  console.log(`归档次数:  ${chalk.green(String(totalSources))}`);
  console.log(`首次归档:  ${earliest ? chalk.cyan(earliest.slice(0, 10)) : chalk.dim('—')}`);
  console.log(`最近归档:  ${latest ? chalk.cyan(latest.slice(0, 10)) : chalk.dim('—')}`);
  console.log(`目录大小:  ${chalk.dim(formatSize(sizeBytes))}`);
  console.log();

  console.log(chalk.bold('各目录'));
  console.log(LINE);
  for (const dir of TOP_DIRS) {
    const { count, latest: l } = await dirStats(agentmeDir, dir);
    console.log(
      `  ${chalk.dim(dir + '/').padEnd(18)} ${chalk.yellow(String(count).padStart(3))} 文件  ${chalk.dim('最近:')} ${formatDateHint(l)}`,
    );
  }
  console.log();

  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(chalk.bold('热门标签'));
  console.log(LINE);
  if (topTags.length === 0) {
    console.log(chalk.dim('  （无标签）'));
  } else {
    console.log('  ' + topTags.map(([t, n]) => `${chalk.bold(t)}${chalk.dim('(')}${n}${chalk.dim(')')}`).join(' '));
  }
  console.log();

  await printEvolution(agentmeDir);
  await printPlatforms();
  await printHealth(agentmeDir);
  await printLowScoreDocs(agentmeDir, allMd);

  if (options.fix) {
    console.log(chalk.dim('--fix 请使用 agentme validate --fix'));
  }
}

async function printPlatforms(): Promise<void> {
  console.log(chalk.bold('平台集成'));
  console.log(LINE);

  const home = os.homedir();
  const cursorGlobal = await fileExistsQuick(path.join(home, '.cursor', 'rules', 'agentme-identity.mdc'));
  const cursorProject = await fileExistsQuick(path.join(process.cwd(), '.cursor', 'rules', 'agentme-identity.mdc'));
  const claude = await fileContains(path.join(home, '.claude', 'CLAUDE.md'), 'AgentMe');

  const mark = (ok: boolean) => ok ? chalk.green('✓') : chalk.red('✗');
  console.log(`  Cursor (全局)  ${mark(cursorGlobal)}`);
  console.log(`  Cursor (项目)  ${mark(cursorProject)}`);
  console.log(`  Claude         ${mark(claude)}`);
  console.log();
}

async function printEvolution(agentmeDir: string): Promise<void> {
  const entries = await readEvolution(agentmeDir);
  console.log(chalk.bold('进化统计'));
  console.log(LINE);
  if (entries.length === 0) {
    console.log(chalk.dim('  （暂无归档记录）'));
  } else {
    const keep = entries.filter(e => e.action !== 'SKIP').length;
    const skip = entries.filter(e => e.action === 'SKIP').length;
    const newCount = entries.filter(e => e.action === 'NEW').length;
    const lastDate = entries[entries.length - 1]?.date ?? '—';
    console.log(`  总决策:  ${chalk.green(String(entries.length))}`);
    console.log(`  keep:    ${chalk.green(String(keep))}  skip: ${chalk.yellow(String(skip))}  new: ${chalk.cyan(String(newCount))}`);
    console.log(`  最近:    ${chalk.cyan(lastDate)}`);
  }
  console.log();
}

async function printLowScoreDocs(agentmeDir: string, files: string[]): Promise<void> {
  const LOW_THRESHOLD = 20;
  const lowDocs: { rel: string; total: number }[] = [];
  for (const f of files) {
    const score = await scoreDocument(f, agentmeDir);
    if (score.total < LOW_THRESHOLD) {
      lowDocs.push({ rel: path.relative(agentmeDir, f), total: score.total });
    }
  }
  if (lowDocs.length > 0) {
    console.log();
    console.log(chalk.bold('低分文档'));
    console.log(LINE);
    for (const d of lowDocs.sort((a, b) => a.total - b.total)) {
      console.log(`  ${chalk.red('▼')} ${chalk.cyan(d.rel)} — L1 总分 ${chalk.yellow(String(d.total))}/${chalk.dim('50')}`);
    }
  }
}

async function printHealth(agentmeDir: string): Promise<void> {
  const warnings = await checkHealth(agentmeDir);

  console.log(chalk.bold('健康提示'));
  console.log(LINE);
  if (warnings.length === 0) {
    console.log(chalk.green('  未发现问题'));
  } else {
    for (const w of warnings) {
      console.log(`  ${chalk.yellow('⚠')} ${chalk.cyan(w.file)} — ${w.message}`);
    }
  }
}
