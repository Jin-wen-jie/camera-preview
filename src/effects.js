import { normalize } from './utils.js';

const EFFECT_DEFS = [
  {
    phrases: ['花'],
    type: 'flower',
    className: 'voice-effect voice-effect--falling-flower',
    glyphs: ['🌸', '🌺', '🌻', '🌷', '💐', '🌼', '🏵️', '🌹', '💮'],
    count: 150,
    columns: 50,
    fallBase: 3600,
    fallRange: 2400
  },
  {
    phrases: ['雪', '雪花'],
    type: 'snow',
    className: 'voice-effect voice-effect--falling-snow',
    glyphs: ['❄️', '❅', '❆', '•', '·'],
    count: 80,
    columns: 40,
    fallBase: 3800,
    fallRange: 2800
  },
  {
    phrases: ['心', '爱心', '喜欢'],
    type: 'heart',
    className: 'voice-effect voice-effect--falling-heart',
    glyphs: ['❤️', '💕', '💗', '💖', '♥'],
    count: 72,
    columns: 24,
    fallBase: 4000,
    fallRange: 2200
  }
];

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

function setFallMotion(def, element, index) {
  const column = index % def.columns;
  const wave = Math.floor(index / def.columns);
  const x = (column / (def.columns - 1)) * 100;
  const drift = ((index % 9) - 4) * 5.5;
  const duration = def.fallBase + ((index * 137) % def.fallRange);
  const delay = (wave * 280) + ((column % 12) * 45);
  const scale = 0.5 + ((index % 12) * 0.09);
  const spin = (index % 2 === 0 ? 1 : -1) * (200 + ((index % 7) * 70));
  const opacity = 0.6 + ((index % 10) * 0.04);

  element.style?.setProperty?.('--x', `${x.toFixed(2)}%`);
  element.style?.setProperty?.('--start-y', `${(-24 - (wave * 14)).toFixed(2)}%`);
  element.style?.setProperty?.('--drift', `${drift.toFixed(2)}vw`);
  element.style?.setProperty?.('--duration', `${duration}ms`);
  element.style?.setProperty?.('--delay', `${delay}ms`);
  element.style?.setProperty?.('--scale', scale.toFixed(2));
  element.style?.setProperty?.('--spin', `${spin}deg`);
  element.style?.setProperty?.('--opacity', opacity.toFixed(2));
}

export function createVoiceEffectController({
  layer,
  createElement = (tagName) => document.createElement(tagName),
  timers = globalThis,
  durationMs = 7200
}) {
  let clearTimer = null;
  let currentDef = null;

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

  function appendEffect(def) {
    for (let index = 0; index < def.count; index += 1) {
      const element = createElement('span');
      element.className = def.className;
      element.textContent = def.glyphs[index % def.glyphs.length];
      setStyleIndex(element, index);
      setFallMotion(def, element, index);
      layer.append(element);
    }
  }

  function findTrigger(text) {
    const normalizedText = normalize(text);
    for (const def of EFFECT_DEFS) {
      if (def.phrases.some((phrase) => normalizedText.includes(phrase))) {
        return def;
      }
    }
    return null;
  }

  function show(def) {
    clear();
    currentDef = def;
    if (layer?.dataset) {
      layer.dataset.effect = def.type;
    }

    appendImpact();
    appendEffect(def);
    scheduleClear();
    return def.type;
  }

  return {
    clear,
    getEffectType(text) {
      return findTrigger(text)?.type || false;
    },
    triggerFromTranscript(text) {
      const def = findTrigger(text);
      return def ? show(def) : false;
    },
    triggerByKey(key) {
      const def = EFFECT_DEFS.find((d) => d.type === key);
      return def ? show(def) : false;
    }
  };
}
