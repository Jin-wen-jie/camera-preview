import { normalize } from './utils.js';

const FLOWER_TRIGGER = {
  phrases: ['花'],
  type: 'flower',
  className: 'voice-effect voice-effect--falling-flower'
};
const FLOWER_GLYPHS = ['🌸', '🌺', '✿', '❀', '❁'];
const FLOWER_SEA_COUNT = 108;
const FLOWER_SEA_COLUMNS = 36;

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

function setFlowerFallMotion(element, index) {
  const column = index % FLOWER_SEA_COLUMNS;
  const wave = Math.floor(index / FLOWER_SEA_COLUMNS);
  const x = (column / (FLOWER_SEA_COLUMNS - 1)) * 100;
  const drift = ((index % 9) - 4) * 4.25;
  const duration = 4400 + ((index * 137) % 2100);
  const delay = (wave * 360) + ((column % 12) * 52);
  const scale = 0.68 + ((index % 8) * 0.09);
  const spin = (index % 2 === 0 ? 1 : -1) * (280 + ((index % 7) * 58));

  element.style?.setProperty?.('--x', `${x.toFixed(2)}%`);
  element.style?.setProperty?.('--start-y', `${(-28 - (wave * 18)).toFixed(2)}%`);
  element.style?.setProperty?.('--drift', `${drift.toFixed(2)}vw`);
  element.style?.setProperty?.('--duration', `${duration}ms`);
  element.style?.setProperty?.('--delay', `${delay}ms`);
  element.style?.setProperty?.('--scale', scale.toFixed(2));
  element.style?.setProperty?.('--spin', `${spin}deg`);
}

export function createVoiceEffectController({
  layer,
  createElement = (tagName) => document.createElement(tagName),
  timers = globalThis,
  durationMs = 7200
}) {
  let clearTimer = null;

  function clear() {
    if (clearTimer) {
      timers.clearTimeout(clearTimer);
      clearTimer = null;
    }
    layer?.replaceChildren?.();
    if (layer?.dataset) {
      delete layer.dataset.effect;
    }
  }

  function scheduleClear() {
    clearTimer = timers.setTimeout(() => {
      clear();
    }, durationMs);
  }

  function appendImpact() {
    const element = createElement('span');
    element.className = 'voice-effect-impact';
    layer.append(element);
  }

  function appendFlowerSea() {
    for (let index = 0; index < FLOWER_SEA_COUNT; index += 1) {
      const element = createElement('span');
      element.className = FLOWER_TRIGGER.className;
      element.textContent = FLOWER_GLYPHS[index % FLOWER_GLYPHS.length];
      setStyleIndex(element, index);
      setFlowerFallMotion(element, index);
      layer.append(element);
    }
  }

  function findTrigger(text) {
    const normalizedText = normalize(text);
    return FLOWER_TRIGGER.phrases.some((phrase) => normalizedText.includes(phrase))
      ? FLOWER_TRIGGER
      : null;
  }

  function show() {
    clear();
    if (layer?.dataset) {
      layer.dataset.effect = FLOWER_TRIGGER.type;
    }

    appendImpact();
    appendFlowerSea();
    scheduleClear();
    return FLOWER_TRIGGER.type;
  }

  return {
    clear,
    getEffectType(text) {
      return findTrigger(text)?.type || false;
    },
    triggerFromTranscript(text) {
      return findTrigger(text) ? show() : false;
    }
  };
}
