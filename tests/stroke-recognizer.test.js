import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeStrokes } from '../src/stroke-recognizer.js';

// Helper: create a stroke from raw x,y pairs
function stroke(pairs) {
  return pairs.map(([x, y]) => ({ x, y }));
}

// ─── normalization / empty input ────────────────────────

test('recognizeStrokes returns empty string for no strokes', () => {
  assert.equal(recognizeStrokes([]), '');
  assert.equal(recognizeStrokes(null), '');
});

test('recognizeStrokes returns empty string for strokes with too few points', () => {
  assert.equal(recognizeStrokes([stroke([[10, 10]])]), '');
});

test('recognizeStrokes returns empty string for random scribble', () => {
  // A tight scribble in one corner — doesn't resemble any character
  const scribble = [
    stroke([[10, 10], [30, 5], [50, 15], [40, 30], [15, 25]])
  ];
  assert.equal(recognizeStrokes(scribble), '');
});

// ─── "花" recognition ───────────────────────────────────

test('recognizeStrokes identifies a flower-shaped multi-stroke drawing', () => {
  // Draw strokes approximating the 7 strokes of 花
  // Coordinates are scaled to simulate finger writing on a ~500px canvas
  const flowerStrokes = [
    // Stroke 1: top horizontal
    stroke([[80, 60], [420, 60]]),
    // Stroke 2: left vertical
    stroke([[180, 20], [180, 180]]),
    // Stroke 3: right vertical
    stroke([[330, 20], [330, 180]]),
    // Stroke 4: left slant (撇)
    stroke([[170, 190], [120, 250], [100, 310]]),
    // Stroke 5: left vertical (竖)
    stroke([[170, 190], [170, 280]]),
    // Stroke 6: right slant (撇)
    stroke([[240, 200], [200, 260], [170, 320]]),
    // Stroke 7: hook
    stroke([[240, 200], [240, 300], [300, 300], [300, 340], [280, 320]])
  ];

  const result = recognizeStrokes(flowerStrokes);
  assert.equal(result, '花', 'should recognize the flower character');
});

test('recognizeStrokes identifies a simplified 3-stroke flower', () => {
  // Simplified version with fewer strokes but same overall shape
  const simpleFlower = [
    stroke([[100, 80], [300, 80], [380, 100]]),          // 艹 top
    stroke([[200, 60], [200, 180], [160, 280]]),           // left 亻
    stroke([[260, 160], [240, 260], [300, 260], [350, 300]])  // right 匕
  ];

  const result = recognizeStrokes(simpleFlower);
  assert.equal(result, '花', 'simplified flower should still match');
});

test('recognizeStrokes tolerates scale variation', () => {
  // Very small flower
  const tinyFlower = [
    stroke([[40, 30], [210, 30]]),
    stroke([[90, 10], [90, 90]]),
    stroke([[165, 10], [165, 90]]),
    stroke([[85, 95], [60, 125], [50, 155]]),
    stroke([[85, 95], [85, 140]]),
    stroke([[120, 100], [100, 130], [85, 160]]),
    stroke([[120, 100], [120, 150], [150, 150], [150, 170], [140, 160]])
  ];

  assert.equal(recognizeStrokes(tinyFlower), '花', 'scale-invariant');
});

test('recognizeStrokes tolerates translation', () => {
  // Flower shifted to corner
  const shiftedFlower = [
    stroke([[500, 400], [840, 400]]),
    stroke([[600, 360], [600, 520]]),
    stroke([[750, 360], [750, 520]]),
    stroke([[590, 530], [540, 590], [520, 650]]),
    stroke([[590, 530], [590, 620]]),
    stroke([[660, 540], [620, 600], [590, 660]]),
    stroke([[660, 540], [660, 640], [720, 640], [720, 680], [700, 660]])
  ];

  assert.equal(recognizeStrokes(shiftedFlower), '花', 'translation-invariant');
});
