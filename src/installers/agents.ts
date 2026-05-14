import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { readFileSafe, ensureDir } from '../utils/fs.js';
import { renderTemplate } from '../utils/template.js';
import { injectBlock } from '../utils/injection.js';
import { parseFrontmatter } from '../utils/frontmatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'skills', 'agents', 'identity-block.md');

async function generateIdentitySummary(agentmeDir: string): Promise<string> {
  const rolesRaw = await readFileSafe(path.join(agentmeDir, 'Me', 'Roles.md'));
  if (rolesRaw) {
    const lines = rolesRaw.split('\n').filter(l => l.match(/^- \*\*.+\*\*/));
    if (lines.length) return lines.join('\n');
  }

  const soulRaw = await readFileSafe(path.join(agentmeDir, 'Me', 'SOUL.md'));
  if (soulRaw) {
    const doc = parseFrontmatter(soulRaw);
    const bodyLines = doc.content
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .slice(0, 5);
    if (bodyLines.length) return bodyLines.join('\n');
  }

  return '（初次安装，归档后自动更新）';
}

async function getCurrentFocus(agentmeDir: string): Promise<string> {
  const raw = await readFileSafe(path.join(agentmeDir, 'Current', 'focus.md'));
  if (!raw) return '（暂无）';
  const doc = parseFrontmatter(raw);
  const lines = doc.content.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 3);
  return lines.length > 0 ? lines.join('\n') : '（暂无）';
}

export async function installAgents(agentmeDir: string, scope: 'project' | 'global'): Promise<void> {
  const template = await readFileSafe(TEMPLATE_PATH);
  if (!template) return;

  const variables = {
    agentmeDir,
    identitySummary: await generateIdentitySummary(agentmeDir),
    currentFocus: await getCurrentFocus(agentmeDir),
  };

  const content = renderTemplate(template, variables);

  let targetPath: string;
  if (scope === 'global') {
    const codexDir = path.join(os.homedir(), '.codex');
    await ensureDir(codexDir);
    targetPath = path.join(codexDir, 'AGENTS.md');
  } else {
    targetPath = path.join(process.cwd(), 'AGENTS.md');
  }

  await injectBlock(targetPath, content);
}
