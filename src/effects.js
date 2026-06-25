import { findEffectByKey } from './commands.js';

const BATCH_SIZE = 30;
const BATCH_INTERVAL_MS = 50;
const IMPACT_CLASS = 'voice-effect-impact';

// Deterministic pseudo-random for natural variation
function pseudoRand(seed, index) {
  const x = Math.sin(seed + index * 127.1 + index * index * 0.013) * 43758.5453;
  return x - Math.floor(x);
}

function setFallMotion(cmd, element, index) {
  const seed = cmd.key === 'flower' ? 7919 : (cmd.key === 'snow' ? 6271 : 4523);

  // ── Horizontal position with jitter ──
  const columnBase = index % cmd.columns;
  const jitter = (pseudoRand(seed, index) - 0.5) * 0.3;
  const columnJittered = Math.max(0, Math.min(cmd.columns - 1, columnBase + jitter));
  const x = (columnJittered / (cmd.columns - 1)) * 100;

  // ── Wave staggering ──
  const wave = Math.floor(index / cmd.columns);

  // ── Depth layer (0=background → 3=foreground) ──
  const depthLayer = index % 4;

  // ── Gentle horizontal drift (px) ──
  const driftDir = pseudoRand(seed + 1, index) < 0.5 ? -1 : 1;
  const driftMag = 10 + pseudoRand(seed + 10, index) * 35;
  const drift = (driftDir * driftMag).toFixed(1);

  // ── Mid-fall sway (px) ──
  const swayDir = index % 2 === 0 ? 1 : -1;
  const swayMag = 8 + pseudoRand(seed + 11, index) * 22;
  const sway = (swayDir * swayMag).toFixed(1);

  // ── Duration ──
  const duration = cmd.fallBase + ((index * 137) % cmd.fallRange);

  // ── Delay: staggered cascade ──
  const delay = (wave * 200) + ((columnBase % 12) * 30) + Math.floor(pseudoRand(seed + 2, index) * 50);

  // ── Scale: depth-aware ──
  const scale = depthLayer < 2
    ? (0.45 + pseudoRand(seed + 3, index) * 0.35).toFixed(2)
    : (0.7 + pseudoRand(seed + 4, index) * 0.55).toFixed(2);

  // ── Font size: true depth ──
  const fontSize = depthLayer < 2
    ? 16 + Math.floor(pseudoRand(seed + 5, index) * 14)
    : 26 + Math.floor(pseudoRand(seed + 6, index) * 18);

  // ── Spin ──
  const spinDir = index % 2 === 0 ? 1 : -1;
  const spin = spinDir * (120 + (index % 11) * 50);

  // ── Opacity: depth-aware ──
  const opacity = depthLayer < 2
    ? (0.3 + pseudoRand(seed + 7, index) * 0.3).toFixed(2)
    : (0.55 + pseudoRand(seed + 8, index) * 0.45).toFixed(2);

  // ── Start Y (above viewport, vh units) ──
  const startY = (-15 - wave * 14 - pseudoRand(seed + 9, index) * 10).toFixed(1);

  // ── Set all CSS custom properties ──
  const s = element.style;
  s.setProperty('--x', `${x.toFixed(2)}%`);
  s.setProperty('--start-y', `${startY}vh`);
  s.setProperty('--drift', `${drift}px`);
  s.setProperty('--sway', `${sway}px`);
  s.setProperty('--duration', `${duration}ms`);
  s.setProperty('--delay', `${delay}ms`);
  s.setProperty('--scale', scale);
  s.setProperty('--spin', `${spin}deg`);
  s.setProperty('--opacity', opacity);
  s.setProperty('--font-size', `${fontSize}px`);
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

  function staggerRemove(children) {
    if (children.length === 0) {
      if (layer?.dataset) delete layer.dataset.effect;
      return;
    }

    let idx = 0;
    function removeBatch() {
      const end = Math.min(idx + BATCH_SIZE, children.length);
      for (let i = idx; i < end; i++) {
        children[i]?.remove?.();
      }
      idx = end;
      if (idx < children.length) {
        timers.setTimeout(removeBatch, BATCH_INTERVAL_MS);
      } else if (layer?.dataset && !clearTimer) {
        // Only clear dataset if a new effect hasn't started (clearTimer would be set)
        delete layer.dataset.effect;
      }
    }
    removeBatch();
  }

  function scheduleClear() {
    clearTimer = timers.setTimeout(() => {
      clearTimer = null;
      // Staggered removal to avoid GC spike from removing 100+ DOM nodes at once
      const children = [...layer.children];
      // Keep the impact element for a brief moment, remove particles gradually
      staggerRemove(children);
    }, durationMs);
  }

  function appendImpact() {
    const element = createElement('span');
    element.className = IMPACT_CLASS;
    layer.append(element);
  }

  function appendEffect(cmd) {
    for (let index = 0; index < cmd.count; index += 1) {
      const element = createElement('span');
      element.className = cmd.className;
      element.textContent = cmd.glyphs[index % cmd.glyphs.length];
      setFallMotion(cmd, element, index);
      layer.append(element);
    }
  }

  function show(cmd) {
    clear();
    if (layer?.dataset) {
      layer.dataset.effect = cmd.key;
    }

    appendImpact();
    appendEffect(cmd);
    scheduleClear();
    return cmd.key;
  }

  return {
    clear,
    triggerByKey(key) {
      const cmd = findEffectByKey(key);
      return cmd ? show(cmd) : false;
    }
  };
}
