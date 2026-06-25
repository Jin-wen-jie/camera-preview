import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand } from '../src/voice-commands.js';

// ─── Flower effect ───────────────────────────────────────

test('parseVoiceCommand recognizes flower effect commands', () => {
  assert.deepEqual(parseVoiceCommand('花'),   { label: '花', type: 'effect', key: 'flower' });
  assert.deepEqual(parseVoiceCommand('花雨'), { label: '花', type: 'effect', key: 'flower' });
  assert.deepEqual(parseVoiceCommand('花海'), { label: '花', type: 'effect', key: 'flower' });
  assert.deepEqual(parseVoiceCommand('浪漫'), { label: '花', type: 'effect', key: 'flower' });
  assert.deepEqual(parseVoiceCommand('好看'), { label: '花', type: 'effect', key: 'flower' });
});

// ─── Clear effects ───────────────────────────────────────

test('parseVoiceCommand recognizes clear effect commands', () => {
  assert.deepEqual(parseVoiceCommand('清除'), { label: '清除', type: 'clear-effects', key: null });
  assert.deepEqual(parseVoiceCommand('清屏'), { label: '清除', type: 'clear-effects', key: null });
  assert.deepEqual(parseVoiceCommand('关闭'), { label: '清除', type: 'clear-effects', key: null });
});

// ─── Unrecognized / edge cases ───────────────────────────

test('parseVoiceCommand ignores unrelated speech', () => {
  assert.equal(parseVoiceCommand('你好'), null);
  assert.equal(parseVoiceCommand('今天天气真好'), null);
  assert.equal(parseVoiceCommand(''), null);
  assert.equal(parseVoiceCommand('  '), null);
});

test('parseVoiceCommand matches substring in longer text', () => {
  const result = parseVoiceCommand('我想要花雨');
  assert.deepEqual(result, { label: '花', type: 'effect', key: 'flower' });
});
