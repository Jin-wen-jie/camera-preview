import test from 'node:test';
import assert from 'node:assert/strict';

function createButton() {
  const listeners = {};
  return {
    disabled: false,
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    click() {
      return listeners.click?.();
    }
  };
}

class FakeSpeechRecognition {
  static instances = [];

  constructor() {
    this.started = false;
    FakeSpeechRecognition.instances.push(this);
  }

  start() {
    this.started = true;
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }
}

async function loadAppWithFakes({ getUserMedia, SpeechRecognition = FakeSpeechRecognition }) {
  const video = {
    srcObject: null,
    async play() {}
  };
  const status = { textContent: '', dataset: {} };
  const captionOutput = { textContent: '', dataset: {} };
  const captionStatus = { textContent: '', dataset: {} };
  const startButton = createButton();
  const stopButton = createButton();
  const captionStartButton = createButton();
  const captionStopButton = createButton();
  const beforeUnloadListeners = [];

  const selectors = {
    '[data-camera-preview]': video,
    '[data-camera-status]': status,
    '[data-camera-start]': startButton,
    '[data-camera-stop]': stopButton,
    '[data-live-caption]': captionOutput,
    '[data-caption-status]': captionStatus,
    '[data-caption-start]': captionStartButton,
    '[data-caption-stop]': captionStopButton
  };

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;

  globalThis.document = {
    querySelector(selector) {
      return selectors[selector];
    }
  };
  globalThis.window = {
    SpeechRecognition,
    webkitSpeechRecognition: SpeechRecognition,
    addEventListener(type, listener) {
      if (type === 'beforeunload') {
        beforeUnloadListeners.push(listener);
      }
    }
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia } }
  });

  try {
    await import(`../src/app.js?test=${Date.now()}-${Math.random()}`);
    await Promise.resolve();
    return {
      video,
      status,
      startButton,
      stopButton,
      captionOutput,
      captionStatus,
      captionStartButton,
      captionStopButton,
      beforeUnloadListeners
    };
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: previousNavigator
    });
  }
}

test('app automatically starts the camera when the page loads', async () => {
  const calls = [];
  const stream = { getTracks: () => [] };

  const { video, startButton, stopButton, status } = await loadAppWithFakes({
    async getUserMedia(constraints) {
      calls.push(constraints);
      return stream;
    }
  });

  assert.deepEqual(calls, [{ video: true, audio: false }]);
  assert.equal(video.srcObject, stream);
  assert.equal(startButton.disabled, true);
  assert.equal(stopButton.disabled, false);
  assert.equal(status.textContent, '摄像头已开启');
});

test('app keeps the start button available when automatic startup fails', async () => {
  const { video, startButton, stopButton, status } = await loadAppWithFakes({
    async getUserMedia() {
      throw Object.assign(new Error('permission denied'), { name: 'NotAllowedError' });
    }
  });

  assert.equal(video.srcObject, null);
  assert.equal(startButton.disabled, false);
  assert.equal(stopButton.disabled, true);
  assert.equal(status.dataset.state, 'error');
});

test('app starts live captions from the caption button', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const { captionStartButton, captionStopButton, captionStatus } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();

  assert.equal(FakeSpeechRecognition.instances.length, 1);
  assert.equal(FakeSpeechRecognition.instances[0].started, true);
  assert.equal(captionStartButton.disabled, true);
  assert.equal(captionStopButton.disabled, false);
  assert.equal(captionStatus.textContent, '正在听你说话');
});
