import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('voice effect layer is positioned absolutely over the effect area', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.voice-effect-layer\s*\{[\s\S]*?position\s*:\s*absolute/);
  assert.match(css, /\.voice-effect-layer\s*\{[\s\S]*?inset\s*:\s*0/);
  assert.match(css, /\.voice-effect-layer\s*\{[\s\S]*?pointer-events\s*:\s*none/);
});

test('falling flower has animation keyframes', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@keyframes\s+flower-fall/);
  assert.match(css, /\.voice-effect--falling-flower/);
});

test('voice command panel has stable row styles', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.voice-command-panel/);
  assert.match(css, /\.voice-command-row/);
});

test('typed effect command controls are arranged as a compact input row', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.effect-command\b/);
  assert.match(css, /\.effect-command-input/);
});

test('status rows have per-state color variants', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /strong\[data-state="idle"\]/);
  assert.match(css, /strong\[data-state="success"\]/);
  assert.match(css, /strong\[data-state="error"\]/);
});

test('camera preview has horizontal mirror correction', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.camera-preview/);
  assert.match(css, /transform\s*:\s*scaleX\(-1\)/);
});

test('app shell uses grid layout with control panel side column', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.app-shell\s*\{[\s\S]*?display\s*:\s*grid/);
  assert.match(css, /\.control-panel/);
});

test('responsive layout collapses to single column', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@media\s*\(max-width:\s*860px\)/);
  assert.match(css, /grid-template-columns\s*:\s*1fr/);
});
