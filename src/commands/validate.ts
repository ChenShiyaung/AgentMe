import path from 'node:path';
import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import chalk from 'chalk';
import {
  directoryExists,
  readFileSafe,
  writeFileSafe,
  listMarkdownFiles,
  nowISO,
  resolveAgentmeDir,
} from '../utils/fs.js';
import { parseFrontmatter, serializeFrontmatter } from '../utils/frontmatter.js';
import { checkHealth } from '../utils/health.js';

const CORE_DIRS = ['Me', 'Knowledge', 'Product', 'Tools', 'Skills', 'Current'];
const REQUIRED_FILES = [
  '_Index.md',
  'Me/_Index.md',
  'Me/SOUL.md',
  'Me/Roles.md',
  'Knowledge/_Index.md',
  'Product/_Index.md',
  'Tools/_Index.md',
  'Skills/_Index.md',
  'Current/_Index.md',
];

const DIR_COUNT_SCOPES = new Set(['root', 'knowledge', 'product', 'tools', 'skills']);

function rel(base: string, p: string): string {
  return path.relative(base, p).replace(/\\/g, '/');
}

function isNonEmptyRecord(data: Record<string, unknown>): boolean {
  return Object.keys(data).length > 0;
}

function hasTypeField(data: Record<string, unknown>): boolean {
  const t = data.type;
  return t !== undefined && t !== null && String(t).trim() !== '';
}

function isValidDateValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v !== 'string' || v.trim() === '') return false;
  const ms = Date.parse(v);
  return !Number.isNaN(ms);
}

function parseChildrenValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number.parseInt(raw.trim(), 10);
  return null;
}

async function countExpectedChildren(scope: string, dirPath: string): Promise<number | null> {
  let entries: Dirent[];
  try {
    entries = (await fs.readdir(dirPath, { withFileTypes: true })) as Dirent[];
  } catch {
    return null;
  }
  if (DIR_COUNT_SCOPES.has(scope)) {
    return entries.filter((e) => e.isDirectory()).length;
  }
  if (scope === 'me' || scope === 'current') {
    return entries.filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== '_Index.md').length;
  }
  return null;
}

function lineCount(raw: string): number {
  if (raw === '') return 0;
  return raw.split(/\r?\n/).length;
}

function sourcesWarningLevel(data: Record<string, unknown>): boolean {
  const s = data.sources;
  if (typeof s === 'number' && s >= 5) return true;
  if (Array.isArray(s) && s.length >= 5) return true;
  return false;
}

function getTypeString(data: Record<string, unknown>): string {
  const t = data.type;
  return t === undefined || t === null ? '' : String(t);
}

export async function validateCommand(options: { fix?: boolean }) {
  const AGENTME_DIR = await resolveAgentmeDir();
  let errors = 0;
  let warnings = 0;

  console.log(chalk.bold('AgentMe Validate'));
  console.log('═══════════════\n');

  console.log(`数据目录: ${AGENTME_DIR}`);
  console.log('结构完整性');

  if (!(await directoryExists(AGENTME_DIR))) {
    console.log(chalk.red(`  ✗ AgentMe 目录不存在: ${AGENTME_DIR}`));
    errors += 1;
    console.log(`\nSummary: ${errors} errors, ${warnings} warnings`);
    process.exit(1);
  }

  const missingCore = [];
  for (const d of CORE_DIRS) {
    const full = path.join(AGENTME_DIR, d);
    if (!(await directoryExists(full))) missingCore.push(d);
  }
  if (missingCore.length === 0) {
    console.log(chalk.green('  ✓ 核心目录完整'));
  } else {
    for (const d of missingCore) {
      console.log(chalk.red(`  ✗ 缺少目录 ${d}`));
      errors += 1;
    }
  }

  const missingReq = [];
  for (const f of REQUIRED_FILES) {
    const full = path.join(AGENTME_DIR, f);
    const raw = await readFileSafe(full);
    if (raw === null) missingReq.push(f);
  }
  if (missingReq.length === 0) {
    console.log(chalk.green('  ✓ 必需文件完整'));
  } else {
    for (const f of missingReq) {
      console.log(chalk.red(`  ✗ ${f} 缺失`));
      errors += 1;
    }
  }

  console.log('\n文档格式');

  let mdPaths: string[] = [];
  try {
    mdPaths = await listMarkdownFiles(AGENTME_DIR);
  } catch {
    console.log(chalk.red('  ✗ 无法遍历 Markdown 文件'));
    errors += 1;
    mdPaths = [];
  }

  const formatIssues: string[] = [];
  const parsedByPath = new Map<string, ReturnType<typeof parseFrontmatter>>();

  for (const filePath of mdPaths) {
    const raw = await readFileSafe(filePath);
    if (raw === null) continue;
    const doc = parseFrontmatter(raw);
    parsedByPath.set(filePath, doc);
    const r = rel(AGENTME_DIR, filePath);

    if (!isNonEmptyRecord(doc.data)) {
      formatIssues.push(`${r}: frontmatter 缺失或为空`);
      continue;
    }
    if (!hasTypeField(doc.data)) {
      formatIssues.push(`${r}: 缺少 type 字段`);
    }
    if (path.basename(filePath) === '_Index.md' && getTypeString(doc.data) !== 'index') {
      formatIssues.push(`${r}: _Index.md 的 type 须为 index`);
    }
    if (!isValidDateValue(doc.data.created)) {
      formatIssues.push(`${r}: created 日期格式无效`);
    }
    if (!isValidDateValue(doc.data.updated)) {
      formatIssues.push(`${r}: updated 日期格式无效`);
    }
  }

  if (formatIssues.length === 0) {
    console.log(chalk.green('  ✓ 所有文档格式合规'));
  } else {
    for (const msg of formatIssues) {
      console.log(chalk.red(`  ✗ ${msg}`));
      errors += 1;
    }
  }

  console.log('\n索引一致性');

  const indexFiles = mdPaths.filter((p) => path.basename(p) === '_Index.md');
  const indexIssues: string[] = [];

  for (const indexPath of indexFiles) {
    const doc = parsedByPath.get(indexPath);
    if (!doc || !isNonEmptyRecord(doc.data)) continue;
    const scopeRaw = doc.data.scope;
    const scope = typeof scopeRaw === 'string' ? scopeRaw.toLowerCase() : '';
    const dirPath = path.dirname(indexPath);
    if (!scope) {
      indexIssues.push(`${rel(AGENTME_DIR, indexPath)}: 缺少 scope`);
      continue;
    }
    if (!DIR_COUNT_SCOPES.has(scope) && scope !== 'me' && scope !== 'current') {
      indexIssues.push(`${rel(AGENTME_DIR, indexPath)}: 未知 scope "${scopeRaw}"，无法校验 children`);
      continue;
    }

    const declared = parseChildrenValue(doc.data.children);
    if (declared === null) {
      indexIssues.push(`${rel(AGENTME_DIR, indexPath)}: children 无效或缺失`);
      continue;
    }

    const actual = await countExpectedChildren(scope, dirPath);
    if (actual === null) {
      indexIssues.push(`${rel(AGENTME_DIR, indexPath)}: 无法读取目录`);
      continue;
    }

    if (declared !== actual) {
      if (options.fix) {
        const next = { ...doc.data, children: actual, updated: nowISO() };
        const out = serializeFrontmatter(next, doc.content);
        await writeFileSafe(indexPath, out);
      } else {
        indexIssues.push(`${rel(AGENTME_DIR, indexPath)}: children=${declared}, 实际=${actual}`);
      }
    }
  }

  if (indexIssues.length === 0) {
    console.log(chalk.green('  ✓ 索引与目录一致'));
  } else {
    for (const msg of indexIssues) {
      console.log(chalk.red(`  ✗ ${msg}`));
      errors += 1;
    }
  }

  console.log('\n健康提示');

  const healthList = await checkHealth(AGENTME_DIR);
  if (healthList.length === 0) {
    console.log(chalk.green('  ✓ 无健康度提示'));
  } else {
    for (const w of healthList) {
      console.log(chalk.yellow(`  ⚠ ${w.file}: ${w.message}`));
      warnings += 1;
    }
  }

  console.log(`\nSummary: ${errors} errors, ${warnings} warnings`);

  if (errors === 0) {
    console.log(chalk.green('\n✓ All checks passed'));
  } else {
    process.exit(1);
  }
}
