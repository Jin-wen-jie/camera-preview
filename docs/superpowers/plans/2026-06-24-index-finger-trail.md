# Index Finger Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add index-finger trail drawing controlled by an open-palm gesture, and simplify the app so only the flower effect remains.

**Architecture:** Keep hand detection in a new focused `src/hands.js` module, following the existing MediaPipe loading style in `src/face.js`. `src/app.js` wires camera lifecycle, the hand trail controller, and the remaining flower-only command flow. The DOM gets one canvas overlay and one compact status row.

**Tech Stack:** Browser ES modules, MediaPipe Tasks Vision, canvas 2D, Node test runner.

---

### Task 1: Hand Trail Core Module

**Files:**
- Create: `src/hands.js`
- Create: `tests/hands.test.js`

- [ ] **Step 1: Write tests for open-palm detection, track cleanup, and toggle debounce**

```js
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

test('controller toggles only after stable open palm duration', () => {
  const statuses = [];
  const controller = createIndexFingerTrailController({
    video: { videoWidth: 640, videoHeight: 480 },
    canvas: null,
    status: { textContent: '', dataset: {} },
    createHandLandmarker: async () => null,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    onStatusChange: (state) => statuses.push(state),
    now: () => 0
  });

  const points = openPalmLandmarks();
  controller.processLandmarks(points, 1000);
  assert.equal(controller.isRecording(), false);
  controller.processLandmarks(points, 1500);
  assert.equal(controller.isRecording(), true);
  controller.processLandmarks(points, 1700);
  assert.equal(controller.isRecording(), true);
  controller.processLandmarks(points, 2200);
  assert.equal(controller.isRecording(), false);
  assert.deepEqual(statuses, ['waiting', 'recording', 'paused']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/hands.test.js`
Expected: FAIL because `src/hands.js` does not exist.

- [ ] **Step 3: Implement `src/hands.js`**

```js
const MEDIAPIPE_VERSION = '0.10.35';
const MEDIAPIPE_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const INDEX_TIP = 8;
const TRAIL_RETENTION_MS = 5000;
const OPEN_PALM_HOLD_MS = 500;

function setStatus(status, text, state) {
  if (!status) return;
  status.textContent = text;
  if (status.dataset) {
    status.dataset.state = state;
  }
}

function hasPoint(landmarks, index) {
  return Number.isFinite(landmarks?.[index]?.x) && Number.isFinite(landmarks?.[index]?.y);
}

function isFingerExtended(landmarks, tip, pip) {
  return hasPoint(landmarks, tip) && hasPoint(landmarks, pip) && landmarks[tip].y < landmarks[pip].y;
}

function isThumbExtended(landmarks) {
  if (!hasPoint(landmarks, 4) || !hasPoint(landmarks, 2) || !hasPoint(landmarks, 5) || !hasPoint(landmarks, 17)) {
    return false;
  }

  const palmCenterX = (landmarks[5].x + landmarks[17].x) / 2;
  return Math.abs(landmarks[4].x - palmCenterX) > Math.abs(landmarks[2].x - palmCenterX);
}

export function isOpenPalm(landmarks) {
  return Array.isArray(landmarks)
    && landmarks.length >= 21
    && isThumbExtended(landmarks)
    && isFingerExtended(landmarks, 8, 6)
    && isFingerExtended(landmarks, 12, 10)
    && isFingerExtended(landmarks, 16, 14)
    && isFingerExtended(landmarks, 20, 18);
}

export function getIndexFingerTip(landmarks) {
  if (!hasPoint(landmarks, INDEX_TIP)) {
    return null;
  }

  return {
    x: landmarks[INDEX_TIP].x,
    y: landmarks[INDEX_TIP].y
  };
}

export function pruneTrailPoints(points, timestamp, retentionMs = TRAIL_RETENTION_MS) {
  return points.filter((point) => timestamp - point.timestamp <= retentionMs);
}

export async function createMediaPipeHandLandmarker({
  importVisionTasks = (url) => import(url)
} = {}) {
  const { FilesetResolver, HandLandmarker } = await importVisionTasks(MEDIAPIPE_MODULE_URL);
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
  const landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HAND_MODEL_URL
    },
    numHands: 1,
    runningMode: 'VIDEO'
  });

  return {
    detect(videoFrame, timestamp) {
      return landmarker.detectForVideo(videoFrame, timestamp).landmarks || [];
    }
  };
}

export function createIndexFingerTrailController({
  video,
  canvas,
  status,
  createHandLandmarker = createMediaPipeHandLandmarker,
  now = () => globalThis.performance?.now?.() || Date.now(),
  requestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelAnimationFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  onStatusChange = () => {}
}) {
  let detector = null;
  let detectorPromise = null;
  let frameId = null;
  let recording = false;
  let openPalmSince = null;
  let lastToggleAt = -Infinity;
  let trailPoints = [];
  let lastVideoTime = -1;
  const context = canvas?.getContext?.('2d') || null;

  function updateStatus(text, state) {
    setStatus(status, text, state);
    onStatusChange(state);
  }

  function sizeCanvas() {
    if (!canvas || !video) return;
    const width = video.videoWidth || video.clientWidth || 0;
    const height = video.videoHeight || video.clientHeight || 0;
    if (width && height && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function draw(timestamp = now()) {
    if (!context || !canvas) return;
    sizeCanvas();
    context.clearRect(0, 0, canvas.width, canvas.height);
    trailPoints = pruneTrailPoints(trailPoints, timestamp);

    if (trailPoints.length < 2) return;

    for (let index = 1; index < trailPoints.length; index += 1) {
      const previous = trailPoints[index - 1];
      const current = trailPoints[index];
      const age = timestamp - current.timestamp;
      const alpha = Math.max(0, 1 - (age / TRAIL_RETENTION_MS));
      context.strokeStyle = `rgba(255, 230, 92, ${alpha})`;
      context.lineWidth = 5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(current.x, current.y);
      context.stroke();
    }
  }

  function addIndexPoint(landmarks, timestamp) {
    const tip = getIndexFingerTip(landmarks);
    if (!tip || !canvas) return;
    sizeCanvas();
    trailPoints.push({
      x: tip.x * canvas.width,
      y: tip.y * canvas.height,
      timestamp
    });
  }

  function processLandmarks(landmarks, timestamp = now()) {
    const openPalm = isOpenPalm(landmarks);
    if (openPalm) {
      openPalmSince ??= timestamp;
      if (timestamp - openPalmSince >= OPEN_PALM_HOLD_MS && timestamp - lastToggleAt >= OPEN_PALM_HOLD_MS) {
        recording = !recording;
        lastToggleAt = timestamp;
        updateStatus(recording ? '轨迹记录中' : '五指张开已暂停', recording ? 'recording' : 'paused');
      }
    } else {
      openPalmSince = null;
      if (recording) {
        addIndexPoint(landmarks, timestamp);
      }
    }

    trailPoints = pruneTrailPoints(trailPoints, timestamp);
    draw(timestamp);
  }

  async function getDetector() {
    if (detector) return detector;
    if (!detectorPromise) {
      updateStatus('正在加载手势识别模型', 'loading');
      detectorPromise = createHandLandmarker()
        .then((createdDetector) => {
          detector = createdDetector;
          updateStatus('等待五指张开开始', 'waiting');
          return detector;
        })
        .catch(() => {
          detectorPromise = null;
          updateStatus('手势识别不可用', 'error');
          return null;
        });
    }
    return detectorPromise;
  }

  async function tick() {
    const timestamp = now();
    const activeDetector = await getDetector();
    if (activeDetector && video?.videoWidth && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const hands = activeDetector.detect(video, timestamp);
      processLandmarks(hands?.[0] || null, timestamp);
    } else {
      draw(timestamp);
    }

    if (requestAnimationFrame) {
      frameId = requestAnimationFrame(tick);
    }
  }

  return {
    start() {
      updateStatus('等待五指张开开始', 'waiting');
      if (requestAnimationFrame && frameId === null) {
        frameId = requestAnimationFrame(tick);
      }
    },
    stop() {
      if (frameId !== null && cancelAnimationFrame) {
        cancelAnimationFrame(frameId);
      }
      frameId = null;
      recording = false;
      openPalmSince = null;
      trailPoints = [];
      draw();
      updateStatus('手势识别已停止', 'idle');
    },
    processLandmarks,
    isRecording() {
      return recording;
    },
    getTrailPoints() {
      return [...trailPoints];
    }
  };
}
```

- [ ] **Step 4: Run hand tests**

Run: `npm test -- tests/hands.test.js`
Expected: PASS.

### Task 2: Simplify Commands To Flower Only

**Files:**
- Modify: `src/voice-commands.js`
- Modify: `tests/voice-commands.test.js`
- Modify: `src/effects.js`
- Modify: `tests/effects.test.js`

- [ ] **Step 1: Update tests so only flower commands parse or trigger**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand } from '../src/voice-commands.js';

test('parses flower effect command', () => {
  assert.deepEqual(parseVoiceCommand('在我头上开花'), {
    type: 'effect',
    effect: 'flower',
    label: '开花'
  });
});

test('ignores removed extra commands', () => {
  assert.equal(parseVoiceCommand('拍照'), null);
  assert.equal(parseVoiceCommand('放大画面'), null);
  assert.equal(parseVoiceCommand('显示字幕'), null);
  assert.equal(parseVoiceCommand('隐藏字幕'), null);
  assert.equal(parseVoiceCommand('下雪'), null);
  assert.equal(parseVoiceCommand('爱心'), null);
});
```

- [ ] **Step 2: Run command tests to verify failure before edit**

Run: `npm test -- tests/voice-commands.test.js`
Expected: FAIL while removed commands still parse.

- [ ] **Step 3: Keep only flower parsing and flower effect**

Use `parseVoiceCommand` to return only flower effect commands. In `src/effects.js`, keep flower generation and remove snow/heart branches.

- [ ] **Step 4: Run command and effect tests**

Run: `npm test -- tests/voice-commands.test.js tests/effects.test.js`
Expected: PASS.

### Task 3: Wire Canvas Overlay And Remove Extra UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Modify: `tests/app.test.js`
- Modify: `tests/styles.test.js`

- [ ] **Step 1: Add expected DOM tests**

Update app/UI tests to assert:
- `[data-hand-trails]` exists.
- `[data-hand-status]` exists.
- `[data-snapshot-preview]` does not exist.
- camera size voice commands are not present.

- [ ] **Step 2: Run app/style tests to verify failure before edit**

Run: `npm test -- tests/app.test.js tests/styles.test.js`
Expected: FAIL because hand trail DOM is not wired yet.

- [ ] **Step 3: Update markup and app wiring**

In `index.html`, add canvas and status:

```html
<canvas class="hand-trail-layer" data-hand-trails aria-hidden="true"></canvas>
<div class="hand-status" data-hand-status data-state="idle" role="status" aria-live="polite">
  等待五指张开开始
</div>
```

Remove snapshot preview and extra command language. In `src/app.js`, import `createIndexFingerTrailController`, create it with `video`, canvas, and hand status, start it after camera starts, stop it with camera stop and before unload. Remove snapshot and camera size command branches.

- [ ] **Step 4: Update styles**

Style `.hand-trail-layer` as an absolute overlay that matches the video frame. Style `.hand-status` as a small readable badge over the preview without covering captions.

- [ ] **Step 5: Run app/style tests**

Run: `npm test -- tests/app.test.js tests/styles.test.js`
Expected: PASS.

### Task 4: Full Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Start local server**

Run: `npm start`
Expected: server prints local URL from `server.js`.

- [ ] **Step 3: Manual browser verification**

Open local URL, allow camera, confirm:
- Five fingers open starts recording.
- Moving index finger draws one yellow trail.
- Trail fades after 5 seconds.
- Five fingers open again pauses recording.
- Flower effect still works.
- Removed commands no longer trigger.
