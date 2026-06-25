import { normalize } from './utils.js';

const EFFECT_DEFS = [
  {
    phrases: ['花'],
    type: 'flower',
    className: 'voice-effect voice-effect--falling-flower',
    glyphs: ['🌸', '🌺', '🌻', '🌷', '🌼', '🌹', '💮', '🪷', '💐'],
    count: 100,
    columns: 50,
    fallBase: 3600,
    fallRange: 2400
  },
  {
    phrases: ['雪', '雪花'],
    type: 'snow',
    className: 'voice-effect voice-effect--falling-snow',
    glyphs: ['❄️', '❅', '❆', '•', '·'],
    count: 70,
    columns: 35,
    fallBase: 3800,
    fallRange: 2800
  },
  {
    phrases: ['心', '爱心', '喜欢'],
    type: 'heart',
    className: 'voice-effect voice-effect--falling-heart',
    glyphs: ['❤️', '💕', '💗', '💖', '♥'],
    count: 56,
    columns: 20,
    fallBase: 4000,
    fallRange: 2200
  }
];

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

// Deterministic pseudo-random for natural variation
function pseudoRand(seed, index) {
  const x = Math.sin(seed + index * 127.1 + index * index * 0.013) * 43758.5453;
  return x - Math.floor(x);
}

function setFallMotion(def, element, index) {
  const seed = def.type === 'flower' ? 7919 : (def.type === 'snow' ? 6271 : 4523);

  // ── Horizontal position with jitter ──
  const columnBase = index % def.columns;
  const jitter = (pseudoRand(seed, index) - 0.5) * 0.3;
  const columnJittered = Math.max(0, Math.min(def.columns - 1, columnBase + jitter));
  const x = (columnJittered / (def.columns - 1)) * 100;

  // ── Wave staggering ──
  const wave = Math.floor(index / def.columns);

  // ── Depth layer (0=background → 3=foreground) ──
  const depthLayer = index % 4;

  // ── Gentle horizontal drift (px) ──
  const driftDir = pseudoRand(seed + 1, index) < 0.5 ? -1 : 1;
  const driftMag = 10 + pseudoRand(seed + 10, index) * 35; // 10-45px
  const drift = (driftDir * driftMag).toFixed(1);

  // ── Mid-fall sway (px, alternating direction) ──
  const swayDir = index % 2 === 0 ? 1 : -1;
  const swayMag = 8 + pseudoRand(seed + 11, index) * 22; // 8-30px
  const sway = (swayDir * swayMag).toFixed(1);

  // ── Duration ──
  const duration = def.fallBase + ((index * 137) % def.fallRange);

  // ── Delay: staggered cascade ──
  const delay = (wave * 200) + ((columnBase % 12) * 30) + Math.floor(pseudoRand(seed + 2, index) * 50);

  // ── Scale: depth-aware ──
  const scale = depthLayer < 2
    ? (0.45 + pseudoRand(seed + 3, index) * 0.35).toFixed(2)   // back: 0.45-0.8
    : (0.7 + pseudoRand(seed + 4, index) * 0.55).toFixed(2);    // front: 0.7-1.25

  // ── Font size: true depth ──
  const fontSize = depthLayer < 2
    ? 16 + Math.floor(pseudoRand(seed + 5, index) * 14)   // back: 16-30px
    : 26 + Math.floor(pseudoRand(seed + 6, index) * 18);  // front: 26-44px

  // ── Spin ──
  const spinDir = index % 2 === 0 ? 1 : -1;
  const spin = spinDir * (120 + (index % 11) * 50);

  // ── Opacity: depth-aware ──
  const opacity = depthLayer < 2
    ? (0.3 + pseudoRand(seed + 7, index) * 0.3).toFixed(2)    // back: more transparent
    : (0.55 + pseudoRand(seed + 8, index) * 0.45).toFixed(2); // front: more opaque

  // ── Start Y (above viewport, vh units for viewport-relative positioning) ──
  const startY = (-15 - wave * 14 - pseudoRand(seed + 9, index) * 10).toFixed(1);

  // ── Set all CSS custom properties ──
  const s = element.style;
  s?.setProperty?.('--x', `${x.toFixed(2)}%`);
  s?.setProperty?.('--start-y', `${startY}vh`);
  s?.setProperty?.('--drift', `${drift}px`);
  s?.setProperty?.('--sway', `${sway}px`);
  s?.setProperty?.('--duration', `${duration}ms`);
  s?.setProperty?.('--delay', `${delay}ms`);
  s?.setProperty?.('--scale', scale);
  s?.setProperty?.('--spin', `${spin}deg`);
  s?.setProperty?.('--opacity', opacity);
  s?.setProperty?.('--font-size', `${fontSize}px`);
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
