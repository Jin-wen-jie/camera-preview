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
  assert.ok(layer.children.some((child) => child.className === 'voice-effect-impact'));
  assert.ok(layer.children.some((child) => child.className === 'voice-effect voice-effect--flower'));
  assert.ok(layer.children.some((child) => child.className === 'voice-effect voice-effect--petal'));
  assert.ok(layer.children.length >= 20);

  const flyingPetals = layer.children.filter((child) => child.className === 'voice-effect voice-effect--petal');
  assert.ok(flyingPetals.length > 0);
  assert.ok(flyingPetals.every((child) => child.textContent === '♥'));
});

test('voice effect controller understands natural flower commands', () => {
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

  const result = effects.triggerFromTranscript('在我头上放一朵花');

  assert.equal(result, 'flower');
  assert.equal(layer.dataset.effect, 'flower');
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
  assert.equal(layer.children.length, 42);
  assert.ok(layer.children.every((child) => child.className === 'voice-effect voice-effect--snow'));
});

test('voice effect controller shows a heart burst when speech contains 爱心', () => {
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

  const result = effects.triggerFromTranscript('给我来个爱心');

  assert.equal(result, 'heart');
  assert.equal(layer.dataset.effect, 'heart');
  assert.ok(layer.children.some((child) => child.className === 'voice-effect-impact voice-effect-impact--heart'));
  assert.ok(layer.children.filter((child) => child.className === 'voice-effect voice-effect--heart').length >= 10);
});
