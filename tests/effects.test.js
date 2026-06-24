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
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    }
  };
}

function readVector(child) {
  return {
    x: Number(child.style.values['--x'].replace('vw', '')),
    y: Number(child.style.values['--y'].replace('vh', ''))
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
  assert.equal(flyingPetals.length, 36);
  assert.ok(flyingPetals.every((child) => child.textContent === '*'));

  const vectors = flyingPetals.map(readVector);
  assert.ok(vectors.some(({ x, y }) => x < -20 && y < 2));
  assert.ok(vectors.some(({ x, y }) => x > 20 && y < 2));
  assert.ok(vectors.some(({ y }) => y < -12));
  assert.ok(vectors.some(({ x, y }) => Math.abs(x) < 1 && y > 22));
  assert.ok(vectors.some(({ x, y }) => Math.abs(x) < 1 && y > -8 && y < 0));
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

test('voice effect controller positions flower burst at a supplied origin', () => {
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

  effects.triggerFromTranscript('开花', { origin: { x: 70, y: 23 } });

  assert.equal(layer.style.values['--effect-x'], '70%');
  assert.equal(layer.style.values['--effect-y'], '23%');
});

test('voice effect controller ignores removed snow and heart commands', () => {
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

  assert.equal(effects.triggerFromTranscript('下雪'), false);
  assert.equal(effects.triggerFromTranscript('爱心'), false);
  assert.equal(layer.dataset.effect, undefined);
  assert.equal(layer.children.length, 0);
});
