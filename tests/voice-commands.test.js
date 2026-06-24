import test from 'node:test';
import assert from 'node:assert/strict';

import { parseVoiceCommand } from '../src/voice-commands.js';

test('parseVoiceCommand recognizes page control commands', () => {
  assert.deepEqual(parseVoiceCommand('帮我拍照'), {
    type: 'snapshot',
    label: '拍照'
  });
  assert.deepEqual(parseVoiceCommand('清空特效'), {
    type: 'clear-effects',
    label: '清空特效'
  });
  assert.deepEqual(parseVoiceCommand('隐藏字幕'), {
    type: 'hide-captions',
    label: '隐藏字幕'
  });
  assert.deepEqual(parseVoiceCommand('显示字幕'), {
    type: 'show-captions',
    label: '显示字幕'
  });
});

test('parseVoiceCommand recognizes camera size commands', () => {
  assert.deepEqual(parseVoiceCommand('放大摄像头'), {
    type: 'camera-large',
    label: '放大摄像头'
  });
  assert.deepEqual(parseVoiceCommand('缩小摄像头'), {
    type: 'camera-normal',
    label: '缩小摄像头'
  });
});

test('parseVoiceCommand recognizes effect commands', () => {
  assert.deepEqual(parseVoiceCommand('在我头上开花'), {
    type: 'effect',
    effect: 'flower',
    label: '开花'
  });
  assert.deepEqual(parseVoiceCommand('让画面下雪'), {
    type: 'effect',
    effect: 'snow',
    label: '下雪'
  });
  assert.deepEqual(parseVoiceCommand('来个爱心'), {
    type: 'effect',
    effect: 'heart',
    label: '爱心'
  });
});

test('parseVoiceCommand ignores unrelated speech', () => {
  assert.equal(parseVoiceCommand('今天天气不错'), null);
});
