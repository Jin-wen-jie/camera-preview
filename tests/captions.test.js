import test from 'node:test';
import assert from 'node:assert/strict';

import { createCaptionController } from '../src/captions.js';

class FakeSpeechRecognition {
  static instances = [];

  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = '';
    this.started = false;
    this.stopped = false;
    FakeSpeechRecognition.instances.push(this);
  }

  start() {
    this.started = true;
    this.onstart?.();
  }

  stop() {
    this.stopped = true;
    this.onend?.();
  }

  emitResult({ transcript, isFinal = false }) {
    this.onresult?.({
      resultIndex: 0,
      results: [
        {
          0: { transcript },
          isFinal
        }
      ]
    });
  }
}

test('caption controller starts speech recognition and shows live words', () => {
  FakeSpeechRecognition.instances = [];
  const output = { textContent: '', dataset: {} };
  const status = { textContent: '', dataset: {} };
  const states = [];

  const captions = createCaptionController({
    SpeechRecognition: FakeSpeechRecognition,
    output,
    status,
    onStateChange: (isRunning) => states.push(isRunning)
  });

  captions.start();
  const recognition = FakeSpeechRecognition.instances[0];
  recognition.emitResult({ transcript: '你好，实时字幕', isFinal: false });

  assert.equal(recognition.started, true);
  assert.equal(recognition.continuous, true);
  assert.equal(recognition.interimResults, true);
  assert.equal(recognition.lang, 'zh-CN');
  assert.equal(output.textContent, '你好，实时字幕');
  assert.equal(output.dataset.state, 'active');
  assert.equal(status.textContent, '正在听你说话');
  assert.deepEqual(states, [true]);
});

test('caption controller reports unsupported browsers clearly', () => {
  const output = { textContent: '', dataset: {} };
  const status = { textContent: '', dataset: {} };

  const captions = createCaptionController({
    SpeechRecognition: undefined,
    output,
    status
  });

  assert.equal(captions.isSupported, false);
  assert.equal(captions.start(), false);
  assert.equal(output.textContent, '当前浏览器不支持实时字幕');
  assert.equal(status.dataset.state, 'error');
});
