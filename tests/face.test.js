import test from 'node:test';
import assert from 'node:assert/strict';

import { createFaceAnchorDetector, getHeadAnchorFromFace } from '../src/face.js';

test('getHeadAnchorFromFace returns mirrored head position above the face box', () => {
  const anchor = getHeadAnchorFromFace({
    boundingBox: { x: 200, y: 150, width: 200, height: 180 },
    videoWidth: 1000,
    videoHeight: 500,
    mirrorX: true
  });

  assert.equal(anchor.x, 70);
  assert.equal(anchor.y, 23);
});

test('face anchor detector falls back to the center when no face is found', async () => {
  class EmptyFaceDetector {
    async detect() {
      return [];
    }
  }

  const detector = createFaceAnchorDetector({
    FaceDetector: EmptyFaceDetector,
    video: { videoWidth: 1000, videoHeight: 500 }
  });

  assert.deepEqual(await detector.detect(), { x: 50, y: 50 });
});

test('face anchor detector falls back to the center when detector setup fails', async () => {
  class BrokenFaceDetector {
    constructor() {
      throw new Error('setup failed');
    }
  }

  const detector = createFaceAnchorDetector({
    FaceDetector: BrokenFaceDetector,
    video: { videoWidth: 1000, videoHeight: 500 }
  });

  assert.equal(detector.isSupported, false);
  assert.deepEqual(await detector.detect(), { x: 50, y: 50 });
});
