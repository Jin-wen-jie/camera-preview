const TRIGGERS = [
  {
    phrases: ['开花', '一朵花', '放花', '花朵', '头上花'],
    type: 'flower',
    className: 'voice-effect voice-effect--flower',
    content: '✿'
  },
  {
    phrases: ['爱心', '比心', '红心', '心形'],
    type: 'heart',
    className: 'voice-effect voice-effect--heart',
    content: '♥'
  },
  {
    phrases: ['下雪', '飘雪', '雪花'],
    type: 'snow',
    className: 'voice-effect voice-effect--snow',
    content: '❄',
    count: 42
  }
];

function normalizeTranscript(text) {
  return String(text || '').replace(/\s+/g, '');
}

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

function setBurstVector(element, index, total, radius) {
  const angle = (Math.PI * 2 * index) / total;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  element.style?.setProperty?.('--x', `${x.toFixed(2)}vw`);
  element.style?.setProperty?.('--y', `${y.toFixed(2)}vh`);
  element.style?.setProperty?.('--r', `${Math.round((angle * 180) / Math.PI)}deg`);
}

function setHeartOutlineVector(element, index, total) {
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

  function appendSingleEffect(trigger) {
    const element = createElement('span');
    element.className = trigger.className;
    element.textContent = trigger.content;
    layer.append(element);
  }

  function appendImpact(type) {
    const element = createElement('span');
    element.className = type === 'heart'
      ? 'voice-effect-impact voice-effect-impact--heart'
      : 'voice-effect-impact';
    layer.append(element);
  }

  function appendRepeatedEffect(trigger) {
    for (let index = 0; index < trigger.count; index += 1) {
      const element = createElement('span');
      element.className = trigger.className;
      element.textContent = trigger.content;
      setStyleIndex(element, index);
      element.style?.setProperty?.('--drift', `${index % 2 === 0 ? '-' : ''}${8 + (index % 5) * 4}vw`);
      layer.append(element);
    }
  }

  function appendFlowerEffect(trigger) {
    appendImpact('flower');
    appendSingleEffect(trigger);

    const petalCount = 36;
    for (let index = 0; index < petalCount; index += 1) {
      const element = createElement('span');
      element.className = 'voice-effect voice-effect--petal';
      element.textContent = '✿';
      setStyleIndex(element, index);
      setHeartOutlineVector(element, index, petalCount);
      layer.append(element);
    }
  }

  function appendHeartEffect(trigger) {
    appendImpact('heart');

    const heartCount = 14;
    for (let index = 0; index < heartCount; index += 1) {
      const element = createElement('span');
      element.className = trigger.className;
      element.textContent = trigger.content;
      setStyleIndex(element, index);
      setBurstVector(element, index, heartCount, 24);
      layer.append(element);
    }
  }

  function findTrigger(text) {
    const normalizedText = normalizeTranscript(text);
    return TRIGGERS.find(({ phrases }) => (
      phrases.some((phrase) => normalizedText.includes(phrase))
    ));
  }

  function show(trigger, origin) {
    clear();
    setEffectOrigin(layer, origin);
    if (layer?.dataset) {
      layer.dataset.effect = trigger.type;
    }

    if (trigger.type === 'flower') {
      appendFlowerEffect(trigger);
    } else if (trigger.type === 'heart') {
      appendHeartEffect(trigger);
    } else if (trigger.count) {
      appendRepeatedEffect(trigger);
    } else {
      appendSingleEffect(trigger);
    }

    scheduleClear();
    return trigger.type;
  }

  return {
    clear,
    getEffectType(text) {
      return findTrigger(text)?.type || false;
    },
    triggerFromTranscript(text, { origin } = {}) {
      const trigger = findTrigger(text);
      return trigger ? show(trigger, origin) : false;
    }
  };
}
