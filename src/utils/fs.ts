import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

/** AgentMe 默认数据目录路径 */
export const AGENTME_DIR = path.join(os.homedir(), '.agentme');

/**
 * 按优先级解析 agentme 目录：cwd/.agentme → ~/.agentme
 */
export async function resolveAgentmeDir(): Promise<string> {
  const local = path.join(process.cwd(), '.agentme');
  if (await directoryExists(local)) return local;
  return AGENTME_DIR;
}

export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const st = await fs.stat(dirPath);
    return st.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.cp(src, dest, { recursive: true });
}

export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        out.push(full);
      }
    }
  }

  await walk(dirPath);
  return out;
}

/** 当前时间的 ISO 8601 字符串（本地时间 + 时区偏移） */
export function nowISO(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}${sign}${oh}:${om}`;
}
