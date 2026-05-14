import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatter,
  serializeFrontmatter,
  getFrontmatterField,
} from '../src/utils/frontmatter.js';

describe('frontmatter', () => {
  test('parses valid YAML frontmatter', () => {
    const raw = `---
title: Hello
count: 2
---
Body line 1
Body line 2
`;
    const doc = parseFrontmatter(raw);
    assert.equal(doc.data.title, 'Hello');
    assert.equal(doc.data.count, 2);
    assert.equal(doc.content.trim(), 'Body line 1\nBody line 2');
    assert.equal(doc.raw, raw);
  });

  test('getFrontmatterField returns typed field or undefined', () => {
    const doc = parseFrontmatter('---\nfoo: bar\n---\n');
    assert.equal(getFrontmatterField<string>(doc, 'foo'), 'bar');
    assert.equal(getFrontmatterField(doc, 'nope'), undefined);
  });

  test('serialize then parse round-trips content and data', () => {
    const data = { name: 'Me', version: 2 };
    const content = 'Hello\nWorld';
    const raw = serializeFrontmatter(data, content);
    const again = parseFrontmatter(raw);
    assert.equal(again.content.trim(), content);
    assert.equal(again.data.name, 'Me');
    assert.equal(again.data.version, 2);
  });

  test('document without frontmatter yields empty data and full body as content', () => {
    const body = 'Just markdown\nno fence';
    const doc = parseFrontmatter(body);
    assert.deepEqual(doc.data, {});
    assert.equal(doc.content, body);
  });
});
