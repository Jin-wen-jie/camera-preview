const FLOWER_TRIGGER = {
  phrases: ['花'],
  type: 'flower',
  className: 'voice-effect voice-effect--flower',
  content: '🌸'
};
const HEART_PARTICLE = '❤';
const HEART_PATH_SCALE = 1.35;
const HEART_PARTICLE_COUNT = 36;

function getHeartShapeY(angle) {
  return (
    13 * Math.cos(angle)
    - 5 * Math.cos(2 * angle)
    - 2 * Math.cos(3 * angle)
    - Math.cos(4 * angle)
  );
}

function getHeartPathCenterY(total) {
  let minY = Infinity;
  let maxY = -Infinity;

  for (let index = 0; index < total; index += 1) {
    const angle = (Math.PI * 2 * index) / total;
    const y = -getHeartShapeY(angle) * HEART_PATH_SCALE;
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return (minY + maxY) / 2;
}

function normalizeTranscript(text) {
  return String(text || '').replace(/\s+/g, '');
}

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

function setPetalVector(element, index, total) {
  const angle = (Math.PI * 2 * index) / total;
  const x = 16 * Math.sin(angle) ** 3;
  const y = getHeartShapeY(angle);
  const centerY = getHeartPathCenterY(total);

  element.style?.setProperty?.('--x', `${(x * HEART_PATH_SCALE).toFixed(2)}vmin`);
  element.style?.setProperty?.('--y', `${((-y * HEART_PATH_SCALE) - centerY).toFixed(2)}vmin`);
  element.style?.setProperty?.('--r', `${Math.round((angle * 180) / Math.PI)}deg`);
}

function setEffectOrigin(layer, origin = { x: 50, y: 50 }) {
  layer?.style?.setProperty?.('--effect-x', `${origin.x}%`);
  layer?.style?.setProperty?.('--effect-y', `${origin.y}%`);
}

export function createVoiceEffectController({
  layer,
  createElement = (tagName) => document.createElement(tagName),
  timers = globalThis,
  durationMs = 3200
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

  function appendFlowerHead() {
    const element = createElement('span');
    element.className = FLOWER_TRIGGER.className;
    element.textContent = FLOWER_TRIGGER.content;
    layer.append(element);
  }

  function appendPetals() {
    const petalCount = HEART_PARTICLE_COUNT;
    for (let index = 0; index < petalCount; index += 1) {
      const element = createElement('span');
      element.className = 'voice-effect voice-effect--petal';
      element.textContent = HEART_PARTICLE;
      setStyleIndex(element, index);
      setPetalVector(element, index, petalCount);
      layer.append(element);
    }
  }

  function findTrigger(text) {
    const normalizedText = normalizeTranscript(text);
    return FLOWER_TRIGGER.phrases.some((phrase) => normalizedText.includes(phrase))
      ? FLOWER_TRIGGER
      : null;
  }

  function show(origin) {
    clear();
    setEffectOrigin(layer, origin);
    if (layer?.dataset) {
      layer.dataset.effect = FLOWER_TRIGGER.type;
    }

    appendImpact();
    appendFlowerHead();
    appendPetals();
    scheduleClear();
    return FLOWER_TRIGGER.type;
  }

  return {
    clear,
    getEffectType(text) {
      return findTrigger(text)?.type || false;
    },
    triggerFromTranscript(text, { origin } = {}) {
      return findTrigger(text) ? show(origin) : false;
    }
  };
}
