const FLOWER_TRIGGER = {
  phrases: ['开花', '一朵花', '放花', '花朵', '头上花'],
  type: 'flower',
  className: 'voice-effect voice-effect--flower',
  content: '*'
};

function normalizeTranscript(text) {
  return String(text || '').replace(/\s+/g, '');
}

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

function setPetalVector(element, index, total) {
  const angle = (Math.PI * 2 * index) / total;
  const x = 16 * Math.sin(angle) ** 3;
  const y = (
    13 * Math.cos(angle)
    - 5 * Math.cos(2 * angle)
    - 2 * Math.cos(3 * angle)
    - Math.cos(4 * angle)
  );

  element.style?.setProperty?.('--x', `${(x * 1.55).toFixed(2)}vw`);
  element.style?.setProperty?.('--y', `${((-y * 1.35) + 2).toFixed(2)}vh`);
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
    const petalCount = 36;
    for (let index = 0; index < petalCount; index += 1) {
      const element = createElement('span');
      element.className = 'voice-effect voice-effect--petal';
      element.textContent = '*';
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
