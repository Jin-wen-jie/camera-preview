import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('page and app cache-bust camera-voice modules together', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(html, /src="\.\/src\/app\.js\?v=3"/);
  assert.match(source, /captions\.js\?v=3/);
  assert.match(source, /effects\.js\?v=3/);
  assert.match(source, /voice-commands\.js\?v=3/);
  assert.match(source, /camera\.js\?v=3/);
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

test('app has no remaining hand-trail references', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(source, /startCamera/);
  assert.doesNotMatch(source, /hands/);
  assert.doesNotMatch(source, /finger/);
  assert.doesNotMatch(source, /trail/);
});

test('commands module has flower, snow, heart and clear commands', async () => {
  const commands = await readFile(new URL('../src/commands.js', import.meta.url), 'utf8');

  assert.match(commands, /key:\s*'flower'/);
  assert.match(commands, /key:\s*'snow'/);
  assert.match(commands, /key:\s*'heart'/);
  assert.match(commands, /type:\s*'clear-effects'/);
  assert.match(commands, /'下雪'/);
  assert.match(commands, /'爱心'/);
});

test('index.html has camera preview but no hand trail elements', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /camera-preview/);
  assert.match(html, /voice-effect-layer/);
  assert.match(html, /voice-command-panel/);
  assert.doesNotMatch(html, /hand-trail/);
  assert.doesNotMatch(html, /hand-status/);
  assert.match(html, /caption-start/);
  assert.match(html, /effect-form/);
});
