import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { injectBlock, extractBlock, removeBlock } from '../src/utils/injection.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentme-inject-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('injectBlock', () => {
  it('creates file when it does not exist', async () => {
    const fp = path.join(tmpDir, 'new.md');
    await injectBlock(fp, 'hello world');
    const content = await fs.readFile(fp, 'utf8');
    assert.ok(content.includes('<!-- AGENTME:START -->'));
    assert.ok(content.includes('hello world'));
    assert.ok(content.includes('<!-- AGENTME:END -->'));
  });

  it('appends block to existing file without markers', async () => {
    const fp = path.join(tmpDir, 'existing.md');
    await fs.writeFile(fp, '# My Project\n\nSome rules here.\n', 'utf8');

    await injectBlock(fp, 'identity info');
    const content = await fs.readFile(fp, 'utf8');

    assert.ok(content.startsWith('# My Project'));
    assert.ok(content.includes('Some rules here.'));
    assert.ok(content.includes('<!-- AGENTME:START -->'));
    assert.ok(content.includes('identity info'));
  });

  it('replaces existing block (idempotent)', async () => {
    const fp = path.join(tmpDir, 'idem.md');
    await fs.writeFile(fp, '# Header\n\n<!-- AGENTME:START -->\nold content\n<!-- AGENTME:END -->\n\n# Footer\n', 'utf8');

    await injectBlock(fp, 'new content');
    const content = await fs.readFile(fp, 'utf8');

    assert.ok(content.includes('new content'));
    assert.ok(!content.includes('old content'));
    assert.ok(content.includes('# Header'));
    assert.ok(content.includes('# Footer'));

    const count = (content.match(/AGENTME:START/g) || []).length;
    assert.equal(count, 1);
  });

  it('supports custom tag name', async () => {
    const fp = path.join(tmpDir, 'custom.md');
    await injectBlock(fp, 'custom block', 'MYBLOCK');
    const content = await fs.readFile(fp, 'utf8');

    assert.ok(content.includes('<!-- MYBLOCK:START -->'));
    assert.ok(content.includes('<!-- MYBLOCK:END -->'));
    assert.ok(content.includes('custom block'));
  });
});

describe('extractBlock', () => {
  it('extracts content from marker block', () => {
    const text = '# Header\n\n<!-- AGENTME:START -->\nsome content\n<!-- AGENTME:END -->\n';
    const result = extractBlock(text);
    assert.equal(result, 'some content');
  });

  it('returns null when no markers present', () => {
    assert.equal(extractBlock('no markers here'), null);
  });

  it('supports custom tag', () => {
    const text = '<!-- FOO:START -->\nbar\n<!-- FOO:END -->';
    assert.equal(extractBlock(text, 'FOO'), 'bar');
  });
});

describe('removeBlock', () => {
  it('removes marker block from file', async () => {
    const fp = path.join(tmpDir, 'remove.md');
    await fs.writeFile(fp, '# Header\n\n<!-- AGENTME:START -->\nstuff\n<!-- AGENTME:END -->\n\n# Footer\n', 'utf8');

    await removeBlock(fp);
    const content = await fs.readFile(fp, 'utf8');

    assert.ok(!content.includes('AGENTME:START'));
    assert.ok(!content.includes('stuff'));
    assert.ok(content.includes('# Header'));
    assert.ok(content.includes('# Footer'));
  });

  it('does nothing when file does not exist', async () => {
    await removeBlock(path.join(tmpDir, 'nope.md'));
  });
});
