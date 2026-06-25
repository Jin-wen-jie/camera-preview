import { setStatus } from './utils.js';
import { createPointFilter } from './point-filter.js';

const MEDIAPIPE_VERSION = '0.10.35';
const MEDIAPIPE_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const TRAIL_RETENTION_MS = Infinity;
const MIN_POINT_DISTANCE = 0.002;

function hasPoint(landmarks, index) {
  return Number.isFinite(landmarks?.[index]?.x) && Number.isFinite(landmarks?.[index]?.y);
}

function getDistance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
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

export function isIndexFingerExtended(landmarks) {
  return Array.isArray(landmarks)
    && landmarks.length >= 21
    && isFingerExtended(landmarks, 8, 6)
    && !isFingerExtended(landmarks, 12, 10)
    && !isFingerExtended(landmarks, 16, 14)
    && !isFingerExtended(landmarks, 20, 18)
    && !isOpenPalm(landmarks);
}

export function getNearestHandToCenter(hands) {
  if (!Array.isArray(hands) || !hands.length) {
    return null;
  }

  const center = { x: 0.5, y: 0.5 };
  let nearestHand = null;
  let nearestDistance = Infinity;

  for (const hand of hands) {
    const tip = getIndexFingerTip(hand);
    if (!tip) continue;

    const distance = getDistance(tip, center);
    if (distance < nearestDistance) {
      nearestHand = hand;
      nearestDistance = distance;
    }
  }

  return nearestHand;
}

function resolveActiveHand(landmarks) {
  if (!Array.isArray(landmarks)) {
    return null;
  }

  if (Array.isArray(landmarks[0])) {
    return getNearestHandToCenter(landmarks);
  }

  return landmarks;
}

export function pruneTrailPoints(points, timestamp, retentionMs = TRAIL_RETENTION_MS) {
  return points.filter((point) => point === null || timestamp - point.timestamp <= retentionMs);
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
    numHands: 4,
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
  onStatusChange = () => {},
  onWritingResult = () => {}
}) {
  let detector = null;
  let detectorPromise = null;
  let frameId = null;
  let recording = false;
  let trailPoints = [];
  let strokes = [];
  let currentStroke = null;
  let lastVideoTime = -1;
  let openPalmSince = null;
  const context = canvas?.getContext?.('2d') || null;
  const pointFilter = createPointFilter();
  let lastSmoothedPoint = null;

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

  function drawSegment(segment) {
    if (segment.length < 2) return;

    let prevMidX = segment[0].x;
    let prevMidY = segment[0].y;

    context.strokeStyle = 'rgba(255, 230, 92, 1)';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let i = 1; i < segment.length; i += 1) {
      const previous = segment[i - 1];
      const current = segment[i];
      context.beginPath();

      if (i === 1) {
        context.moveTo(previous.x, previous.y);
        context.lineTo(current.x, current.y);
      } else {
        const midX = (previous.x + current.x) / 2;
        const midY = (previous.y + current.y) / 2;
        context.moveTo(prevMidX, prevMidY);
        context.quadraticCurveTo(previous.x, previous.y, midX, midY);
        prevMidX = midX;
        prevMidY = midY;
      }

      context.stroke();
    }
  }

  function draw() {
    if (!context || !canvas) return;
    sizeCanvas();
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (stroke.length > 0) {
        drawSegment(stroke);
      }
    }
  }

  function addIndexPoint(landmarks, timestamp) {
    const tip = getIndexFingerTip(landmarks);
    if (!tip || !canvas) return;
    sizeCanvas();

    if (!currentStroke) {
      if (trailPoints.length > 0) {
        trailPoints.push(null);
      }
      currentStroke = [];
      strokes.push(currentStroke);
      pointFilter.reset();
      lastSmoothedPoint = null;
    }

    const smoothed = pointFilter.filter(tip.x, tip.y, timestamp);

    if (lastSmoothedPoint) {
      const dx = smoothed.x - lastSmoothedPoint.x;
      const dy = smoothed.y - lastSmoothedPoint.y;
      if (Math.hypot(dx, dy) < MIN_POINT_DISTANCE) return;
    }

    lastSmoothedPoint = { x: smoothed.x, y: smoothed.y };

    const point = {
      x: smoothed.x * canvas.width,
      y: smoothed.y * canvas.height,
      timestamp
    };
    trailPoints.push(point);
    currentStroke.push(point);
  }

  function buildWritingResult(timestamp) {
    const completedStrokes = strokes
      .map((stroke) => stroke.map((point) => ({ ...point })))
      .filter((stroke) => stroke.length > 0);

    if (!completedStrokes.length) {
      return null;
    }

    return {
      source: 'finger-writing',
      text: '',
      strokes: completedStrokes,
      createdAt: timestamp
    };
  }

  function clearTrail(timestamp) {
    const result = buildWritingResult(timestamp);
    if (result) {
      onWritingResult(result);
    }
    recording = false;
    trailPoints = [];
    strokes = [];
    currentStroke = null;
    lastSmoothedPoint = null;
    pointFilter.reset();
    updateStatus('五指张开已输出并清屏', 'cleared');
    draw();
  }

  function pauseRecording() {
    if (!recording) return;
    recording = false;
    currentStroke = null;
    updateStatus('食指收回，已暂停记录', 'paused');
  }

  function updateRecordingState(landmarks) {
    if (isIndexFingerExtended(landmarks)) {
      if (!recording) {
        recording = true;
        updateStatus('食指记录中', 'recording');
      }
      return;
    }

    pauseRecording();
  }

  function processLandmarks(landmarks, timestamp = now()) {
    const activeHand = resolveActiveHand(landmarks);

    if (isOpenPalm(activeHand)) {
      openPalmSince ??= timestamp;
      if (timestamp - openPalmSince >= 500) {
        clearTrail(timestamp);
        openPalmSince = null;
        return;
      }
    } else {
      openPalmSince = null;
    }

    updateRecordingState(activeHand);

    if (recording) {
      addIndexPoint(activeHand, timestamp);
    }

    draw();
  }

  async function getDetector() {
    if (detector) return detector;
    if (!detectorPromise) {
      updateStatus('正在加载手势识别模型', 'loading');
      detectorPromise = createHandLandmarker()
        .then((createdDetector) => {
          detector = createdDetector;
          updateStatus('伸出食指开始记录', 'waiting');
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
    try {
      const timestamp = now();
      const activeDetector = await getDetector();
      try {
        if (activeDetector && video?.videoWidth && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const hands = activeDetector.detect(video, timestamp);
          processLandmarks(hands || null, timestamp);
        }
      } catch {
        // 手势检测异常时忽略，保证渲染不中断
      }
      draw();
    } catch {
      // 即使 draw 异常也不中断循环
    }

    if (requestAnimationFrame) {
      frameId = requestAnimationFrame(tick);
    }
  }

  return {
    start() {
      updateStatus('伸出食指开始记录', 'waiting');
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
      trailPoints = [];
      strokes = [];
      currentStroke = null;
      openPalmSince = null;
      lastSmoothedPoint = null;
      pointFilter.reset();
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
