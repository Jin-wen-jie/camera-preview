import test from 'node:test';
import assert from 'node:assert/strict';

import { parseVoiceCommand } from '../src/voice-commands.js';

test('parseVoiceCommand recognizes flower effect commands', () => {
  assert.deepEqual(parseVoiceCommand('花'), {
    type: 'effect',
    effect: 'flower',
    label: '花'
  });
});

test('parseVoiceCommand ignores removed extra commands', () => {
  assert.equal(parseVoiceCommand('拍照'), null);
  assert.equal(parseVoiceCommand('截图'), null);
  assert.equal(parseVoiceCommand('清空特效'), null);
  assert.equal(parseVoiceCommand('隐藏字幕'), null);
  assert.equal(parseVoiceCommand('显示字幕'), null);
  assert.equal(parseVoiceCommand('放大画面'), null);
  assert.equal(parseVoiceCommand('恢复大小'), null);
  assert.equal(parseVoiceCommand('下雪'), null);
  assert.equal(parseVoiceCommand('爱心'), null);
});

test('parseVoiceCommand ignores unrelated speech', () => {
  assert.equal(parseVoiceCommand('今天天气不错'), null);
});
