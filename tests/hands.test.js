import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIndexFingerTrailController,
  getIndexFingerTip,
  getNearestHandToCenter,
  isIndexFingerExtended,
  isOpenPalm,
  pruneTrailPoints
} from '../src/hands.js';

function landmark(x, y) {
  return { x, y };
}

function openPalmLandmarks() {
  const points = Array.from({ length: 21 }, () => landmark(0.5, 0.5));
  points[0] = landmark(0.5, 0.9);
  points[1] = landmark(0.42, 0.78);
  points[2] = landmark(0.36, 0.65);
  points[3] = landmark(0.30, 0.52);
  points[4] = landmark(0.24, 0.42);
  points[5] = landmark(0.42, 0.68);
  points[6] = landmark(0.42, 0.52);
  points[7] = landmark(0.42, 0.36);
  points[8] = landmark(0.42, 0.20);
  points[9] = landmark(0.50, 0.68);
  points[10] = landmark(0.50, 0.50);
  points[11] = landmark(0.50, 0.32);
  points[12] = landmark(0.50, 0.14);
  points[13] = landmark(0.58, 0.69);
  points[14] = landmark(0.58, 0.53);
  points[15] = landmark(0.58, 0.37);
  points[16] = landmark(0.58, 0.22);
  points[17] = landmark(0.66, 0.72);
  points[18] = landmark(0.66, 0.58);
  points[19] = landmark(0.66, 0.44);
  points[20] = landmark(0.66, 0.30);
  return points;
}

function indexOnlyLandmarks(x = 0.42, y = 0.2) {
  const points = openPalmLandmarks();
  points[4] = landmark(0.46, 0.74);
  points[8] = landmark(x, y);
  points[12] = landmark(0.50, 0.62);
  points[16] = landmark(0.58, 0.64);
  points[20] = landmark(0.66, 0.66);
  return points;
}

function fistLandmarks() {
  const points = openPalmLandmarks();
  points[4] = landmark(0.48, 0.76);
  points[8] = landmark(0.42, 0.62);
  points[12] = landmark(0.50, 0.62);
  points[16] = landmark(0.58, 0.64);
  points[20] = landmark(0.66, 0.66);
  return points;
}

function createCanvas() {
  return {
    width: 0,
    height: 0,
    getContext() {
      return {
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        quadraticCurveTo() {},
        stroke() {},
        set strokeStyle(value) {},
        set lineWidth(value) {},
        set lineCap(value) {},
        set lineJoin(value) {}
      };
    }
  };
}

test('isOpenPalm returns true when all five fingers are extended', () => {
  assert.equal(isOpenPalm(openPalmLandmarks()), true);
});

test('isOpenPalm returns false when only the index finger is extended', () => {
  assert.equal(isOpenPalm(indexOnlyLandmarks()), false);
});

test('isIndexFingerExtended detects index-only writing pose', () => {
  assert.equal(isIndexFingerExtended(indexOnlyLandmarks()), true);
  assert.equal(isIndexFingerExtended(fistLandmarks()), false);
  assert.equal(isIndexFingerExtended(openPalmLandmarks()), false);
});

test('getNearestHandToCenter picks the hand whose index fingertip is closest to screen center', () => {
  const leftHand = indexOnlyLandmarks(0.12, 0.20);
  const centerHand = indexOnlyLandmarks(0.52, 0.48);
  const rightHand = indexOnlyLandmarks(0.86, 0.20);

  assert.equal(getNearestHandToCenter([leftHand, centerHand, rightHand]), centerHand);
});

test('getIndexFingerTip returns normalized index fingertip coordinates', () => {
  assert.deepEqual(getIndexFingerTip(openPalmLandmarks()), { x: 0.42, y: 0.2 });
});

test('pruneTrailPoints removes points older than the retention window', () => {
  const points = [
    { x: 10, y: 10, timestamp: 900 },
    { x: 20, y: 20, timestamp: 6000 },
    { x: 30, y: 30, timestamp: 7000 }
  ];

  assert.deepEqual(pruneTrailPoints(points, 7000, 5000), [
    { x: 20, y: 20, timestamp: 6000 },
    { x: 30, y: 30, timestamp: 7000 }
  ]);
});

test('pruneTrailPoints preserves null stroke-break markers', () => {
  const points = [
    { x: 10, y: 10, timestamp: 900 },
    null,
    { x: 20, y: 20, timestamp: 6000 },
    { x: 30, y: 30, timestamp: 7000 }
  ];

  assert.deepEqual(pruneTrailPoints(points, 7000, 5000), [
    null,
    { x: 20, y: 20, timestamp: 6000 },
    { x: 30, y: 30, timestamp: 7000 }
  ]);
});

test('controller records while the index finger is extended and pauses when it folds', () => {
  const states = [];
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: createCanvas(),
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    onStatusChange: (state) => states.push(state),
    now: () => 0
  });

  controller.processLandmarks(indexOnlyLandmarks(0.40, 0.30), 1000);
  assert.equal(controller.isRecording(), true);
  controller.processLandmarks(indexOnlyLandmarks(0.45, 0.34), 1100);
  assert.equal(controller.getTrailPoints().length, 2);
  controller.processLandmarks(fistLandmarks(), 1200);
  assert.equal(controller.isRecording(), false);
  controller.processLandmarks(fistLandmarks(), 1300);
  assert.equal(controller.getTrailPoints().length, 2);
  assert.deepEqual(states, ['recording', 'paused']);
});

test('controller records the centered index finger when multiple hands are visible', () => {
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: createCanvas(),
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    now: () => 0
  });

  controller.processLandmarks([
    indexOnlyLandmarks(0.10, 0.20),
    indexOnlyLandmarks(0.51, 0.49)
  ], 1000);

  assert.equal(controller.isRecording(), true);
  assert.deepEqual(controller.getTrailPoints(), [
    { x: 326.4, y: 235.2, timestamp: 1000 }
  ]);
});

test('controller clears the screen when five fingers open', () => {
  const states = [];
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: createCanvas(),
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    onStatusChange: (state) => states.push(state),
    now: () => 0
  });

  controller.processLandmarks(indexOnlyLandmarks(0.40, 0.30), 1000);
  controller.processLandmarks(indexOnlyLandmarks(0.45, 0.34), 1100);
  assert.equal(controller.getTrailPoints().length, 2);

  controller.processLandmarks(openPalmLandmarks(), 1200);
  assert.equal(controller.isRecording(), false);
  assert.deepEqual(controller.getTrailPoints(), []);
  assert.equal(states.at(-1), 'cleared');
});

test('controller emits a finger writing result when open palm finishes writing', () => {
  const results = [];
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: createCanvas(),
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    onWritingResult: (result) => results.push(result),
    now: () => 1300
  });

  controller.processLandmarks(indexOnlyLandmarks(0.40, 0.30), 1000);
  controller.processLandmarks(indexOnlyLandmarks(0.45, 0.34), 1100);
  controller.processLandmarks(fistLandmarks(), 1150);
  controller.processLandmarks(indexOnlyLandmarks(0.52, 0.38), 1200);
  controller.processLandmarks(openPalmLandmarks(), 1300);

  assert.equal(results.length, 1);
  assert.equal(results[0].source, 'finger-writing');
  assert.equal(results[0].text, '');
  assert.equal(results[0].createdAt, 1300);
  assert.equal(results[0].strokes.length, 2);
  assert.deepEqual(results[0].strokes[0], [
    { x: 256, y: 144, timestamp: 1000 },
    { x: 268.3580615165729, y: 151.41360909300522, timestamp: 1100 }
  ]);
  assert.deepEqual(results[0].strokes[1], [
    { x: 332.8, y: 182.4, timestamp: 1200 }
  ]);
});

test('controller inserts null break markers in trailPoints between strokes', () => {
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: createCanvas(),
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    now: () => 0
  });

  controller.processLandmarks(indexOnlyLandmarks(0.40, 0.30), 1000);
  controller.processLandmarks(indexOnlyLandmarks(0.45, 0.34), 1100);
  controller.processLandmarks(fistLandmarks(), 1200);
  controller.processLandmarks(indexOnlyLandmarks(0.52, 0.38), 1300);
  controller.processLandmarks(indexOnlyLandmarks(0.56, 0.42), 1400);

  const trailPoints = controller.getTrailPoints();
  assert.equal(trailPoints.length, 5);
  assert.equal(trailPoints[0].timestamp, 1000);
  assert.equal(trailPoints[1].timestamp, 1100);
  assert.equal(trailPoints[2], null);
  assert.equal(trailPoints[3].timestamp, 1300);
  assert.equal(trailPoints[4].timestamp, 1400);
});
