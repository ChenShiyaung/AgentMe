import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scoreDocument } from '../src/utils/scoring.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentme-score-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('scoreDocument', () => {
  it('scores a well-formed document near max', async () => {
    const dir = path.join(tmpDir, 'Knowledge');
    await fs.mkdir(dir, { recursive: true });

    const body = Array.from({ length: 80 }, (_, i) =>
      i === 0 ? '# State Management' : `Line ${i} about state management.`
    ).join('\n');

    const content = [
      '---',
      'type: knowledge',
      'tags: [arkts, state]',
      `created: ${today()}`,
      `updated: ${today()}`,
      'sources: 3',
      '---',
      '',
      body,
    ].join('\n');

    const filePath = path.join(dir, 'state.md');
    await fs.writeFile(filePath, content, 'utf8');

    const indexContent = [
      '---',
      'type: index',
      '---',
      '',
      '- [State](state.md)',
    ].join('\n');
    await fs.writeFile(path.join(dir, '_Index.md'), indexContent, 'utf8');

    const score = await scoreDocument(filePath, tmpDir);

    assert.equal(score.dimensions.frontmatter, 10);
    assert.equal(score.dimensions.volume, 10);
    assert.equal(score.dimensions.freshness, 10);
    assert.ok(score.dimensions.connectivity >= 7);
    assert.ok(score.dimensions.density >= 8);
    assert.ok(score.total >= 40, `Expected total >= 40, got ${score.total}`);
  });

  it('scores an empty shell document near zero', async () => {
    const dir = path.join(tmpDir, 'Me');
    await fs.mkdir(dir, { recursive: true });

    const content = 'Hello world';
    const filePath = path.join(dir, 'empty.md');
    await fs.writeFile(filePath, content, 'utf8');

    const score = await scoreDocument(filePath, tmpDir);

    assert.equal(score.dimensions.frontmatter, 0);
    assert.ok(score.dimensions.volume <= 2);
    assert.equal(score.dimensions.freshness, 0);
    assert.equal(score.dimensions.connectivity, 0);
    assert.ok(score.total <= 10, `Expected total <= 10, got ${score.total}`);
  });

  it('penalizes bloated documents on volume', async () => {
    const dir = path.join(tmpDir, 'Knowledge');
    await fs.mkdir(dir, { recursive: true });

    const body = Array.from({ length: 200 }, (_, i) => `Line ${i}`).join('\n');
    const content = [
      '---',
      'type: knowledge',
      'tags: [test]',
      `updated: ${today()}`,
      '---',
      '',
      body,
    ].join('\n');

    const filePath = path.join(dir, 'bloated.md');
    await fs.writeFile(filePath, content, 'utf8');

    const score = await scoreDocument(filePath, tmpDir);

    assert.ok(score.dimensions.volume < 10, `Expected volume < 10, got ${score.dimensions.volume}`);
    assert.ok(score.dimensions.volume >= 0);
  });

  it('returns zero for non-existent file', async () => {
    const score = await scoreDocument(path.join(tmpDir, 'nope.md'), tmpDir);
    assert.equal(score.total, 0);
  });
});
