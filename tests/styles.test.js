import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('camera preview applies horizontal correction so text is not mirrored', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.camera-preview\s*\{[^}]*transform:\s*scaleX\(-1\)/s);
});

test('desktop layout gives most of the page width to the camera preview', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1\.75fr\)\s*minmax\(280px,\s*0\.55fr\)/);
  assert.match(css, /width:\s*min\(1480px,\s*calc\(100% - 24px\)\)/);
});

test('live captions are overlaid at the bottom of the camera preview', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.caption-overlay\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /\.caption-overlay\s*\{[^}]*bottom:\s*clamp\(12px,\s*2vw,\s*24px\)/s);
  assert.match(css, /\.caption-overlay\s*\{[^}]*z-index:\s*3/s);
});
