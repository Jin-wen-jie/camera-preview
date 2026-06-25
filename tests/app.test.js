import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const preferredVideoConstraints = {
  width: { min: 1280, ideal: 1920 },
  height: { min: 720, ideal: 1080 },
  frameRate: { min: 30, ideal: 60 }
};

test('page and app cache-bust semantic voice modules together', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(html, /src="\.\/src\/app\.js\?v=semantic-voice"/);
  assert.match(source, /effects\.js\?v=flower-sea/);
  assert.match(source, /voice-commands\.js\?v=semantic-voice/);
});

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

function createCanvas() {
  return {
    width: 0,
    height: 0,
    getContext(type) {
      return type === '2d'
        ? {
          clearRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          set strokeStyle(value) {},
          set lineWidth(value) {},
          set lineCap(value) {},
          set lineJoin(value) {}
        }
        : null;
    }
  };
}

async function loadAppWithFakes({
  getUserMedia,
  SpeechRecognition = FakeSpeechRecognition,
  requestAnimationFrame = () => 0,
  cancelAnimationFrame = () => {}
}) {
  const video = {
    videoWidth: 1000,
    videoHeight: 500,
    clientWidth: 1000,
    clientHeight: 500,
    currentTime: 0,
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
  const handTrails = createCanvas();
  const handStatus = { textContent: '', dataset: {} };
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
  const windowListeners = {};
  const dispatchedEvents = [];

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
    '[data-voice-effects]': effectLayer,
    '[data-hand-trails]': handTrails,
    '[data-hand-status]': handStatus
  };

  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;

  globalThis.document = {
    createElement(tagName) {
      if (tagName === 'canvas') {
        return createCanvas();
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
    addEventListener(type, listener) {
      if (type === 'beforeunload') {
        beforeUnloadListeners.push(listener);
        return;
      }
      windowListeners[type] ??= [];
      windowListeners[type].push(listener);
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      for (const listener of windowListeners[event.type] || []) {
        listener(event);
      }
      return true;
    }
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame = cancelAnimationFrame;
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
      effectLayer,
      captionStartButton,
      captionStopButton,
      handTrails,
      handStatus,
      dispatchedEvents,
      windowListeners,
      beforeUnloadListeners
    };
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: previousNavigator
    });
  }
}

test('app automatically starts the camera and hand trail status when the page loads', async () => {
  const calls = [];
  const stream = { getTracks: () => [] };

  const { video, startButton, stopButton, status, handStatus } = await loadAppWithFakes({
    async getUserMedia(constraints) {
      calls.push(constraints);
      return stream;
    }
  });

  assert.deepEqual(calls, [{ video: preferredVideoConstraints, audio: false }]);
  assert.equal(video.srcObject, stream);
  assert.equal(startButton.disabled, true);
  assert.equal(stopButton.disabled, false);
  assert.equal(status.textContent, '摄像头已开启');
  assert.equal(handStatus.textContent, '伸出食指开始记录');
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

test('app triggers flower effects from recognized speech', async () => {
  FakeSpeechRecognition.instances = [];

  const stream = { getTracks: () => [] };

  const { captionStartButton, effectLayer } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '花', isFinal: false });
  await flushAsyncEffects();

  assert.equal(effectLayer.dataset.effect, 'flower');
  assert.ok(effectLayer.children.length >= 100);
  assert.ok(effectLayer.children.some((child) => child.className === 'voice-effect voice-effect--falling-flower'));
  assert.equal(effectLayer.children.some((child) => child.className === 'voice-effect voice-effect--petal'), false);
});

test('app clears visual effects from recognized speech meaning', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const { captionStartButton, effectLayer, voiceCommandText, voiceCommandResult } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '来点花雨', isFinal: false });
  await flushAsyncEffects();
  assert.equal(effectLayer.dataset.effect, 'flower');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '不要特效了恢复正常', isFinal: false });
  await flushAsyncEffects();

  assert.equal(effectLayer.dataset.effect, undefined);
  assert.equal(effectLayer.children.length, 0);
  assert.equal(voiceCommandText.textContent, '清除特效');
  assert.equal(voiceCommandResult.textContent, '已清除特效');
});

test('app changes the camera view size from recognized speech meaning', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const { captionStartButton, cameraShell, voiceCommandText, voiceCommandResult } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '把摄像头画面放大一点', isFinal: false });
  await flushAsyncEffects();

  assert.equal(cameraShell.dataset.cameraView, 'large');
  assert.equal(voiceCommandText.textContent, '放大画面');
  assert.equal(voiceCommandResult.textContent, '画面已放大');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '恢复画面大小', isFinal: false });
  await flushAsyncEffects();

  assert.equal(cameraShell.dataset.cameraView, 'normal');
  assert.equal(voiceCommandText.textContent, '恢复大小');
  assert.equal(voiceCommandResult.textContent, '画面已恢复');
});

test('app toggles caption visibility from recognized speech meaning', async () => {
  FakeSpeechRecognition.instances = [];
  const stream = { getTracks: () => [] };

  const { captionStartButton, captionOutput, voiceCommandText, voiceCommandResult } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  captionStartButton.click();
  FakeSpeechRecognition.instances[0].emitResult({ transcript: '隐藏字幕', isFinal: false });
  await flushAsyncEffects();

  assert.equal(captionOutput.hidden, true);
  assert.equal(voiceCommandText.textContent, '隐藏字幕');
  assert.equal(voiceCommandResult.textContent, '字幕已隐藏');

  FakeSpeechRecognition.instances[0].emitResult({ transcript: '显示字幕', isFinal: false });
  await flushAsyncEffects();

  assert.equal(captionOutput.hidden, false);
  assert.equal(voiceCommandText.textContent, '显示字幕');
  assert.equal(voiceCommandResult.textContent, '字幕已显示');
});

test('app triggers flower effects from typed commands', async () => {
  const stream = { getTracks: () => [] };

  const { effectForm, effectInput, effectStatus, effectLayer } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  effectInput.value = '花';
  await effectForm.submit();

  assert.equal(effectLayer.dataset.effect, 'flower');
  assert.ok(effectLayer.children.length >= 100);
  assert.match(effectStatus.textContent, /^已执行：花/);
  assert.equal(effectStatus.dataset.state, 'ready');
});

test('app rejects removed typed commands', async () => {
  const stream = { getTracks: () => [] };

  const { cameraShell, effectForm, effectInput, effectStatus, effectLayer } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  effectInput.value = '拍照';
  await effectForm.submit();
  await flushAsyncEffects();

  assert.equal(cameraShell.dataset.cameraSize, undefined);
  assert.equal(effectLayer.dataset.effect, undefined);
  assert.equal(effectLayer.children.length, 0);
  assert.equal(effectStatus.textContent, '没有识别到可执行指令');
  assert.equal(effectStatus.dataset.state, 'error');
});

test('app executes recognized finger writing commands from the window event', async () => {
  const stream = { getTracks: () => [] };

  const {
    effectLayer,
    voiceCommandText,
    voiceCommandResult,
    windowListeners
  } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  for (const listener of windowListeners['finger-writing-result'] || []) {
    listener({
      detail: {
        source: 'finger-writing',
        text: '花',
        strokes: [[{ x: 120, y: 80, timestamp: 1000 }]],
        createdAt: 1200
      }
    });
  }
  await flushAsyncEffects();

  assert.equal(effectLayer.dataset.effect, 'flower');
  assert.equal(voiceCommandText.textContent, '花');
  assert.match(voiceCommandResult.textContent, /^已执行：花/);
});

test('app reports unrecognized finger writing commands without triggering effects', async () => {
  const stream = { getTracks: () => [] };

  const {
    effectLayer,
    voiceCommandText,
    voiceCommandResult,
    windowListeners
  } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  for (const listener of windowListeners['finger-writing-result'] || []) {
    listener({
      detail: {
        source: 'finger-writing',
        text: '',
        strokes: [[{ x: 120, y: 80, timestamp: 1000 }]],
        createdAt: 1200
      }
    });
  }
  await flushAsyncEffects();

  assert.equal(effectLayer.dataset.effect, undefined);
  assert.equal(effectLayer.children.length, 0);
  assert.equal(voiceCommandText.textContent, '手写结果');
  assert.equal(voiceCommandResult.textContent, '没有识别到可执行指令');
  assert.equal(voiceCommandResult.dataset.state, 'error');
});

test('app stops hand trails when the camera stops', async () => {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const stream = { getTracks: () => tracks };

  const { stopButton, status, handStatus } = await loadAppWithFakes({
    async getUserMedia() {
      return stream;
    }
  });

  stopButton.click();

  assert.equal(tracks[0].stopped, true);
  assert.equal(status.textContent, '摄像头已停止');
  assert.equal(handStatus.textContent, '手势识别已停止');
});
