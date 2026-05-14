import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { readFileSafe } from '../utils/fs.js';
import { renderTemplate } from '../utils/template.js';
import { injectBlock } from '../utils/injection.js';

export async function installClaude(agentmeDir: string): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(__dirname, '..', 'templates', 'skills', 'claude', 'CLAUDE.md');

  const template = await readFileSafe(templatePath);
  if (!template) return;

  const variables = {
    agentmeDir,
    identitySummary: '（初次安装，归档后自动更新）',
    currentFocus: '（暂无）',
  };

  const content = renderTemplate(template, variables);

  const targetPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  await injectBlock(targetPath, content);
}
