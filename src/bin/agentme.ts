#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from '../commands/init.js';
import { validateCommand } from '../commands/validate.js';
import { statusCommand } from '../commands/status.js';

function withGracefulExit<T extends (...args: any[]) => Promise<void>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err) {
      if (err instanceof Error && err.name === 'ExitPromptError') {
        console.log(chalk.dim('\n已取消'));
        process.exit(0);
      }
      throw err;
    }
  }) as T;
}

const program = new Command();

program
  .name('agentme')
  .description('Build your portable AI identity with pure documents')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize AgentMe profile and install AI platform integrations')
  .action(withGracefulExit(initCommand));

program
  .command('validate')
  .description('Check directory structure, document format, and index consistency')
  .option('--fix', 'Auto-fix repairable issues (index counts, timestamps)')
  .action(withGracefulExit(validateCommand));

program
  .command('status')
  .alias('stats')
  .description('Show profile status, statistics, platform integrations, and health tips')
  .action(statusCommand);

program.parse();
