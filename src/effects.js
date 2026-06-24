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
    count: 18
  }
];

function normalizeTranscript(text) {
  return String(text || '').replace(/\s+/g, '');
}

function setStyleIndex(element, index) {
  element.style?.setProperty?.('--i', String(index));
}

export function createVoiceEffectController({
  layer,
  createElement = (tagName) => document.createElement(tagName),
  timers = globalThis,
  durationMs = 2600
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

  function appendRepeatedEffect(trigger) {
    for (let index = 0; index < trigger.count; index += 1) {
      const element = createElement('span');
      element.className = trigger.className;
      element.textContent = trigger.content;
      setStyleIndex(element, index);
      layer.append(element);
    }
  }

  function show(trigger) {
    clear();
    if (layer?.dataset) {
      layer.dataset.effect = trigger.type;
    }

    if (trigger.count) {
      appendRepeatedEffect(trigger);
    } else {
      appendSingleEffect(trigger);
    }

    scheduleClear();
    return trigger.type;
  }

  return {
    clear,
    triggerFromTranscript(text) {
      const normalizedText = normalizeTranscript(text);
      const trigger = TRIGGERS.find(({ phrases }) => (
        phrases.some((phrase) => normalizedText.includes(phrase))
      ));
      return trigger ? show(trigger) : false;
    }
  };
}
