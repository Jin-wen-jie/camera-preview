import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIndexFingerTrailController,
  getFingerPinchRatio,
  getIndexFingerTip,
  isFingerPinched,
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

function pinchedLandmarks() {
  const points = openPalmLandmarks();
  points[4] = landmark(0.42, 0.22);
  points[8] = landmark(0.43, 0.21);
  points[12] = landmark(0.50, 0.46);
  points[16] = landmark(0.58, 0.52);
  points[20] = landmark(0.66, 0.58);
  return points;
}

function separatedLandmarks() {
  const points = pinchedLandmarks();
  points[4] = landmark(0.24, 0.42);
  points[8] = landmark(0.48, 0.24);
  return points;
}

function loosePinchLandmarks() {
  const points = pinchedLandmarks();
  points[4] = landmark(0.34, 0.28);
  points[8] = landmark(0.46, 0.24);
  return points;
}

function pinchedAt(x, y) {
  const points = pinchedLandmarks();
  points[4] = landmark(x - 0.01, y + 0.01);
  points[8] = landmark(x, y);
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

test('isOpenPalm returns false when the index finger is folded', () => {
  const points = openPalmLandmarks();
  points[8] = landmark(0.42, 0.62);

  assert.equal(isOpenPalm(points), false);
});

test('pinch ratio is normalized by palm width', () => {
  assert.ok(getFingerPinchRatio(pinchedLandmarks()) < 0.18);
  assert.ok(getFingerPinchRatio(separatedLandmarks()) > 0.34);
});

test('isFingerPinched uses normalized thumb-index distance', () => {
  assert.equal(isFingerPinched(pinchedLandmarks()), true);
  assert.equal(isFingerPinched(loosePinchLandmarks()), true);
  assert.equal(isFingerPinched(separatedLandmarks()), false);
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

test('controller records while pinched and pauses when fingers separate', () => {
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

  controller.processLandmarks(pinchedLandmarks(), 1000);
  assert.equal(controller.isRecording(), false);
  controller.processLandmarks(pinchedLandmarks(), 1150);
  assert.equal(controller.isRecording(), true);
  controller.processLandmarks(pinchedLandmarks(), 1250);
  assert.equal(controller.getTrailPoints().length, 2);
  controller.processLandmarks(separatedLandmarks(), 1400);
  assert.equal(controller.isRecording(), false);
  controller.processLandmarks(separatedLandmarks(), 1500);
  assert.equal(controller.getTrailPoints().length, 2);
  assert.deepEqual(states, ['recording', 'paused']);
});

test('controller starts recording for a loose real-camera pinch', () => {
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: createCanvas(),
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    now: () => 0
  });

  controller.processLandmarks(loosePinchLandmarks(), 1000);
  assert.equal(controller.isRecording(), false);
  controller.processLandmarks(loosePinchLandmarks(), 1150);
  assert.equal(controller.isRecording(), true);
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

  controller.processLandmarks(pinchedLandmarks(), 1000);
  controller.processLandmarks(pinchedLandmarks(), 1150);
  controller.processLandmarks(pinchedLandmarks(), 1250);
  assert.equal(controller.getTrailPoints().length, 2);

  controller.processLandmarks(openPalmLandmarks(), 1400);
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
    now: () => 1800
  });

  const firstStroke = pinchedAt(0.40, 0.30);
  const secondPoint = pinchedAt(0.45, 0.34);
  const secondStroke = pinchedAt(0.52, 0.38);

  controller.processLandmarks(firstStroke, 1000);
  controller.processLandmarks(firstStroke, 1150);
  controller.processLandmarks(secondPoint, 1250);
  controller.processLandmarks(separatedLandmarks(), 1400);
  controller.processLandmarks(secondStroke, 1600);
  controller.processLandmarks(secondStroke, 1750);
  controller.processLandmarks(openPalmLandmarks(), 1800);

  assert.equal(results.length, 1);
  assert.equal(results[0].source, 'finger-writing');
  assert.equal(results[0].text, '');
  assert.equal(results[0].createdAt, 1800);
  assert.equal(results[0].strokes.length, 2);
  assert.deepEqual(results[0].strokes[0], [
    { x: 256, y: 144, timestamp: 1150 },
    { x: 288, y: 163.20000000000002, timestamp: 1250 }
  ]);
  assert.deepEqual(results[0].strokes[1], [
    { x: 332.8, y: 182.4, timestamp: 1750 }
  ]);
});
