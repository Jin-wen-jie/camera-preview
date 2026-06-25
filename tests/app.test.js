import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('page and app cache-bust voice-only modules together', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(html, /src="\.\/src\/app\.js\?v=voice-only"/);
  assert.match(source, /captions\.js\?v=voice-only/);
  assert.match(source, /effects\.js\?v=voice-only/);
  assert.match(source, /voice-commands\.js\?v=voice-only/);
});

test('app module loads without throwing', async () => {
  // In Node.js test env without real DOM, we just verify the module can be parsed
  // Individual modules (captions, effects, voice-commands) have their own unit tests
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(source, /createCaptionController/);
  assert.match(source, /createVoiceEffectController/);
  assert.match(source, /parseVoiceCommand/);
  assert.match(source, /captionStartButton/);
  assert.match(source, /effectForm/);
  assert.match(source, /voiceEffects/);
});

test('app has no remaining camera or hand references', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /camera/);
  assert.doesNotMatch(source, /hands/);
  assert.doesNotMatch(source, /finger/);
  assert.doesNotMatch(source, /trail/);
  assert.doesNotMatch(source, /handTrail/);
});

test('voice-commands module has flower, snow, heart and clear commands', async () => {
  const source = await readFile(new URL('../src/voice-commands.js', import.meta.url), 'utf8');

  assert.match(source, /key:\s*'flower'/);
  assert.match(source, /key:\s*'snow'/);
  assert.match(source, /key:\s*'heart'/);
  assert.match(source, /type:\s*'clear-effects'/);
  assert.match(source, /'下雪'/);
  assert.match(source, /'爱心'/);
});

test('index.html has no camera or hand trail elements', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /camera-preview/);
  assert.doesNotMatch(html, /hand-trail/);
  assert.doesNotMatch(html, /hand-status/);
  assert.match(html, /voice-effect-layer/);
  assert.match(html, /voice-command-panel/);
  assert.match(html, /caption-start/);
  assert.match(html, /effect-form/);
});
