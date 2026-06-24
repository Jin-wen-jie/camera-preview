import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIndexFingerTrailController,
  getIndexFingerTip,
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

function relaxedHandLandmarks() {
  const points = openPalmLandmarks();
  points[8] = landmark(0.42, 0.62);
  points[12] = landmark(0.50, 0.62);
  points[16] = landmark(0.58, 0.62);
  points[20] = landmark(0.66, 0.62);
  return points;
}

test('isOpenPalm returns true when all five fingers are extended', () => {
  assert.equal(isOpenPalm(openPalmLandmarks()), true);
});

test('isOpenPalm returns false when the index finger is folded', () => {
  const points = openPalmLandmarks();
  points[8] = landmark(0.42, 0.62);

  assert.equal(isOpenPalm(points), false);
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

test('controller toggles once per stable open palm gesture', () => {
  const states = [];
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: null,
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    onStatusChange: (state) => states.push(state),
    now: () => 0
  });

  const openPalm = openPalmLandmarks();
  const relaxedHand = relaxedHandLandmarks();
  controller.processLandmarks(openPalm, 1000);
  assert.equal(controller.isRecording(), false);
  controller.processLandmarks(openPalm, 1500);
  assert.equal(controller.isRecording(), true);
  controller.processLandmarks(openPalm, 2500);
  assert.equal(controller.isRecording(), true);
  controller.processLandmarks(relaxedHand, 2600);
  controller.processLandmarks(openPalm, 3000);
  controller.processLandmarks(openPalm, 3500);
  assert.equal(controller.isRecording(), false);
  assert.deepEqual(states, ['recording', 'paused']);
});

test('controller records only index fingertip points while recording', () => {
  const canvas = {
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
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas,
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    now: () => 0
  });

  const openPalm = openPalmLandmarks();
  const relaxedHand = relaxedHandLandmarks();
  controller.processLandmarks(openPalm, 1000);
  controller.processLandmarks(openPalm, 1500);
  controller.processLandmarks(relaxedHand, 1600);

  assert.deepEqual(controller.getTrailPoints(), [
    { x: 268.8, y: 297.6, timestamp: 1600 }
  ]);
});
