const CENTER_ANCHOR = { x: 50, y: 50 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value) {
  return Math.round(value);
}

function getBoxValue(box, name) {
  return typeof box?.[name] === 'number' ? box[name] : 0;
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
  if (!boundingBox || !videoWidth || !videoHeight) {
    return CENTER_ANCHOR;
  }

  const centerX = ((boundingBox.x + (boundingBox.width / 2)) / videoWidth) * 100;
  const headY = ((boundingBox.y - (boundingBox.height * 0.2)) / videoHeight) * 100;

  return {
    x: roundPercent(clamp(mirrorX ? 100 - centerX : centerX, 4, 96)),
    y: roundPercent(clamp(headY, 6, 94))
  };
}

export function createFaceAnchorDetector({
  FaceDetector,
  video,
  fallback = CENTER_ANCHOR,
  mirrorX = true
}) {
  let detector = null;

  try {
    detector = FaceDetector
      ? new FaceDetector({ fastMode: true, maxDetectedFaces: 3 })
      : null;
  } catch {
    detector = null;
  }

  return {
    isSupported: Boolean(detector),
    async detect() {
      if (!detector || !video?.videoWidth || !video?.videoHeight) {
        return fallback;
      }

      try {
        const faces = await detector.detect(video);
        const face = findLargestFace(faces || []);
        if (!face?.boundingBox) {
          return fallback;
        }

        return getHeadAnchorFromFace({
          boundingBox: face.boundingBox,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          mirrorX
        });
      } catch {
        return fallback;
      }
    }
  };
}
