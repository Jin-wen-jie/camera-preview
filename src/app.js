import { startCamera, stopCamera } from './camera.js';
import { createCaptionController } from './captions.js?v=replace-latest-2';
import { createVoiceEffectController } from './effects.js?v=head-anchor';
import { createFaceAnchorDetector } from './face.js?v=robust-face';
import { parseVoiceCommand } from './voice-commands.js?v=voice-command-mode';

const cameraShell = document.querySelector('[data-camera-shell]');
const video = document.querySelector('[data-camera-preview]');
const status = document.querySelector('[data-camera-status]');
const startButton = document.querySelector('[data-camera-start]');
const stopButton = document.querySelector('[data-camera-stop]');
const captionOutput = document.querySelector('[data-live-caption]');
const captionStatus = document.querySelector('[data-caption-status]');
const captionStartButton = document.querySelector('[data-caption-start]');
const captionStopButton = document.querySelector('[data-caption-stop]');
const effectForm = document.querySelector('[data-effect-form]');
const effectInput = document.querySelector('[data-effect-input]');
const effectStatus = document.querySelector('[data-effect-status]');
const effectLayer = document.querySelector('[data-voice-effects]');
const voiceCommandText = document.querySelector('[data-voice-command-text]');
const voiceCommandResult = document.querySelector('[data-voice-command-result]');
const snapshotPreview = document.querySelector('[data-snapshot-preview]');
const createElement = document.createElement.bind(document);

let currentStream = null;
let captionController = null;
const effectLabels = {
  flower: '开花',
  snow: '下雪',
  heart: '爱心'
};
const voiceEffects = createVoiceEffectController({
  layer: effectLayer,
  createElement
});
const faceAnchorDetector = createFaceAnchorDetector({
  FaceDetector: window.FaceDetector,
  video
});

function setControls(isRunning) {
  startButton.disabled = isRunning;
  stopButton.disabled = !isRunning;
}

function setCaptionControls(isRunning) {
  const isSupported = captionController?.isSupported !== false;
  captionStartButton.disabled = !isSupported || isRunning;
  captionStopButton.disabled = !isSupported || !isRunning;
}

function setEffectStatus(text, state) {
  effectStatus.textContent = text;
  effectStatus.dataset.state = state;
}

function setVoiceCommandStatus(label, result, state = 'ready') {
  if (voiceCommandText) {
    voiceCommandText.textContent = label;
  }

  if (voiceCommandResult) {
    voiceCommandResult.textContent = result;
    voiceCommandResult.dataset.state = state;
  }
}

async function getEffectOrigin(effectType) {
  if (effectType !== 'flower') {
    return undefined;
  }

  setEffectStatus('正在定位人脸...', 'loading');
  return faceAnchorDetector.detect();
}

function getEffectReadyText(effect) {
  const faceStatus = effect === 'flower'
    ? faceAnchorDetector.getStatus()
    : null;
  const statusText = faceStatus?.message
    ? `（${faceStatus.message}）`
    : '';

  return `已执行：${effectLabels[effect]}${statusText}`;
}

async function triggerVisualEffect(prompt) {
  const effectType = voiceEffects.getEffectType(prompt);
  if (!effectType) return false;

  const origin = await getEffectOrigin(effectType);
  return voiceEffects.triggerFromTranscript(prompt, { origin });
}

function captureSnapshot() {
  const width = video.videoWidth || video.clientWidth || 1280;
  const height = video.videoHeight || video.clientHeight || 720;
  const canvas = createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext?.('2d');
  if (!context) return false;

  context.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/png');

  if (snapshotPreview) {
    snapshotPreview.src = dataUrl;
    snapshotPreview.hidden = false;
  }

  return true;
}

async function executeVoiceCommand(command, transcript) {
  if (command.type === 'effect') {
    const effect = await triggerVisualEffect(transcript);
    if (!effect) {
      return { text: '没有识别到可执行特效', state: 'error' };
    }

    setEffectStatus(getEffectReadyText(effect), 'ready');
    return { text: `已执行：${command.label}`, state: 'ready' };
  }

  if (command.type === 'clear-effects') {
    voiceEffects.clear();
    return { text: '特效已清空', state: 'ready' };
  }

  if (command.type === 'hide-captions') {
    captionOutput.hidden = true;
    return { text: '字幕已隐藏', state: 'ready' };
  }

  if (command.type === 'show-captions') {
    captionOutput.hidden = false;
    return { text: '字幕已显示', state: 'ready' };
  }

  if (command.type === 'camera-large') {
    if (cameraShell?.dataset) {
      cameraShell.dataset.cameraSize = 'large';
    }
    return { text: '摄像头画面已放大', state: 'ready' };
  }

  if (command.type === 'camera-normal') {
    if (cameraShell?.dataset) {
      cameraShell.dataset.cameraSize = 'normal';
    }
    return { text: '摄像头画面已恢复', state: 'ready' };
  }

  if (command.type === 'snapshot') {
    const didCapture = captureSnapshot();
    return didCapture
      ? { text: '已拍照', state: 'ready' }
      : { text: '当前浏览器无法拍照', state: 'error' };
  }

  return { text: '没有识别到可执行指令', state: 'error' };
}

async function handleVoiceTranscript(transcript) {
  const command = parseVoiceCommand(transcript);
  if (!command) {
    await triggerVisualEffect(transcript);
    return;
  }

  setVoiceCommandStatus(command.label, '执行中...', 'loading');
  const result = await executeVoiceCommand(command, transcript);
  setVoiceCommandStatus(command.label, result.text, result.state);
}

async function handleStart() {
  startButton.disabled = true;

  try {
    currentStream = await startCamera({
      mediaDevices: navigator.mediaDevices,
      video,
      status
    });
    setControls(true);
  } catch {
    currentStream = null;
    setControls(false);
  }
}

function handleStop() {
  stopCamera({ stream: currentStream, video, status });
  currentStream = null;
  setControls(false);
}

async function handleEffectSubmit(event) {
  event.preventDefault();

  const prompt = effectInput.value.trim();
  if (!prompt) {
    setEffectStatus('请输入文字指令', 'error');
    return;
  }

  const effect = await triggerVisualEffect(prompt);
  if (!effect) {
    setEffectStatus('没有识别到可执行指令', 'error');
    return;
  }

  setEffectStatus(getEffectReadyText(effect), 'ready');
}

startButton.addEventListener('click', handleStart);
stopButton.addEventListener('click', handleStop);
effectForm.addEventListener('submit', handleEffectSubmit);
captionController = createCaptionController({
  SpeechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
  output: captionOutput,
  status: captionStatus,
  onTranscript: (_visibleTranscript, recentTranscript) => {
    void handleVoiceTranscript(recentTranscript);
  },
  onStateChange: setCaptionControls
});
captionStartButton.addEventListener('click', () => {
  voiceEffects.clear();
  captionController.start();
});
captionStopButton.addEventListener('click', () => {
  captionController.stop();
});
window.addEventListener('beforeunload', () => {
  if (currentStream) {
    stopCamera({ stream: currentStream, video, status: null });
  }
  voiceEffects.clear();
  captionController.stop();
});

setControls(false);
setCaptionControls(false);
handleStart();
