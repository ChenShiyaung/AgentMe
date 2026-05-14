import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { nowISO } from '../src/utils/fs.js';

describe('nowISO', () => {
  test('returns ISO 8601–like local timestamp with milliseconds', () => {
    const s = nowISO();
    assert.match(
      s,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
      `expected timezone offset suffix, got: ${s}`,
    );
    assert.doesNotThrow(() => {
      const t = Date.parse(s);
      assert.ok(Number.isFinite(t));
    });
  });

  test('timezone offset matches current environment', () => {
    const s = nowISO();
    const m = s.match(/([+-])(\d{2}):(\d{2})$/);
    assert.ok(m);
    const sign = m![1] === '+' ? 1 : -1;
    const offMin = sign * (Number(m![2]) * 60 + Number(m![3]));
    assert.equal(offMin, -new Date().getTimezoneOffset());
  });
});
