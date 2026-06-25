import { createCaptionController } from './captions.js?v=voice-only';
import { createVoiceEffectController } from './effects.js?v=voice-only';
import { parseVoiceCommand } from './voice-commands.js?v=voice-only';

// ─── DOM elements ────────────────────────────────────────

const captionOverlay = document.querySelector('[data-live-caption]');

const captionStartButton = document.querySelector('[data-caption-start]');
const captionStopButton = document.querySelector('[data-caption-stop]');
const captionStatus = document.querySelector('[data-caption-status] strong');

const effectForm = document.querySelector('[data-effect-form]');
const effectInput = document.querySelector('[data-effect-input]');
const effectStatusRow = document.querySelector('[data-effect-status]');
const effectStatus = effectStatusRow?.querySelector('strong');

const voiceCommandText = document.querySelector('[data-voice-command-text]');
const voiceCommandResult = document.querySelector('[data-voice-command-result]');

const effectLayer = document.querySelector('[data-voice-effects]');

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

function triggerVisualEffect(prompt) {
  voiceEffects.triggerFromTranscript(prompt);
}

// ─── Command execution ───────────────────────────────────

async function executeVoiceCommand(command, _transcript) {
  if (command.type === 'effect') {
    triggerVisualEffect(command.key);
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
  output: captionOverlay,
  onTranscript: (_visibleTranscript, recentTranscript) => {
    void handleVoiceTranscript(recentTranscript);
  },
  onStatusChange({ isListening }) {
    setCaptionControls(isListening);
    if (captionStatus) {
      captionStatus.textContent = isListening ? '识别中' : '已停止';
      captionStatus.dataset.state = isListening ? 'active' : 'idle';
    }
    setEffectStatus(getEffectReadyText(), 'idle');
  }
});

captionStartButton.addEventListener('click', () => captions.start());
captionStopButton.addEventListener('click', () => captions.stop());

// ─── Typed command form ──────────────────────────────────

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

// ─── Initial state ───────────────────────────────────────

setEffectStatus(getEffectReadyText(), 'idle');
setVoiceCommandStatus('语音指令', '点击下方按钮开始识别', 'idle');
