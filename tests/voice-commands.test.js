import test from 'node:test';
import assert from 'node:assert/strict';

import { parseVoiceCommand } from '../src/voice-commands.js';

test('parseVoiceCommand recognizes flower effect commands', () => {
  assert.deepEqual(parseVoiceCommand('花'), {
    type: 'effect',
    effect: 'flower',
    label: '花'
  });
  assert.deepEqual(parseVoiceCommand('来点花雨让画面浪漫一点'), {
    type: 'effect',
    effect: 'flower',
    label: '花海'
  });
});

test('parseVoiceCommand recognizes clear effect commands', () => {
  assert.deepEqual(parseVoiceCommand('不要特效了恢复正常'), {
    type: 'clear-effects',
    label: '清除特效'
  });
  assert.deepEqual(parseVoiceCommand('清空画面'), {
    type: 'clear-effects',
    label: '清除特效'
  });
});

test('parseVoiceCommand recognizes camera size commands', () => {
  assert.deepEqual(parseVoiceCommand('把摄像头画面放大一点'), {
    type: 'camera-view',
    view: 'large',
    label: '放大画面'
  });
  assert.deepEqual(parseVoiceCommand('恢复画面大小'), {
    type: 'camera-view',
    view: 'normal',
    label: '恢复大小'
  });
});

test('parseVoiceCommand recognizes caption visibility commands', () => {
  assert.deepEqual(parseVoiceCommand('隐藏字幕'), {
    type: 'caption-visibility',
    visible: false,
    label: '隐藏字幕'
  });
  assert.deepEqual(parseVoiceCommand('显示字幕'), {
    type: 'caption-visibility',
    visible: true,
    label: '显示字幕'
  });
});

test('parseVoiceCommand ignores unsupported extra commands', () => {
  assert.equal(parseVoiceCommand('拍照'), null);
  assert.equal(parseVoiceCommand('截图'), null);
  assert.equal(parseVoiceCommand('下雪'), null);
  assert.equal(parseVoiceCommand('爱心'), null);
});

test('parseVoiceCommand ignores unrelated speech', () => {
  assert.equal(parseVoiceCommand('今天天气不错'), null);
});
