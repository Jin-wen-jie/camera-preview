const TRIGGERS = [
  {
    phrase: '开花',
    type: 'flower',
    className: 'voice-effect voice-effect--flower',
    content: '✿'
  },
  {
    phrase: '爱心',
    type: 'heart',
    className: 'voice-effect voice-effect--heart',
    content: '♥'
  },
  {
    phrase: '下雪',
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
      const trigger = TRIGGERS.find(({ phrase }) => normalizedText.includes(phrase));
      return trigger ? show(trigger) : false;
    }
  };
}
