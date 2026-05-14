import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { checkHealth } from '../src/utils/health.js';

async function makeTempAgentme(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'agentme-health-'));
}

describe('checkHealth', () => {
  test('returns no warnings when directory does not exist', async () => {
    const ghost = path.join(os.tmpdir(), `agentme-missing-${Date.now()}-${Math.random()}`);
    const warnings = await checkHealth(ghost);
    assert.deepEqual(warnings, []);
  });

  test('empty agentme folder yields no warnings', async () => {
    const root = await makeTempAgentme();
    try {
      assert.deepEqual(await checkHealth(root), []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('warns when markdown body exceeds merge line threshold', async () => {
    const root = await makeTempAgentme();
    try {
      const bodyLines = Array.from({ length: 151 }, (_, i) => `line ${i + 1}`).join('\n');
      await writeFile(
        path.join(root, 'large.md'),
        `---\ntitle: big\n---\n${bodyLines}\n`,
        'utf8',
      );
      const warnings = await checkHealth(root);
      assert.ok(warnings.some((w) => w.file === 'large.md'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('warns when sources count is at or above limit', async () => {
    const root = await makeTempAgentme();
    try {
      await writeFile(
        path.join(root, 'many-sources.md'),
        `---\nsources: 5\n---\nshort\n`,
        'utf8',
      );
      const warnings = await checkHealth(root);
      assert.ok(warnings.some((w) => w.file === 'many-sources.md'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('skips _Index.md for line count warnings', async () => {
    const root = await makeTempAgentme();
    try {
      const bodyLines = Array.from({ length: 160 }, (_, i) => `L${i}`).join('\n');
      await writeFile(path.join(root, '_Index.md'), `---\na: 1\n---\n${bodyLines}\n`, 'utf8');
      const warnings = await checkHealth(root);
      assert.deepEqual(warnings, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  let staleIso: string;
  before(() => {
    staleIso = new Date(Date.now() - 10 * 86_400_000).toISOString();
  });

  test('warns when Current/focus.md is stale', async () => {
    const root = await makeTempAgentme();
    try {
      await mkdir(path.join(root, 'Current'), { recursive: true });
      await writeFile(
        path.join(root, 'Current', 'focus.md'),
        `---\nupdated: ${staleIso}\n---\nfocus\n`,
        'utf8',
      );
      const warnings = await checkHealth(root);
      assert.ok(warnings.some((w) => w.file === 'Current/focus.md'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('warns when Me/SOUL.md has version 1', async () => {
    const root = await makeTempAgentme();
    try {
      await mkdir(path.join(root, 'Me'), { recursive: true });
      await writeFile(path.join(root, 'Me', 'SOUL.md'), `---\nversion: 1\n---\nSoul\n`, 'utf8');
      const warnings = await checkHealth(root);
      assert.ok(warnings.some((w) => w.file === 'Me/SOUL.md'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
