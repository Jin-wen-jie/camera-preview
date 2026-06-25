import { createCaptionController } from './captions.js?v=2';
import { createVoiceEffectController } from './effects.js?v=2';
import { parseVoiceCommand } from './voice-commands.js?v=2';
import { startCamera, stopCamera } from './camera.js?v=2';

// ─── DOM elements ────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const captionOverlay = $('[data-live-caption]');

const captionStartButton = $('[data-caption-start]');
const captionStopButton = $('[data-caption-stop]');
const captionStatus = $('[data-caption-status] strong');

const effectForm = $('[data-effect-form]');
const effectInput = $('[data-effect-input]');
const effectStatusRow = $('[data-effect-status]');
const effectStatus = effectStatusRow?.querySelector('strong');

const voiceCommandText = $('[data-voice-command-text]');
const voiceCommandResult = $('[data-voice-command-result]');

const effectLayer = $('[data-voice-effects]');

const video = $('[data-camera-preview]');
const cameraStatus = $('[data-camera-status] strong');
const mirrorToggle = $('[data-mirror-toggle]');

let _cameraStream = null;

// ─── Status helpers ──────────────────────────────────────

function setCaptionControls(isRunning) {
  captionStartButton.disabled = isRunning;
  captionStopButton.disabled = !isRunning;
}

const EFFECT_LABELS = {
  flower: '花雨',
  snow: '飘雪',
  heart: '爱心',
  clear: '清除'
};

function getEffectReadyText() {
  return '输入指令触发特效';
}

function setEffectStatus(text, state = 'idle') {
  if (!effectStatus) return;
  effectStatus.textContent = text;
  effectStatus.dataset.state = state;
}

function setVoiceCommandStatus(label, text, state) {
  if (voiceCommandText) voiceCommandText.textContent = label || '语音指令';
  if (voiceCommandResult) {
    voiceCommandResult.textContent = text;
    voiceCommandResult.dataset.state = state;
  }
}

// ─── Voice effects ───────────────────────────────────────

const voiceEffects = createVoiceEffectController({ layer: effectLayer });

// ─── Command execution ───────────────────────────────────

async function executeVoiceCommand(command, _transcript) {
  if (command.type === 'effect') {
    voiceEffects.triggerByKey(command.key);
    const label = EFFECT_LABELS[command.key] || command.label;
    return { text: `已执行：${label}`, state: 'success' };
  }

  if (command.type === 'clear-effects') {
    voiceEffects.clear();
    return { text: '特效已清除', state: 'success' };
  }

  return { text: '未知指令', state: 'error' };
}

async function handleVoiceTranscript(transcript) {
  if (!transcript) return;
  const command = parseVoiceCommand(transcript);
  if (!command) return;

  setVoiceCommandStatus(command.label, '执行中…', 'loading');
  const result = await executeVoiceCommand(command, transcript);
  setVoiceCommandStatus(command.label, result.text, result.state);
}

// ─── Live captions ───────────────────────────────────────

const captions = createCaptionController({
  SpeechRecognition: globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
  output: captionOverlay,
  status: captionStatus,
  onTranscript: (_visibleTranscript, recentTranscript) => {
    void handleVoiceTranscript(recentTranscript);
  },
  onStateChange(isListening) {
    setCaptionControls(isListening);
    if (captionStatus) {
      captionStatus.textContent = isListening ? '识别中' : '已停止';
      captionStatus.dataset.state = isListening ? 'active' : 'idle';
    }
    setEffectStatus(getEffectReadyText(), 'idle');
  }
});

if (captionStartButton) captionStartButton.addEventListener('click', () => captions.start());
if (captionStopButton) captionStopButton.addEventListener('click', () => captions.stop());

// ─── Typed command form ──────────────────────────────────

if (effectForm) {
  effectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = effectInput.value.trim();
    if (!text) return;

    const command = parseVoiceCommand(text);
    if (!command) {
      setEffectStatus('未识别的指令', 'error');
      return;
    }

    setEffectStatus('执行中…', 'loading');
    const result = await executeVoiceCommand(command, text);
    setEffectStatus(result.text, result.state);
    effectInput.value = '';
  });
}

// ─── Initial state ───────────────────────────────────────

setEffectStatus(getEffectReadyText(), 'idle');
setVoiceCommandStatus('语音指令', '点击下方按钮开始识别', 'idle');

// ─── Start camera ────────────────────────────────────────

startCamera({
  mediaDevices: navigator.mediaDevices,
  video,
  status: cameraStatus
}).then((stream) => {
  _cameraStream = stream;
}).catch((err) => {
  console.warn('摄像头启动失败:', err.message);
  if (cameraStatus) {
    cameraStatus.textContent = '摄像头不可用';
    cameraStatus.dataset.state = 'error';
  }
});

// ─── Keyboard shortcuts ──────────────────────────────────

const KEYBOARD_SHORTCUTS = {
  'f': { key: 'flower' },
  's': { key: 'snow' },
  'h': { key: 'heart' },
  'Escape': { key: 'clear' }
};

const SHORTCUT_HINT = document.querySelector('[data-shortcut-hint]');

document.addEventListener('keydown', (event) => {
  // Ignore when user is typing in input
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

  const shortcut = KEYBOARD_SHORTCUTS[event.key];
  if (!shortcut) return;

  event.preventDefault();

  if (shortcut.key === 'clear') {
    voiceEffects.clear();
    setEffectStatus('特效已清除', 'success');
    setVoiceCommandStatus('键盘快捷键', '已清除', 'success');
  } else {
    voiceEffects.triggerByKey(shortcut.key);
    const label = EFFECT_LABELS[shortcut.key] || shortcut.key;
    setEffectStatus(`已执行：${label}`, 'success');
    setVoiceCommandStatus(`键盘 [${event.key.toUpperCase()}]`, label, 'success');
  }
});

// ─── Mirror toggle ────────────────────────────────────────

if (mirrorToggle && video) {
  mirrorToggle.addEventListener('click', () => {
    const isMirrored = video.dataset.mirrored === 'true';
    if (isMirrored) {
      delete video.dataset.mirrored;
      delete mirrorToggle.dataset.active;
    } else {
      video.dataset.mirrored = 'true';
      mirrorToggle.dataset.active = '';
    }
  });
}

// ─── Cleanup on unload ────────────────────────────────────

window.addEventListener('pagehide', () => {
  stopCamera({ stream: _cameraStream, video, status: cameraStatus });
});
window.addEventListener('beforeunload', () => {
  stopCamera({ stream: _cameraStream, video, status: cameraStatus });
});
