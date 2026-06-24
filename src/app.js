import { startCamera, stopCamera } from './camera.js';
import { createCaptionController } from './captions.js';
import { createVoiceEffectController } from './effects.js?v=head-anchor';
import { createFaceAnchorDetector } from './face.js?v=head-anchor';

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

let currentStream = null;
let captionController = null;
const effectLabels = {
  flower: '开花',
  snow: '下雪',
  heart: '爱心'
};
const voiceEffects = createVoiceEffectController({
  layer: effectLayer,
  createElement: document.createElement.bind(document)
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

async function getEffectOrigin(effectType) {
  return effectType === 'flower'
    ? faceAnchorDetector.detect()
    : undefined;
}

async function triggerVisualEffect(prompt) {
  const effectType = voiceEffects.getEffectType(prompt);
  if (!effectType) return false;

  const origin = await getEffectOrigin(effectType);
  return voiceEffects.triggerFromTranscript(prompt, { origin });
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

  setEffectStatus(`已执行：${effectLabels[effect]}`, 'ready');
}

startButton.addEventListener('click', handleStart);
stopButton.addEventListener('click', handleStop);
effectForm.addEventListener('submit', handleEffectSubmit);
captionController = createCaptionController({
  SpeechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
  output: captionOutput,
  status: captionStatus,
  onTranscript: (_visibleTranscript, recentTranscript) => {
    void triggerVisualEffect(recentTranscript);
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
