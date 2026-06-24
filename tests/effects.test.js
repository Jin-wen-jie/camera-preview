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

test('voice effect controller shows a full-screen falling flower sea when speech contains 花', () => {
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

  const fallingFlowers = layer.children.filter((child) => (
    child.className === 'voice-effect voice-effect--falling-flower'
  ));
  assert.equal(fallingFlowers.length, 108);
  assert.ok(fallingFlowers.every((child) => ['🌸', '🌺', '✿', '❀', '❁'].includes(child.textContent)));
  assert.ok(fallingFlowers.every((child) => child.style.values['--x'].endsWith('%')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--delay'].endsWith('ms')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--duration'].endsWith('ms')));
  assert.ok(fallingFlowers.every((child) => child.style.values['--drift'].endsWith('vw')));

  const xs = fallingFlowers.map((child) => readPercent(child.style.values['--x']));
  assert.ok(Math.min(...xs) <= 1);
  assert.ok(Math.max(...xs) >= 99);
  assert.ok(new Set(fallingFlowers.map((child) => child.textContent)).size >= 4);
  assert.equal(layer.children.some((child) => child.className === 'voice-effect voice-effect--petal'), false);
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

test('voice effect controller keeps flower sea independent of supplied face origin', () => {
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

  assert.equal(layer.style.values['--effect-x'], undefined);
  assert.equal(layer.style.values['--effect-y'], undefined);
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
