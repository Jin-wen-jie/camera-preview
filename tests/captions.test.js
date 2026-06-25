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

  emitResults({ resultIndex = 0, results }) {
    this.onresult?.({
      resultIndex,
      results: results.map(({ transcript, isFinal = false }) => ({
        0: { transcript },
        isFinal
      }))
    });
  }

  emitEnd() {
    this.onend?.();
  }
}

test('caption controller starts speech recognition and shows live words', () => {
  FakeSpeechRecognition.instances = [];
  const output = { textContent: '', dataset: {} };
  const status = { textContent: '', dataset: {} };
  const states = [];
  const transcripts = [];

  const captions = createCaptionController({
    SpeechRecognition: FakeSpeechRecognition,
    output,
    status,
    onStateChange: (isRunning) => states.push(isRunning),
    onTranscript: (visibleTranscript, recentTranscript) => {
      transcripts.push({ visibleTranscript, recentTranscript });
    }
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
  assert.deepEqual(transcripts, [
    {
      visibleTranscript: '你好，实时字幕',
      recentTranscript: '你好，实时字幕'
    }
  ]);
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

test('caption controller restarts recognition when the browser ends listening automatically', async () => {
  FakeSpeechRecognition.instances = [];
  const output = { textContent: '', dataset: {} };
  const status = { textContent: '', dataset: {} };

  const captions = createCaptionController({
    SpeechRecognition: FakeSpeechRecognition,
    output,
    status
  });

  captions.start();
  const firstRecognition = FakeSpeechRecognition.instances[0];
  firstRecognition.emitResult({ transcript: '第一句', isFinal: true });
  firstRecognition.emitEnd();

  // Reconnection uses setTimeout with 1s backoff — wait for it
  await new Promise((resolve) => setTimeout(resolve, 1100));

  assert.equal(FakeSpeechRecognition.instances.length, 2);
  const secondRecognition = FakeSpeechRecognition.instances[1];
  assert.equal(secondRecognition.started, true);

  secondRecognition.emitResult({ transcript: '第二句', isFinal: true });

  assert.equal(output.textContent, '第二句');
  assert.equal(status.textContent, '正在听你说话');
  assert.equal(captions.isRunning, true);
});

test('caption controller replaces the visible caption with the latest sentence', () => {
  FakeSpeechRecognition.instances = [];
  const output = { textContent: '', dataset: {} };
  const status = { textContent: '', dataset: {} };
  const transcripts = [];

  const captions = createCaptionController({
    SpeechRecognition: FakeSpeechRecognition,
    output,
    status,
    onTranscript: (visibleTranscript, recentTranscript) => {
      transcripts.push({ visibleTranscript, recentTranscript });
    }
  });

  captions.start();
  const recognition = FakeSpeechRecognition.instances[0];

  recognition.emitResult({ transcript: '第一句', isFinal: true });
  assert.equal(output.textContent, '第一句');

  recognition.emitResult({ transcript: '第二句', isFinal: true });
  assert.equal(output.textContent, '第二句');
  assert.deepEqual(transcripts, [
    { visibleTranscript: '第一句', recentTranscript: '第一句' },
    { visibleTranscript: '第二句', recentTranscript: '第二句' }
  ]);
});

test('caption controller ignores old final results when replacing captions', () => {
  FakeSpeechRecognition.instances = [];
  const output = { textContent: '', dataset: {} };
  const status = { textContent: '', dataset: {} };
  const transcripts = [];

  const captions = createCaptionController({
    SpeechRecognition: FakeSpeechRecognition,
    output,
    status,
    onTranscript: (visibleTranscript, recentTranscript) => {
      transcripts.push({ visibleTranscript, recentTranscript });
    }
  });

  captions.start();
  const recognition = FakeSpeechRecognition.instances[0];

  recognition.emitResult({ transcript: 'old-one', isFinal: true });
  recognition.emitResults({
    resultIndex: 0,
    results: [
      { transcript: 'old-one', isFinal: true },
      { transcript: 'new-two', isFinal: true }
    ]
  });

  assert.equal(output.textContent, 'new-two');
  assert.deepEqual(transcripts.at(-1), {
    visibleTranscript: 'new-two',
    recentTranscript: 'new-two'
  });
});
