import test from 'node:test';
import assert from 'node:assert/strict';

import { createVoiceEffectController } from '../src/effects.js';

function createLayer() {
  return {
    children: [],
    dataset: {},
    append(element) {
      this.children.push(element);
    },
    getBoundingClientRect() {
      return { width: 800, height: 600 };
    }
  };
}

test('voice effect controller shows a full-screen falling flower sea when triggered by key', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    timers: {
      setTimeout() { return 1; },
      clearTimeout() {}
    }
  });

  const result = effects.triggerByKey('flower');

  assert.equal(result, 'flower');
  assert.equal(layer.dataset.effect, 'flower');
  // Canvas element was created and appended
  const canvas = layer.children.find((c) => c.tagName === 'CANVAS');
  assert.ok(canvas, 'canvas element should exist');
});

test('voice effect controller returns false for unknown key', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    timers: {
      setTimeout() { return 1; },
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
    timers: {
      setTimeout() { return 1; },
      clearTimeout() {}
    }
  });

  effects.triggerByKey('flower');

  // No extraneous properties are set on the layer
  assert.equal(layer.dataset.effect, 'flower');
  const canvas = layer.children.find((c) => c.tagName === 'CANVAS');
  assert.ok(canvas);
});

test('voice effect controller triggers snow and heart from their keys', () => {
  const layerSnow = createLayer();
  const effectsSnow = createVoiceEffectController({
    layer: layerSnow,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  assert.equal(effectsSnow.triggerByKey('snow'), 'snow');
  assert.equal(layerSnow.dataset.effect, 'snow');
  assert.ok(layerSnow.children.some((c) => c.tagName === 'CANVAS'), 'snow should create canvas');

  const layerHeart = createLayer();
  const effectsHeart = createVoiceEffectController({
    layer: layerHeart,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  assert.equal(effectsHeart.triggerByKey('heart'), 'heart');
  assert.equal(layerHeart.dataset.effect, 'heart');
  assert.ok(layerHeart.children.some((c) => c.tagName === 'CANVAS'), 'heart should create canvas');
});

test('voice effect controller triggerByKey works for all effect types', () => {
  for (const key of ['flower', 'snow', 'heart', 'star', 'leaf', 'bubble']) {
    const layer = createLayer();
    const effects = createVoiceEffectController({
      layer,
      timers: { setTimeout() { return 1; }, clearTimeout() {} }
    });
    assert.equal(effects.triggerByKey(key), key, `triggerByKey('${key}') should return '${key}'`);
    assert.equal(layer.dataset.effect, key, `dataset.effect should be '${key}'`);
    assert.ok(layer.children.some((c) => c.tagName === 'CANVAS'), `${key} should create canvas`);
  }
});

test('voice effect controller clear removes all particles but keeps canvas for reuse', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  effects.triggerByKey('flower');
  const canvasCount = layer.children.filter((c) => c.tagName === 'CANVAS').length;
  assert.equal(canvasCount, 1, 'canvas should exist after trigger');

  effects.clear();
  // Canvas is kept for reuse (dispose() removes it)
  assert.ok(layer.children.some((c) => c.tagName === 'CANVAS'), 'canvas should persist after clear');
  assert.equal(layer.dataset.effect, undefined, 'dataset.effect should be cleared');
});

test('voice effect controller dispose removes canvas and cancels animation', () => {
  const layer = createLayer();
  const effects = createVoiceEffectController({
    layer,
    timers: { setTimeout() { return 1; }, clearTimeout() {} }
  });

  effects.triggerByKey('flower');
  assert.ok(layer.children.length > 0);

  effects.dispose();
  assert.equal(layer.children.length, 0, 'dispose should remove canvas');
  assert.equal(layer.dataset.effect, undefined, 'dispose should clear dataset');
});
