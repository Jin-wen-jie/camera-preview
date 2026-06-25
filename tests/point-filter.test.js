import test from 'node:test';
import assert from 'node:assert/strict';

import { createPointFilter } from '../src/point-filter.js';

test('point filter passes through the first sample unchanged', () => {
  const filter = createPointFilter();
  const result = filter.filter(0.5, 0.3, 1000);

  assert.deepEqual(result, { x: 0.5, y: 0.3 });
});

test('point filter smooths jitter while tracking the signal direction', () => {
  const filter = createPointFilter();

  const first = filter.filter(0.50, 0.10, 1000);
  const second = filter.filter(0.55, 0.14, 1033);
  const third = filter.filter(0.53, 0.12, 1066);
  const fourth = filter.filter(0.57, 0.16, 1100);

  assert.ok(second.x > first.x && second.x < 0.55);
  assert.ok(Math.abs(third.x - 0.53) < Math.abs(0.53 - second.x));
  assert.ok(fourth.x > third.x);
});

test('point filter handles identical consecutive timestamps', () => {
  const filter = createPointFilter();

  filter.filter(0.40, 0.40, 1000);
  const result = filter.filter(0.80, 0.80, 1000);

  assert.deepEqual(result, { x: 0.40, y: 0.40 });
});

test('point filter reset clears internal state', () => {
  const filter = createPointFilter();

  filter.filter(0.20, 0.30, 1000);
  filter.filter(0.70, 0.70, 1160);
  filter.reset();
  const afterReset = filter.filter(0.80, 0.80, 1330);

  assert.deepEqual(afterReset, { x: 0.80, y: 0.80 });
});

test('point filter respects custom parameters', () => {
  const tight = createPointFilter({ minCutoff: 3.0, beta: 0.001, dCutoff: 2.0 });

  const first = tight.filter(0.50, 0.50, 1000);
  const second = tight.filter(0.90, 0.90, 1033);

  assert.ok(second.x > first.x);
  assert.ok(second.x > 0.60);
});

test('point filter returns stable coordinates under stationary noise', () => {
  const filter = createPointFilter({ minCutoff: 0.5, beta: 0.01 });

  const first = filter.filter(0.4000, 0.3000, 1000);
  filter.filter(0.4012, 0.2988, 1033);
  filter.filter(0.3995, 0.3014, 1066);
  const last = filter.filter(0.4008, 0.2995, 1100);

  assert.ok(Math.abs(last.x - first.x) < 0.001);
  assert.ok(Math.abs(last.y - first.y) < 0.001);
});
