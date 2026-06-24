const CENTER_ANCHOR = { x: 50, y: 50 };
const MEDIAPIPE_VERSION = '0.10.35';
const MEDIAPIPE_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value) {
  return Math.round(value);
}

function getBoxValue(box, name) {
  return typeof box?.[name] === 'number' ? box[name] : 0;
}

function getBoxCoordinate(box, name, originName) {
  if (typeof box?.[name] === 'number') {
    return box[name];
  }

  return typeof box?.[originName] === 'number' ? box[originName] : null;
}

function normalizeBoundingBox(box) {
  const x = getBoxCoordinate(box, 'x', 'originX');
  const y = getBoxCoordinate(box, 'y', 'originY');
  const width = getBoxValue(box, 'width');
  const height = getBoxValue(box, 'height');

  if (x === null || y === null || !width || !height) {
    return null;
  }

  return { x, y, width, height };
}

function findLargestFace(faces) {
  return [...faces].sort((a, b) => {
    const aBox = a.boundingBox || {};
    const bBox = b.boundingBox || {};
    return (getBoxValue(bBox, 'width') * getBoxValue(bBox, 'height'))
      - (getBoxValue(aBox, 'width') * getBoxValue(aBox, 'height'));
  })[0];
}

export function getHeadAnchorFromFace({
  boundingBox,
  videoWidth,
  videoHeight,
  mirrorX = true
}) {
  const box = normalizeBoundingBox(boundingBox);

  if (!box || !videoWidth || !videoHeight) {
    return CENTER_ANCHOR;
  }

  const centerX = ((box.x + (box.width / 2)) / videoWidth) * 100;
  const headY = ((box.y - (box.height * 0.2)) / videoHeight) * 100;

  return {
    x: roundPercent(clamp(mirrorX ? 100 - centerX : centerX, 4, 96)),
    y: roundPercent(clamp(headY, 6, 94))
  };
}

export async function createMediaPipeFaceDetector({
  importVisionTasks = (url) => import(url)
} = {}) {
  const { FaceDetector, FilesetResolver } = await importVisionTasks(MEDIAPIPE_MODULE_URL);
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
  const detector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_MODEL_URL
    },
    minDetectionConfidence: 0.35,
    runningMode: 'VIDEO'
  });

  return {
    detect(videoFrame, timestamp) {
      return detector.detectForVideo(videoFrame, timestamp).detections || [];
    }
  };
}

export function createFaceAnchorDetector({
  FaceDetector,
  video,
  fallback = CENTER_ANCHOR,
  mirrorX = true,
  createModelDetector,
  now = () => globalThis.performance?.now?.() || Date.now(),
  sampleFrameCount = 5,
  sampleDelayMs = 80,
  wait = (ms) => new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  })
}) {
  let detector = null;
  let modelDetector = null;
  let modelDetectorPromise = null;
  let status = {
    state: 'idle',
    message: '人脸检测准备中'
  };

  try {
    detector = FaceDetector
      ? new FaceDetector({ fastMode: true, maxDetectedFaces: 3 })
      : null;
  } catch {
    detector = null;
  }

  const modelDetectorFactory = createModelDetector === undefined
    ? (FaceDetector ? null : createMediaPipeFaceDetector)
    : createModelDetector;

  if (detector) {
    status = {
      state: 'ready',
      message: '已启用浏览器人脸检测'
    };
  } else if (modelDetectorFactory) {
    status = {
      state: 'idle',
      message: '将使用模型人脸检测'
    };
  } else {
    status = {
      state: 'unavailable',
      message: '人脸检测不可用，已使用画面中心'
    };
  }

  async function getDetector() {
    if (detector) {
      return detector;
    }

    if (!modelDetectorFactory) {
      return null;
    }

    if (modelDetector) {
      return modelDetector;
    }

    if (!modelDetectorPromise) {
      status = {
        state: 'loading',
        message: '正在加载人脸检测模型'
      };
      modelDetectorPromise = modelDetectorFactory()
        .then((createdDetector) => {
          modelDetector = createdDetector;
          status = {
            state: 'ready',
            message: '已启用模型人脸检测'
          };
          return modelDetector;
        })
        .catch(() => {
          modelDetectorPromise = null;
          status = {
            state: 'unavailable',
            message: '人脸检测加载失败，已使用画面中心'
          };
          return null;
        });
    }

    return modelDetectorPromise;
  }

  async function findFaceAcrossNearbyFrames(activeDetector) {
    const attempts = Math.max(1, sampleFrameCount);

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const faces = await activeDetector.detect(video, now());
      const face = findLargestFace(faces || []);
      if (face?.boundingBox) {
        return face;
      }

      if (attempt < attempts - 1 && sampleDelayMs > 0) {
        await wait(sampleDelayMs);
      }
    }

    return null;
  }

  return {
    isSupported: Boolean(detector),
    getStatus() {
      return status;
    },
    async detect() {
      if (!video?.videoWidth || !video?.videoHeight) {
        status = {
          state: 'fallback',
          message: '摄像头画面还没准备好，已使用画面中心'
        };
        return fallback;
      }

      try {
        const activeDetector = await getDetector();
        if (!activeDetector) {
          return fallback;
        }

        const face = await findFaceAcrossNearbyFrames(activeDetector);
        if (!face?.boundingBox) {
          status = {
            state: 'fallback',
            message: '连续检测多帧仍未检测到人脸，已使用画面中心'
          };
          return fallback;
        }

        status = {
          state: 'detected',
          message: '已定位到人脸'
        };
        return getHeadAnchorFromFace({
          boundingBox: face.boundingBox,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          mirrorX
        });
      } catch {
        status = {
          state: 'fallback',
          message: '人脸检测失败，已使用画面中心'
        };
        return fallback;
      }
    }
  };
}
