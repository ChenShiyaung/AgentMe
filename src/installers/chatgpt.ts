import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { readFileSafe } from '../utils/fs.js';
import { renderTemplate } from '../utils/template.js';

export async function installChatgpt(
  agentmeDir: string,
  variables: Record<string, string>,
): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(__dirname, '..', 'templates', 'skills', 'chatgpt', 'instructions.txt');

  const template = await readFileSafe(templatePath);
  if (!template) return;

  const content = renderTemplate(template, { ...variables, agentmeDir });

  console.log('');
  console.log(chalk.yellow('═══ ChatGPT Custom Instructions ═══'));
  console.log(chalk.gray('请复制以下内容到 ChatGPT Settings → Custom Instructions:'));
  console.log('');
  console.log(content);
  console.log('');
  console.log(chalk.yellow('═══════════════════════════════════'));
}
