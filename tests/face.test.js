import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFaceAnchorDetector,
  createMediaPipeFaceDetector,
  getHeadAnchorFromFace
} from '../src/face.js';

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

test('getHeadAnchorFromFace accepts MediaPipe origin coordinates', () => {
  const anchor = getHeadAnchorFromFace({
    boundingBox: { originX: 200, originY: 150, width: 200, height: 180 },
    videoWidth: 1000,
    videoHeight: 500,
    mirrorX: true
  });

  assert.equal(anchor.x, 70);
  assert.equal(anchor.y, 23);
});

test('face anchor detector uses a model detector when native detection is unavailable', async () => {
  const calls = [];
  const detector = createFaceAnchorDetector({
    FaceDetector: undefined,
    video: { videoWidth: 1000, videoHeight: 500 },
    now: () => 1234,
    async createModelDetector() {
      return {
        detect(video, timestamp) {
          calls.push({ video, timestamp });
          return [
            {
              boundingBox: { originX: 200, originY: 150, width: 200, height: 180 }
            }
          ];
        }
      };
    }
  });

  assert.deepEqual(await detector.detect(), { x: 70, y: 23 });
  assert.deepEqual(calls, [
    {
      video: { videoWidth: 1000, videoHeight: 500 },
      timestamp: 1234
    }
  ]);
});

test('face anchor detector samples nearby frames when the first frame misses a face', async () => {
  const calls = [];
  const waits = [];
  const detector = createFaceAnchorDetector({
    FaceDetector: undefined,
    video: { videoWidth: 1000, videoHeight: 500 },
    now: () => 1234 + calls.length,
    sampleFrameCount: 3,
    sampleDelayMs: 40,
    wait(ms) {
      waits.push(ms);
      return Promise.resolve();
    },
    async createModelDetector() {
      return {
        detect(video, timestamp) {
          calls.push({ video, timestamp });
          if (calls.length < 3) {
            return [];
          }

          return [
            {
              boundingBox: { originX: 200, originY: 150, width: 200, height: 180 }
            }
          ];
        }
      };
    }
  });

  assert.deepEqual(await detector.detect(), { x: 70, y: 23 });
  assert.deepEqual(waits, [40, 40]);
  assert.equal(detector.getStatus().state, 'detected');
});

test('createMediaPipeFaceDetector loads the pinned video detector', async () => {
  const events = [];
  const detector = await createMediaPipeFaceDetector({
    async importVisionTasks(url) {
      events.push({ type: 'import', url });
      return {
        FilesetResolver: {
          async forVisionTasks(url) {
            events.push({ type: 'wasm', url });
            return { wasm: true };
          }
        },
        FaceDetector: {
          async createFromOptions(wasmFileset, options) {
            events.push({ type: 'options', wasmFileset, options });
            return {
              detectForVideo(video, timestamp) {
                events.push({ type: 'detect', video, timestamp });
                return {
                  detections: [
                    {
                      boundingBox: {
                        originX: 200,
                        originY: 150,
                        width: 200,
                        height: 180
                      }
                    }
                  ]
                };
              }
            };
          }
        }
      };
    }
  });

  const video = { videoWidth: 1000, videoHeight: 500 };

  assert.deepEqual(detector.detect(video, 1234), [
    {
      boundingBox: {
        originX: 200,
        originY: 150,
        width: 200,
        height: 180
      }
    }
  ]);
  assert.deepEqual(events, [
    {
      type: 'import',
      url: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs'
    },
    {
      type: 'wasm',
      url: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    },
    {
      type: 'options',
      wasmFileset: { wasm: true },
      options: {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite'
        },
        minDetectionConfidence: 0.35,
        runningMode: 'VIDEO'
      }
    },
    {
      type: 'detect',
      video,
      timestamp: 1234
    }
  ]);
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
