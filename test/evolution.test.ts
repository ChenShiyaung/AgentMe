import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { readEvolution, appendEvolution, type EvolutionEntry } from '../src/utils/evolution.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentme-evo-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('evolution', () => {
  it('returns empty array when file does not exist', async () => {
    const entries = await readEvolution(tmpDir);
    assert.deepEqual(entries, []);
  });

  it('creates file and appends entry when file does not exist', async () => {
    const entry: EvolutionEntry = {
      date: '2026-05-14',
      file: 'Knowledge/arkts/state.md',
      action: 'MERGE',
      before: 72,
      after: 81,
      delta: 9,
      source: 'cursor session',
      note: '补充 @State 深度比较',
    };

    await appendEvolution(tmpDir, entry);

    const entries = await readEvolution(tmpDir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].file, 'Knowledge/arkts/state.md');
    assert.equal(entries[0].action, 'MERGE');
    assert.equal(entries[0].before, 72);
    assert.equal(entries[0].after, 81);
    assert.equal(entries[0].delta, 9);
  });

  it('appends multiple entries and updates frontmatter count', async () => {
    await appendEvolution(tmpDir, {
      date: '2026-05-14', file: 'a.md', action: 'NEW',
      before: null, after: 35, delta: null, source: 'test', note: 'first',
    });
    await appendEvolution(tmpDir, {
      date: '2026-05-14', file: 'b.md', action: 'SKIP',
      before: 40, after: 38, delta: -2, source: 'test', note: 'second',
    });

    const entries = await readEvolution(tmpDir);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].action, 'NEW');
    assert.equal(entries[0].before, null);
    assert.equal(entries[1].action, 'SKIP');
    assert.equal(entries[1].delta, -2);

    const raw = await fs.readFile(path.join(tmpDir, '_Evolution.md'), 'utf8');
    assert.ok(raw.includes('entries: 2'));
  });

  it('handles SKIP entry with negative delta', async () => {
    await appendEvolution(tmpDir, {
      date: '2026-05-14', file: 'Me/SOUL.md', action: 'SKIP',
      before: 85, after: 83, delta: -2, source: 'cursor', note: 'L2 rejected',
    });

    const entries = await readEvolution(tmpDir);
    assert.equal(entries[0].delta, -2);
  });
});
