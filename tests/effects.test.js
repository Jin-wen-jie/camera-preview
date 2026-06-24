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
  const x = child.style.values['--x'].match(/^(-?\d+(?:\.\d+)?)([a-z%]+)$/);
  const y = child.style.values['--y'].match(/^(-?\d+(?:\.\d+)?)([a-z%]+)$/);

  return {
    x: Number(x?.[1]),
    y: Number(y?.[1]),
    xUnit: x?.[2],
    yUnit: y?.[2]
  };
}

test('voice effect controller shows a centered flower heart burst when speech contains 花', () => {
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

  const result = effects.triggerFromTranscript('花');

  assert.equal(result, 'flower');
  assert.equal(layer.dataset.effect, 'flower');
  assert.ok(layer.children.some((child) => child.className === 'voice-effect-impact'));
  const faceFlower = layer.children.find((child) => child.className === 'voice-effect voice-effect--flower');
  assert.ok(faceFlower);
  assert.equal(faceFlower.textContent, '🌸');
  assert.ok(layer.children.some((child) => child.className === 'voice-effect voice-effect--petal'));
  assert.ok(layer.children.length >= 20);

  const flyingPetals = layer.children.filter((child) => child.className === 'voice-effect voice-effect--petal');
  assert.equal(flyingPetals.length, 36);
  assert.ok(flyingPetals.every((child) => child.textContent === '❤'));

  const vectors = flyingPetals.map(readVector);
  assert.ok(vectors.every(({ xUnit, yUnit }) => xUnit === 'vmin' && yUnit === 'vmin'));

  const xs = vectors.map(({ x }) => x);
  const ys = vectors.map(({ y }) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  assert.ok(width / height < 1.2);

  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  assert.ok(Math.abs(centerX) < 0.25);
  assert.ok(Math.abs(centerY) < 0.25);

  assert.ok(vectors.some(({ x, y }) => x < -20 && y < 2));
  assert.ok(vectors.some(({ x, y }) => x > 20 && y < 2));
  assert.ok(vectors.some(({ y }) => y < -12));
  assert.ok(vectors.some(({ x, y }) => Math.abs(x) < 1 && y > 18));
  assert.ok(vectors.some(({ x, y }) => Math.abs(x) < 1 && y > -12 && y < -8));
});

test('voice effect controller understands the one-character flower command', () => {
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

  const result = effects.triggerFromTranscript('花');

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

  effects.triggerFromTranscript('花', { origin: { x: 70, y: 23 } });

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
