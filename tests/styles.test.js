import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('camera preview applies horizontal correction so text is not mirrored', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.camera-preview\s*\{[^}]*transform:\s*scaleX\(-1\)/s);
});
