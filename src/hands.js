const MEDIAPIPE_VERSION = '0.10.35';
const MEDIAPIPE_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const TRAIL_RETENTION_MS = 5000;
const PINCH_START_RATIO = 0.18;
const PINCH_STOP_RATIO = 0.34;
const PINCH_HOLD_MS = 120;

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

function getDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getPalmWidth(landmarks) {
  if (!hasPoint(landmarks, 5) || !hasPoint(landmarks, 17)) {
    return null;
  }

  return getDistance(landmarks[5], landmarks[17]);
}

function isFingerExtended(landmarks, tip, pip) {
  return hasPoint(landmarks, tip)
    && hasPoint(landmarks, pip)
    && landmarks[tip].y < landmarks[pip].y;
}

function isThumbExtended(landmarks) {
  if (
    !hasPoint(landmarks, THUMB_TIP)
    || !hasPoint(landmarks, 2)
    || !hasPoint(landmarks, 5)
    || !hasPoint(landmarks, 17)
  ) {
    return false;
  }

  const palmCenterX = (landmarks[5].x + landmarks[17].x) / 2;
  return Math.abs(landmarks[THUMB_TIP].x - palmCenterX) > Math.abs(landmarks[2].x - palmCenterX);
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

export function getFingerPinchRatio(landmarks) {
  if (!hasPoint(landmarks, THUMB_TIP) || !hasPoint(landmarks, INDEX_TIP)) {
    return Infinity;
  }

  const palmWidth = getPalmWidth(landmarks);
  if (!palmWidth) {
    return Infinity;
  }

  return getDistance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / palmWidth;
}

export function isFingerPinched(landmarks, threshold = PINCH_START_RATIO) {
  return getFingerPinchRatio(landmarks) <= threshold;
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
  let pinchSince = null;
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

  function clearTrail(timestamp) {
    recording = false;
    pinchSince = null;
    trailPoints = [];
    updateStatus('五指张开已清屏', 'cleared');
    draw(timestamp);
  }

  function updateRecordingState(landmarks, timestamp) {
    const pinchRatio = getFingerPinchRatio(landmarks);
    if (pinchRatio <= PINCH_START_RATIO) {
      pinchSince ??= timestamp;
      if (!recording && timestamp - pinchSince >= PINCH_HOLD_MS) {
        recording = true;
        updateStatus('记录中', 'recording');
      }
      return;
    }

    if (pinchRatio >= PINCH_STOP_RATIO) {
      pinchSince = null;
      if (recording) {
        recording = false;
        updateStatus('分开已暂停', 'paused');
      }
    }
  }

  function processLandmarks(landmarks, timestamp = now()) {
    if (isOpenPalm(landmarks)) {
      clearTrail(timestamp);
      return;
    }

    updateRecordingState(landmarks, timestamp);

    if (recording) {
      addIndexPoint(landmarks, timestamp);
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
          updateStatus('捏合开始记录', 'waiting');
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
      updateStatus('捏合开始记录', 'waiting');
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
      pinchSince = null;
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
