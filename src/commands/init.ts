import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import {
  AGENTME_DIR,
  copyDir,
  directoryExists,
  ensureDir,
  listMarkdownFiles,
  nowISO,
  writeFileSafe,
} from '../utils/fs.js';
import { renderTemplate } from '../utils/template.js';
import { readConfig, writeConfig, type AgentmeConfig } from '../utils/config.js';
import { installCursor } from '../installers/cursor.js';
import { installClaude } from '../installers/claude.js';
import { installChatgpt } from '../installers/chatgpt.js';
import { installAgents } from '../installers/agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'directory');

const CORE_DIRS = ['Me', 'Knowledge', 'Product', 'Tools', 'Skills', 'Current'];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const st = await fs.stat(filePath);
    return st.isFile();
  } catch {
    return false;
  }
}

async function checkDirIntegrity(dir: string): Promise<{ ok: boolean; missing: string[] }> {
  const missing: string[] = [];
  for (const d of CORE_DIRS) {
    if (!(await directoryExists(path.join(dir, d)))) missing.push(d + '/');
  }
  if (!(await fileExists(path.join(dir, '_Index.md')))) missing.push('_Index.md');
  return { ok: missing.length === 0, missing };
}

async function patchMissingFiles(templateRoot: string, destRoot: string): Promise<void> {
  const entries = await fs.readdir(templateRoot, { withFileTypes: true });
  for (const ent of entries) {
    const src = path.join(templateRoot, ent.name);
    const dst = path.join(destRoot, ent.name);
    if (ent.isDirectory()) {
      if (!(await directoryExists(dst))) await ensureDir(dst);
      await patchMissingFiles(src, dst);
    } else if (!(await fileExists(dst))) {
      await ensureDir(path.dirname(dst));
      await fs.copyFile(src, dst);
    }
  }
}

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

async function applyVariables(targetDir: string, variables: Record<string, string>): Promise<void> {
  const files = await listMarkdownFiles(targetDir);
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, renderTemplate(raw, variables), 'utf8');
  }
}

async function identityGuide(): Promise<Record<string, string>> {
  const name = await input({ message: '名字 / 昵称', default: '' });

  const roleChoices = [
    { value: '开发者', name: '开发者' },
    { value: '设计师', name: '设计师' },
    { value: '产品经理', name: '产品经理' },
    { value: '管理者', name: '管理者' },
    { value: '__custom__', name: '自定义' },
  ];
  const roleSelected = await checkbox({
    message: '主要角色（空格切换，回车确认）',
    choices: roleChoices,
  });
  const roles: string[] = roleSelected.filter((r): r is string => r !== '__custom__');
  if (roleSelected.includes('__custom__')) {
    const custom = await input({ message: '自定义角色', default: '' });
    if (custom.trim()) roles.push(custom.trim());
  }
  const role = roles.join('、');

  const techStack = await input({ message: '技术栈 / 领域', default: '' });
  const workStyle = await input({ message: '工作风格（可选，回车跳过）', default: '' });

  return {
    name,
    date: nowISO(),
    role,
    techStack,
    decisionStyle: '',
    codeStyle: '',
    communicationStyle: workStyle,
    ide: '',
    timezone: resolveTimezone(),
  };
}

async function askPlatforms(): Promise<{ name: string; scope: string }[]> {
  const platforms = await checkbox({
    message: '选择要安装的 AI 平台 SKILL',
    choices: [
      { value: 'cursor', name: 'Cursor' },
      { value: 'claude', name: 'Claude Desktop' },
      { value: 'chatgpt', name: 'ChatGPT' },
      { value: 'agents', name: 'AGENTS.md (Codex / Gemini CLI / Windsurf / Copilot)' },
      { value: '__skip__', name: '跳过' },
    ],
  });
  if (platforms.includes('__skip__') || platforms.length === 0) return [];

  const result: { name: string; scope: string }[] = [];
  for (const p of platforms) {
    if (p === '__skip__') continue;
    if (p === 'cursor') {
      const scope = await select<string>({
        message: 'Cursor 安装范围',
        choices: [
          { value: 'global', name: '全局 (~/.cursor/)' },
          { value: 'project', name: '项目级 (./.cursor/)' },
        ],
      });
      result.push({ name: 'cursor', scope });
    } else if (p === 'agents') {
      const scope = await select<string>({
        message: 'AGENTS.md 安装范围',
        choices: [
          { value: 'project', name: '项目级 (./AGENTS.md)' },
          { value: 'global', name: 'Codex 全局 (~/.codex/AGENTS.md)' },
        ],
      });
      result.push({ name: 'agents', scope });
    } else {
      result.push({ name: p, scope: 'global' });
    }
  }
  return result;
}

async function doInstallPlatforms(
  platforms: { name: string; scope: string }[],
  agentmeDir: string,
  variables: Record<string, string>,
): Promise<void> {
  for (const p of platforms) {
    if (p.name === 'cursor') {
      await installCursor(agentmeDir, p.scope as 'global' | 'project');
      console.log(chalk.green(`  ✓ Cursor SKILL/Rule (${p.scope === 'global' ? '全局' : '项目级'})`));
    }
    if (p.name === 'claude') {
      await installClaude(agentmeDir);
      console.log(chalk.green('  ✓ Claude CLAUDE.md'));
    }
    if (p.name === 'chatgpt') {
      await installChatgpt(agentmeDir, variables);
      console.log(chalk.green('  ✓ ChatGPT 指令'));
    }
    if (p.name === 'agents') {
      await installAgents(agentmeDir, p.scope as 'project' | 'global');
      console.log(chalk.green(`  ✓ AGENTS.md (${p.scope === 'global' ? 'Codex 全局' : '项目级'})`));
    }
  }
}

async function maybeInitGit(agentmeDir: string): Promise<void> {
  const initGit = await confirm({
    message: `是否在 ${agentmeDir} 中初始化 Git？`,
    default: false,
  });
  if (!initGit) return;

  try {
    execSync('git init', { cwd: agentmeDir, stdio: 'pipe' });
    await writeFileSafe(path.join(agentmeDir, '.gitignore'), '');
    execSync('git add .', { cwd: agentmeDir, stdio: 'pipe' });
    execSync('git commit -m "Initial AgentMe profile"', { cwd: agentmeDir, stdio: 'pipe' });
    console.log(chalk.green('  ✓ Git 仓库已初始化'));
  } catch {
    console.log(chalk.yellow('  Git 初始化失败（可能未安装 git 或已在仓库中）'));
  }
}

async function firstTimeInit(): Promise<void> {
  console.log(chalk.bold.cyan('AgentMe 首次初始化'));
  console.log();

  const hasExisting = await confirm({
    message: '你有已存在的 .agentme 画像目录吗？',
    default: false,
  });

  let agentmeDir: string;

  if (hasExisting) {
    const customDir = await input({
      message: '输入 .agentme 目录路径',
      default: AGENTME_DIR,
    });
    agentmeDir = path.resolve(customDir);

    if (!(await directoryExists(agentmeDir))) {
      console.log(chalk.red(`目录不存在: ${agentmeDir}`));
      return;
    }

    const { ok, missing } = await checkDirIntegrity(agentmeDir);
    if (!ok) {
      console.log(chalk.yellow(`目录不完整，缺少: ${missing.join(', ')}`));
      const fix = await confirm({ message: '自动补全缺失文件？', default: true });
      if (fix) {
        await patchMissingFiles(TEMPLATES_DIR, agentmeDir);
        console.log(chalk.green('✓ 缺失文件已补全'));
      } else {
        console.log(chalk.yellow('跳过补全'));
      }
    } else {
      console.log(chalk.green(`✓ 画像目录完整: ${agentmeDir}`));
    }
  } else {
    const dirChoice = await select<'home' | 'project' | 'custom'>({
      message: '画像数据目录放在哪里?',
      choices: [
        { value: 'home', name: `用户目录 (${AGENTME_DIR})` },
        { value: 'project', name: `当前项目 (${path.join(process.cwd(), '.agentme')})` },
        { value: 'custom', name: '自定义路径' },
      ],
    });

    if (dirChoice === 'home') {
      agentmeDir = AGENTME_DIR;
    } else if (dirChoice === 'project') {
      agentmeDir = path.join(process.cwd(), '.agentme');
    } else {
      const customPath = await input({ message: '输入目录路径', default: AGENTME_DIR });
      agentmeDir = path.resolve(customPath);
    }

    await copyDir(TEMPLATES_DIR, agentmeDir);
    console.log(chalk.green(`✓ 画像目录已创建: ${agentmeDir}`));

    const variables = await identityGuide();
    await applyVariables(agentmeDir, variables);

    await maybeInitGit(agentmeDir);
  }

  console.log();
  const platforms = await askPlatforms();

  const config: AgentmeConfig = {
    agentmeDir,
    platforms: platforms.map(p => ({ ...p, installedAt: nowISO() })),
    initializedAt: nowISO(),
  };

  if (platforms.length > 0) {
    console.log();
    await doInstallPlatforms(platforms, agentmeDir, { name: '', role: '', techStack: '' });
  }

  await writeConfig(config);

  console.log();
  console.log(chalk.green('✓ 初始化完成'));
  console.log(chalk.dim(`  画像目录: ${agentmeDir}`));
  console.log(chalk.dim(`  配置文件: ${os.homedir()}/.agentme.json`));
  if (platforms.length > 0) {
    console.log(chalk.dim(`  已安装平台: ${platforms.map(p => p.name).join(', ')}`));
  }
  console.log();
  console.log(chalk.dim('再次执行 agentme init 可安装 SKILL 到其他平台'));
}

async function reinstallInit(config: AgentmeConfig): Promise<void> {
  console.log(chalk.bold.cyan('AgentMe 已初始化'));
  console.log();
  console.log(`  画像目录: ${chalk.green(config.agentmeDir)}`);
  console.log(`  初始化时间: ${chalk.dim(config.initializedAt.slice(0, 10))}`);

  if (config.platforms.length > 0) {
    console.log('  已安装平台:');
    for (const p of config.platforms) {
      console.log(`    ${chalk.green('✓')} ${p.name} (${p.scope})`);
    }
  }
  console.log();

  const action = await select<'install' | 'reinstall' | 'reset' | 'quit'>({
    message: '选择操作',
    choices: [
      { value: 'install', name: '安装 SKILL 到新平台（如同步到 Claude）' },
      { value: 'reinstall', name: '重新安装已有平台的 SKILL' },
      { value: 'reset', name: '重置：清除配置，重新初始化' },
      { value: 'quit', name: '退出' },
    ],
  });

  if (action === 'quit') return;

  if (action === 'reset') {
    const sure = await confirm({ message: '确认重置？（画像目录不会删除，仅清除配置）', default: false });
    if (!sure) return;
    const configPath = path.join(os.homedir(), '.agentme.json');
    try { await fs.unlink(configPath); } catch { /* ignore */ }
    console.log(chalk.green('✓ 配置已清除，再次执行 agentme init 重新初始化'));
    return;
  }

  if (!(await directoryExists(config.agentmeDir))) {
    console.log(chalk.red(`画像目录不存在: ${config.agentmeDir}`));
    console.log(chalk.dim('请重置后重新初始化'));
    return;
  }

  if (action === 'install') {
    const platforms = await askPlatforms();
    if (platforms.length === 0) {
      console.log(chalk.yellow('未选择任何平台'));
      return;
    }
    await doInstallPlatforms(platforms, config.agentmeDir, { name: '', role: '', techStack: '' });

    for (const p of platforms) {
      const existing = config.platforms.find(e => e.name === p.name && e.scope === p.scope);
      if (existing) {
        existing.installedAt = nowISO();
      } else {
        config.platforms.push({ ...p, installedAt: nowISO() });
      }
    }
    await writeConfig(config);
    console.log(chalk.green('✓ SKILL 安装完成'));
  }

  if (action === 'reinstall') {
    if (config.platforms.length === 0) {
      console.log(chalk.yellow('没有已安装的平台，请选择"安装到新平台"'));
      return;
    }
    const choices = config.platforms.map(p => ({
      value: p,
      name: `${p.name} (${p.scope})`,
    }));
    const selected = await checkbox({
      message: '选择要重新安装的平台',
      choices,
    });
    if (selected.length === 0) return;

    const toInstall = selected.map(p => ({ name: p.name, scope: p.scope }));
    await doInstallPlatforms(toInstall, config.agentmeDir, { name: '', role: '', techStack: '' });

    for (const p of selected) {
      p.installedAt = nowISO();
    }
    await writeConfig(config);
    console.log(chalk.green('✓ SKILL 重新安装完成'));
  }
}

export async function initCommand(): Promise<void> {
  const config = await readConfig();

  if (config) {
    await reinstallInit(config);
  } else {
    await firstTimeInit();
  }
}
