// $P Point-Cloud Recognizer for Chinese character "花"
// Based on Vatavu et al., "The $P Point-Cloud Recognizer" (2012)
// Zero external dependencies — pure JavaScript

const TARGET_SIZE = 256;
const RESAMPLE_POINTS = 32;
const MATCH_THRESHOLD = 0.28;
const MIN_STROKES = 3;

// ─── Normalization ────────────────────────────────────────

function boundingBox(strokes) {
  let minX = Infinity; let minY = Infinity;
  let maxX = -Infinity; let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const point of stroke) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function normalizeStrokes(strokes) {
  if (!strokes || !strokes.length) return [];
  const box = boundingBox(strokes);
  const width = box.maxX - box.minX || 1;
  const height = box.maxY - box.minY || 1;
  const scale = TARGET_SIZE / Math.max(width, height);

  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: (point.x - box.minX) * scale,
      y: (point.y - box.minY) * scale
    }))
  );
}

// ─── Resampling (uniform spacing along stroke path) ──────

function pathLength(stroke) {
  let len = 0;
  for (let i = 1; i < stroke.length; i += 1) {
    len += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
  }
  return len;
}

function resampleStroke(stroke, n = RESAMPLE_POINTS) {
  if (stroke.length < 2) return [...stroke];
  const total = pathLength(stroke);
  if (total === 0) return [...stroke];

  const result = [Object.assign({}, stroke[0])];
  const spacing = total / (n - 1);
  let accumulated = 0;
  let sourceIndex = 0;

  while (result.length < n - 1) {
    const targetDist = result.length * spacing;
    while (sourceIndex < stroke.length - 1) {
      const segLen = Math.hypot(
        stroke[sourceIndex + 1].x - stroke[sourceIndex].x,
        stroke[sourceIndex + 1].y - stroke[sourceIndex].y
      );
      if (accumulated + segLen >= targetDist) {
        const t = (targetDist - accumulated) / (segLen || 1);
        result.push({
          x: stroke[sourceIndex].x + t * (stroke[sourceIndex + 1].x - stroke[sourceIndex].x),
          y: stroke[sourceIndex].y + t * (stroke[sourceIndex + 1].y - stroke[sourceIndex].y)
        });
        break;
      }
      accumulated += segLen;
      sourceIndex += 1;
    }
  }
  result.push(Object.assign({}, stroke[stroke.length - 1]));
  return result;
}

function resampleStrokes(strokes) {
  return strokes.map((stroke) => resampleStroke(stroke));
}

// ─── Point-Cloud Distance ($P algorithm) ─────────────────

function cloudDistance(cloudA, cloudB) {
  // Hausdorff-like: average nearest-neighbor distance from A to B
  let sumMinDist = 0;
  for (const pa of cloudA) {
    let minDist = Infinity;
    for (const pb of cloudB) {
      const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (d < minDist) minDist = d;
    }
    sumMinDist += minDist;
  }
  return sumMinDist / cloudA.length;
}

function pointCloudDistance(strokesA, strokesB) {
  const cloudA = strokesA.flat();
  const cloudB = strokesB.flat();
  if (cloudA.length === 0 || cloudB.length === 0) return Infinity;
  // Bidirectional: average of A→B and B→A
  return (cloudDistance(cloudA, cloudB) + cloudDistance(cloudB, cloudA)) / 2;
}

// ─── Template: "花" — standard stroke paths ──────────────

// Based on standard Chinese character structure.
// Template was manually encoded to represent the 7 canonical strokes
// of 花 in a TARGET_SIZE × TARGET_SIZE coordinate space.
// Each stroke is a polyline of key points in writing order.

const FLOWER_TEMPLATE = (() => {
  const S = TARGET_SIZE;
  // Helper: create a stroke from x,y pairs
  const stroke = (pairs) => pairs.map(([x, y]) => ({ x, y }));

  return [
    // Stroke 1: top horizontal (横) of 艹 — left to right
    stroke([[0.10 * S, 0.22 * S], [0.90 * S, 0.22 * S]]),
    // Stroke 2: left vertical (竖) of 艹
    stroke([[0.30 * S, 0.06 * S], [0.30 * S, 0.40 * S]]),
    // Stroke 3: right vertical (竖) of 艹
    stroke([[0.70 * S, 0.06 * S], [0.70 * S, 0.40 * S]]),
    // Stroke 4: left slant (撇) of 亻
    stroke([[0.28 * S, 0.44 * S], [0.20 * S, 0.60 * S], [0.16 * S, 0.72 * S]]),
    // Stroke 5: left vertical (竖) of 亻
    stroke([[0.28 * S, 0.44 * S], [0.28 * S, 0.62 * S]]),
    // Stroke 6: right slant (撇) of 匕
    stroke([[0.52 * S, 0.46 * S], [0.44 * S, 0.58 * S], [0.38 * S, 0.72 * S]]),
    // Stroke 7: vertical-curved-hook (竖弯钩) of 匕
    stroke([
      [0.52 * S, 0.46 * S],
      [0.52 * S, 0.72 * S],
      [0.70 * S, 0.72 * S],
      [0.70 * S, 0.86 * S],
      [0.60 * S, 0.80 * S]
    ])
  ];
})();

const NORMALIZED_FLOWER_TEMPLATE = normalizeStrokes(FLOWER_TEMPLATE.map(
  (stroke) => stroke.map((p) => ({ ...p }))
));

// ─── Recognition API ─────────────────────────────────────

/**
 * Attempt to recognize hand-drawn strokes as a known character.
 * Currently only supports "花".
 *
 * @param {Array<Array<{x:number, y:number}>>} strokes — raw strokes from buildWritingResult
 * @returns {string} recognized text, or '' if no match
 */
export function recognizeStrokes(strokes) {
  if (!strokes || !strokes.length) return '';
  if (strokes.length < MIN_STROKES) return '';

  const userStrokes = resampleStrokes(normalizeStrokes(strokes));
  const distance = pointCloudDistance(userStrokes, NORMALIZED_FLOWER_TEMPLATE);

  if (distance < MATCH_THRESHOLD * TARGET_SIZE) {
    return '花';
  }
  return '';
}
