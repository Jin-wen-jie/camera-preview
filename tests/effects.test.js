import test from 'node:test';
import assert from 'node:assert/strict';

import { createVoiceEffectController } from '../src/effects.js';

function createElement(tagName) {
  return {
    tagName,
    className: '',
    textContent: '',
    dataset: {},
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    }
  };
}

function createLayer() {
  return {
    children: [],
    dataset: {},
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    }
  };
}

test('voice effect controller shows a flower when speech contains 开花', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    createElement,
    timers: {
      setTimeout() {
        return 1;
      },
      clearTimeout() {}
    }
  });

  const result = effects.triggerFromTranscript('请在我头上开花');

  assert.equal(result, 'flower');
  assert.equal(layer.dataset.effect, 'flower');
  assert.equal(layer.children.length, 1);
  assert.equal(layer.children[0].className, 'voice-effect voice-effect--flower');
  assert.equal(layer.children[0].textContent, '✿');
});

test('voice effect controller shows snow when speech contains 下雪', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    createElement,
    timers: {
      setTimeout() {
        return 1;
      },
      clearTimeout() {}
    }
  });

  const result = effects.triggerFromTranscript('现在开始下雪');

  assert.equal(result, 'snow');
  assert.equal(layer.dataset.effect, 'snow');
  assert.equal(layer.children.length, 18);
  assert.ok(layer.children.every((child) => child.className === 'voice-effect voice-effect--snow'));
});
