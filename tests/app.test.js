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

function createForm() {
  const listeners = {};
  return {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    submit() {
      return listeners.submit?.({
        preventDefault() {}
      });
    }
  };
}

async function flushAsyncEffects() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
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

async function loadAppWithFakes({ getUserMedia, SpeechRecognition = FakeSpeechRecognition, FaceDetector }) {
  const video = {
    videoWidth: 1000,
    videoHeight: 500,
    clientWidth: 1000,
    clientHeight: 500,
    srcObject: null,
    async play() {}
  };
  const cameraShell = { dataset: {} };
  const status = { textContent: '', dataset: {} };
  const captionOutput = { textContent: '', dataset: {}, hidden: false };
  const captionStatus = { textContent: '', dataset: {} };
  const effectForm = createForm();
  const effectInput = { value: '' };
  const effectStatus = { textContent: '', dataset: {} };
  const voiceCommandText = { textContent: '', dataset: {} };
  const voiceCommandResult = { textContent: '', dataset: {} };
  const snapshotPreview = { hidden: true, src: '', alt: '' };
  const effectLayer = {
    children: [],
    dataset: {},
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    }
  };
  const startButton = createButton();
  const stopButton = createButton();
  const captionStartButton = createButton();
  const captionStopButton = createButton();
  const beforeUnloadListeners = [];

  const selectors = {
    '[data-camera-shell]': cameraShell,
    '[data-camera-preview]': video,
    '[data-camera-status]': status,
    '[data-camera-start]': startButton,
    '[data-camera-stop]': stopButton,
    '[data-live-caption]': captionOutput,
    '[data-caption-status]': captionStatus,
    '[data-caption-start]': captionStartButton,
    '[data-caption-stop]': captionStopButton,
    '[data-effect-form]': effectForm,
    '[data-effect-input]': effectInput,
    '[data-effect-status]': effectStatus,
    '[data-voice-command-text]': voiceCommandText,
    '[data-voice-command-result]': voiceCommandResult,
    '[data-snapshot-preview]': snapshotPreview,
    '[data-voice-effects]': effectLayer
  };

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;

  globalThis.document = {
    createElement(tagName) {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext(type) {
            return type === '2d'
              ? { drawImage() {} }
              : null;
          },
          toDataURL(type) {
            return `data:${type};base64,fake-snapshot`;
          }
        };
      }

      return {
        tagName,
        className: '',
        textContent: '',
        dataset: {},
        style: {
          setProperty() {}
        }
      };
    },
    querySelector(selector) {
      return selectors[selector];
    }
  };
  globalThis.window = {
    SpeechRecognition,
    webkitSpeechRecognition: SpeechRecognition,
    FaceDetector,
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
      cameraShell,
      status,
      startButton,
      stopButton,
      captionOutput,
      captionStatus,
      effectForm,
      effectInput,
      effectStatus,
      voiceCommandText,
      voiceCommandResult,
      snapshotPreview,
      effectLayer,
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

test('app triggers visual effects from recognized speech', async () => {
  FakeSpeechRecognition.instances = [];
  class FakeFaceDetector {
    async detect() {
      return [
        {
          boundingBox: { x: 200, y: 150, width: 200, height: 180 }
        }
      ];
    }
  }

  const stream = { getTracks: () => [] };

  const { captionStartButton, effectLayer } = await loadAppWithFakes({
    FaceDetector: FakeFaceDetector,
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '开花', isFinal: false });
  await flushAsyncEffects();

  assert.equal(effectLayer.dataset.effect, 'flower');
  assert.ok(effectLayer.children.length >= 20);
  assert.ok(effectLayer.children.some((child) => child.className === 'voice-effect voice-effect--flower'));
  assert.ok(effectLayer.children.some((child) => child.className === 'voice-effect voice-effect--petal'));
});

test('app triggers visual effects from typed commands', async () => {
  const stream = { getTracks: () => [] };

  const { effectForm, effectInput, effectStatus, effectLayer } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  effectInput.value = '让画面下雪';
  await effectForm.submit();

  assert.equal(effectLayer.dataset.effect, 'snow');
  assert.equal(effectLayer.children.length, 42);
  assert.equal(effectStatus.textContent, '已执行：下雪');
  assert.equal(effectStatus.dataset.state, 'ready');
});

test('app positions flower effects above a detected face from typed commands', async () => {
  class FakeFaceDetector {
    async detect() {
      return [
        {
          boundingBox: { x: 200, y: 150, width: 200, height: 180 }
        }
      ];
    }
  }

  const stream = { getTracks: () => [] };

  const { effectForm, effectInput, effectLayer } = await loadAppWithFakes({
    FaceDetector: FakeFaceDetector,
    async getUserMedia() {
      return stream;
    }
  });

  effectInput.value = '在我头上放一朵花';
  await effectForm.submit();

  assert.equal(effectLayer.dataset.effect, 'flower');
  assert.equal(effectLayer.style.values['--effect-x'], '70%');
  assert.equal(effectLayer.style.values['--effect-y'], '23%');
});

test('app executes caption voice commands for subtitles and camera size', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const {
    captionStartButton,
    captionOutput,
    cameraShell,
    voiceCommandText,
    voiceCommandResult
  } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '隐藏字幕', isFinal: true });
  await flushAsyncEffects();

  assert.equal(captionOutput.hidden, true);
  assert.equal(voiceCommandText.textContent, '隐藏字幕');
  assert.equal(voiceCommandResult.textContent, '字幕已隐藏');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '显示字幕', isFinal: true });
  await flushAsyncEffects();
  assert.equal(captionOutput.hidden, false);
  assert.equal(voiceCommandResult.textContent, '字幕已显示');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '放大摄像头', isFinal: true });
  await flushAsyncEffects();
  assert.equal(cameraShell.dataset.cameraSize, 'large');
  assert.equal(voiceCommandResult.textContent, '摄像头画面已放大');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '缩小摄像头', isFinal: true });
  await flushAsyncEffects();
  assert.equal(cameraShell.dataset.cameraSize, 'normal');
  assert.equal(voiceCommandResult.textContent, '摄像头画面已恢复');
});

test('app captures a snapshot from a voice command', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const {
    captionStartButton,
    snapshotPreview,
    voiceCommandText,
    voiceCommandResult
  } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '帮我拍照', isFinal: true });
  await flushAsyncEffects();

  assert.equal(snapshotPreview.hidden, false);
  assert.equal(snapshotPreview.src, 'data:image/png;base64,fake-snapshot');
  assert.equal(voiceCommandText.textContent, '拍照');
  assert.equal(voiceCommandResult.textContent, '已拍照');
});

test('app clears visual effects from a voice command', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const {
    captionStartButton,
    effectLayer,
    voiceCommandResult
  } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '下雪', isFinal: true });
  await flushAsyncEffects();
  assert.equal(effectLayer.dataset.effect, 'snow');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '清空特效', isFinal: true });
  await flushAsyncEffects();

  assert.equal(effectLayer.children.length, 0);
  assert.equal(effectLayer.dataset.effect, undefined);
  assert.equal(voiceCommandResult.textContent, '特效已清空');
});
