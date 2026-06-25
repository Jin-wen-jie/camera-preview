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

function readPercent(value) {
  return Number(value.replace('%', ''));
}

test('voice effect controller shows a full-screen falling flower sea when triggered by key', () => {
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

  const result = effects.triggerByKey('flower');

  assert.equal(result, 'flower');
  assert.equal(layer.dataset.effect, 'flower');
  assert.ok(layer.children.some((child) => child.className === 'voice-effect-impact'));

  const fallingFlowers = layer.children.filter((child) => (
    child.className === 'voice-effect voice-effect--falling-flower'
  ));
  assert.equal(fallingFlowers.length, 180);
  assert.ok(fallingFlowers.every((child) => ['🌸', '🌺', '🌻', '🌷', '🌼', '🌹', '💮', '🪷', '💐'].includes(child.textContent)));
  assert.ok(fallingFlowers.every((child) => child.style.values['--x'].endsWith('%')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--delay'].endsWith('ms')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--duration'].endsWith('ms')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--drift'].endsWith('px')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--scale']));
  assert.ok(fallingFlowers.every((child) => child.style.values['--opacity']));
  assert.ok(fallingFlowers.every((child) => child.style.values['--start-y'].endsWith('vh')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--sway'].endsWith('px')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--font-size'].endsWith('px')));

  const xs = fallingFlowers.map((child) => readPercent(child.style.values['--x']));
  assert.ok(Math.min(...xs) <= 1);
  assert.ok(Math.max(...xs) >= 99);
  assert.ok(new Set(fallingFlowers.map((child) => child.textContent)).size >= 7);
  assert.equal(layer.children.some((child) => child.className === 'voice-effect voice-effect--petal'), false);
});

test('voice effect controller returns false for unknown key', () => {
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

  assert.equal(effects.triggerByKey('unknown'), false);
  assert.equal(effects.triggerByKey(''), false);
});

test('voice effect controller keeps flower sea independent of any supplied state', () => {
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

  effects.triggerByKey('flower');

  // No extraneous properties are set on the layer
  assert.equal(layer.style.values['--effect-x'], undefined);
  assert.equal(layer.style.values['--effect-y'], undefined);
});

test('voice effect controller triggers snow and heart from their keys', () => {
  const layerSnow = createLayer();
  const effectsSnow = createVoiceEffectController({
    layer: layerSnow,
    createElement,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  assert.equal(effectsSnow.triggerByKey('snow'), 'snow');
  assert.equal(layerSnow.dataset.effect, 'snow');
  assert.ok(layerSnow.children.some((c) => c.className.includes('falling-snow')));

  const layerHeart = createLayer();
  const effectsHeart = createVoiceEffectController({
    layer: layerHeart,
    createElement,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  assert.equal(effectsHeart.triggerByKey('heart'), 'heart');
  assert.equal(layerHeart.dataset.effect, 'heart');
  assert.ok(layerHeart.children.some((c) => c.className.includes('falling-heart')));
});

test('voice effect controller triggerByKey works for all effect types', () => {
  for (const [key, expected] of [['flower', 'flower'], ['snow', 'snow'], ['heart', 'heart']]) {
    const layer = createLayer();
    const effects = createVoiceEffectController({
      layer,
      createElement,
      timers: { setTimeout() { return 1; }, clearTimeout() {} }
    });
    assert.equal(effects.triggerByKey(key), expected);
    assert.equal(layer.dataset.effect, expected);
    assert.ok(layer.children.length > 0);
  }
});

test('voice effect controller clear removes all children', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    createElement,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  effects.triggerByKey('flower');
  assert.ok(layer.children.length > 0);

  effects.clear();
  assert.equal(layer.children.length, 0);
  assert.equal(layer.dataset.effect, undefined);
});
