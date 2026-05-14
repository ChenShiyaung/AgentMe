import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { writeFileSafe, readFileSafe } from '../utils/fs.js';
import { renderTemplate } from '../utils/template.js';
import { parseFrontmatter } from '../utils/frontmatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CURSOR_TEMPLATES = path.join(__dirname, '..', 'templates', 'skills', 'cursor');

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

export async function installCursor(agentmeDir: string, scope: 'global' | 'project'): Promise<void> {
  const baseDir = scope === 'global'
    ? path.join(os.homedir(), '.cursor')
    : path.join(process.cwd(), '.cursor');

  const rulesDir = path.join(baseDir, 'rules');
  const skillsDir = path.join(baseDir, 'skills', 'agentme-archive');

  const variables: Record<string, string> = {
    agentmeDir,
    identitySummary: await generateIdentitySummary(agentmeDir),
    currentFocus: '（暂无，归档后自动更新）',
    cursorRulePath: rulesDir,
  };

  const ruleTemplate = await readFileSafe(path.join(CURSOR_TEMPLATES, 'agentme-identity.mdc'));
  if (ruleTemplate) {
    await writeFileSafe(
      path.join(rulesDir, 'agentme-identity.mdc'),
      renderTemplate(ruleTemplate, variables),
    );
  }

  const skillTemplate = await readFileSafe(path.join(CURSOR_TEMPLATES, 'agentme-archive', 'SKILL.md'));
  if (skillTemplate) {
    await writeFileSafe(
      path.join(skillsDir, 'SKILL.md'),
      renderTemplate(skillTemplate, variables),
    );
  }
}
