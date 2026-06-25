import { startCamera, stopCamera } from './camera.js';
import { createCaptionController } from './captions.js?v=replace-latest-2';
import { createVoiceEffectController } from './effects.js?v=flower-sea';
import { dispatchFingerWritingResult } from './finger-writing-events.js?v=finger-writing-result';
import { createIndexFingerTrailController } from './hands.js?v=handwriting-v7';
import { parseVoiceCommand } from './voice-commands.js?v=semantic-voice';

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
const handTrailCanvas = document.querySelector('[data-hand-trails]');
const handStatus = document.querySelector('[data-hand-status]');
const createElement = document.createElement.bind(document);

let currentStream = null;
let captionController = null;
let handTrailController = null;
const effectLabels = {
  flower: '花'
};
const voiceEffects = createVoiceEffectController({
  layer: effectLayer,
  createElement
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

function getEffectReadyText(effect) {
  return `已执行：${effectLabels[effect]}`;
}

function setCameraView(view) {
  cameraShell.dataset.cameraView = view;
}

function setCaptionVisibility(isVisible) {
  captionOutput.hidden = !isVisible;
}

async function triggerVisualEffect(prompt) {
  const effectType = voiceEffects.getEffectType(prompt);
  if (!effectType) return false;

  return voiceEffects.triggerFromTranscript(prompt);
}

async function executeVoiceCommand(command, transcript) {
  if (command.type === 'effect') {
    const effect = await triggerVisualEffect(transcript);
    if (!effect) {
      return { text: '没有识别到可执行指令', state: 'error' };
    }

    setEffectStatus(getEffectReadyText(effect), 'ready');
    return { text: `已执行：${command.label}`, state: 'ready' };
  }

  if (command.type === 'clear-effects') {
    voiceEffects.clear();
    setEffectStatus('特效已清除', 'ready');
    return { text: '已清除特效', state: 'ready' };
  }

  if (command.type === 'camera-view') {
    setCameraView(command.view);
    return {
      text: command.view === 'large' ? '画面已放大' : '画面已恢复',
      state: 'ready'
    };
  }

  if (command.type === 'caption-visibility') {
    setCaptionVisibility(command.visible);
    return {
      text: command.visible ? '字幕已显示' : '字幕已隐藏',
      state: 'ready'
    };
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

async function handleFingerWritingResult(event) {
  const writingResult = event?.detail || {};
  const text = String(writingResult.text || '').trim();
  const command = parseVoiceCommand(text);

  if (!command) {
    return;
  }

  setVoiceCommandStatus(command.label, '执行中...', 'loading');
  const result = await executeVoiceCommand(command, text);
  setVoiceCommandStatus(command.label, result.text, result.state);
}

function ensureHandTrailController() {
  if (!handTrailController) {
    handTrailController = createIndexFingerTrailController({
      video,
      canvas: handTrailCanvas,
      status: handStatus,
      onWritingResult: dispatchFingerWritingResult
    });
  }

  return handTrailController;
}

async function handleStart() {
  startButton.disabled = true;

  try {
    currentStream = await startCamera({
      mediaDevices: navigator.mediaDevices,
      video,
      status
    });
    ensureHandTrailController().start();
    setControls(true);
  } catch {
    currentStream = null;
    setControls(false);
  }
}

function handleStop() {
  stopCamera({ stream: currentStream, video, status });
  currentStream = null;
  handTrailController?.stop();
  setControls(false);
}

async function handleEffectSubmit(event) {
  event.preventDefault();

  const prompt = effectInput.value.trim();
  if (!prompt) {
    setEffectStatus('请输入花指令', 'error');
    return;
  }

  const command = parseVoiceCommand(prompt);
  if (!command) {
    setEffectStatus('没有识别到可执行指令', 'error');
    return;
  }

  const result = await executeVoiceCommand(command, prompt);
  setVoiceCommandStatus(command.label, result.text, result.state);
}

startButton.addEventListener('click', handleStart);
stopButton.addEventListener('click', handleStop);
effectForm.addEventListener('submit', handleEffectSubmit);
window.addEventListener('finger-writing-result', (event) => {
  void handleFingerWritingResult(event);
});
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
  handTrailController?.stop();
  voiceEffects.clear();
  captionController.stop();
});

setControls(false);
setCaptionControls(false);
handleStart();
