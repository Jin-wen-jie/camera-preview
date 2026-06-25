import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand } from '../src/voice-commands.js';

test('flower commands', () => {
  assert.deepEqual(parseVoiceCommand('花'),   { label: '花', type: 'effect', key: 'flower' });
  assert.deepEqual(parseVoiceCommand('花雨'), { label: '花', type: 'effect', key: 'flower' });
  assert.deepEqual(parseVoiceCommand('花海'), { label: '花', type: 'effect', key: 'flower' });
});

test('snow commands', () => {
  assert.deepEqual(parseVoiceCommand('雪'),   { label: '雪', type: 'effect', key: 'snow' });
  assert.deepEqual(parseVoiceCommand('下雪'), { label: '雪', type: 'effect', key: 'snow' });
});

test('heart commands', () => {
  assert.deepEqual(parseVoiceCommand('爱心'), { label: '爱心', type: 'effect', key: 'heart' });
  assert.deepEqual(parseVoiceCommand('心'),   { label: '爱心', type: 'effect', key: 'heart' });
});

test('clear commands', () => {
  assert.deepEqual(parseVoiceCommand('清除'), { label: '清除', type: 'clear-effects', key: null });
});

test('unrelated speech returns null', () => {
  assert.equal(parseVoiceCommand('你好'), null);
  assert.equal(parseVoiceCommand(''), null);
});

test('substring matching', () => {
  assert.deepEqual(parseVoiceCommand('我想要花雨'), { label: '花', type: 'effect', key: 'flower' });
});
