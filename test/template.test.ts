import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from '../src/utils/template.js';

describe('renderTemplate', () => {
  test('replaces a single placeholder', () => {
    assert.equal(renderTemplate('Hi {{name}}!', { name: 'Ada' }), 'Hi Ada!');
  });

  test('replaces multiple variables', () => {
    assert.equal(
      renderTemplate('{{a}} + {{b}} = {{sum}}', { a: '1', b: '2', sum: '3' }),
      '1 + 2 = 3',
    );
  });

  test('leaves unknown placeholders unchanged', () => {
    assert.equal(renderTemplate('{{known}} {{missing}}', { known: 'x' }), 'x {{missing}}');
  });

  test('allows empty string replacement', () => {
    assert.equal(renderTemplate('{{x}}end', { x: '' }), 'end');
  });
});
