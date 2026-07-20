// Client-side exam proctoring: phone/object + face + gaze detection running
// entirely in the student's browser via TensorFlow.js. No account, no API
// key, no per-image network cost — this is the real-time tripwire; the
// periodic archived snapshot (see ExamPage.jsx) additionally gets a richer
// natural-language description from Gemini server-side, but only every ~30s.
//
// Models are lazy-loaded (dynamic import) so exams without webcam_required
// never pay the ~10MB download cost.

// coco-ssd frequently misclassifies a phone held at close range as "remote"
// (similar rectangular shape/aspect ratio) — treat both as a phone signal.
const PHONE_LABELS = new Set(['cell phone', 'remote']);
const PHONE_SCORE_THRESHOLD = 0.45;
// If no face is visible AND some object fills a large share of the frame,
// that's suspicious on its own even when coco-ssd can't confidently name the
// object (low light, motion blur, an unusual angle right up against the
// lens) — this catches "held a phone in front of the camera" cases that a
// class-label match alone misses.
const LARGE_OBJECT_AREA_RATIO = 0.15;
// Everyday desk/background objects that are expected to sit near a
// student's face at a normal desk setup (monitor, keyboard...) — excluded
// from the "something held up near the face" heuristic below so a normal
// desk doesn't get flagged just for existing.
const BACKGROUND_CLASSES = new Set([
  'chair', 'laptop', 'tvmonitor', 'tv', 'keyboard', 'mouse',
  'dining table', 'couch', 'bed', 'person',
]);
// How far around the face bounding box (as a multiple of its own size) an
// object's center can be and still count as "held near the face" — wider
// vertically to catch something held around chin/chest height.
const FACE_MARGIN_X = 1.2;
const FACE_MARGIN_Y = 1.8;

// Gaze/head-pose heuristic thresholds, derived from blazeface's 6-point
// landmarks (rightEye, leftEye, nose, mouth, rightEar, leftEar). This is a
// coarse geometric approximation, not a real head-pose model — good enough
// to catch a sustained, deliberate turn away from the screen, deliberately
// generous to avoid flagging normal small head movement.
const YAW_RATIO_THRESHOLD = 0.22;  // nose horizontal offset / inter-eye distance
const PITCH_LOW_RATIO = 0.38;      // nose too close to the eye-line -> looking up
const PITCH_HIGH_RATIO = 0.62;     // nose too close to the mouth -> looking down

let modelsPromise = null;

function loadModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/coco-ssd'),
      import('@tensorflow-models/blazeface'),
    ]).then(async ([tf, cocoSsd, blazeface]) => {
      await tf.ready();
      const [objectModel, faceModel] = await Promise.all([
        cocoSsd.load({ base: 'lite_mobilenet_v2' }),
        blazeface.load(),
      ]);
      return { objectModel, faceModel };
    }).catch(err => {
      // Model weights are fetched from a CDN at runtime (not bundled) — a
      // restrictive network/proxy blocking that request fails silently
      // everywhere else in this module by design (callers treat null as
      // "skip this tick"), which would otherwise look identical to "nothing
      // suspicious happened". Surface it once so it's diagnosable from the
      // browser console instead of just being invisible.
      console.warn('[examProctoring] Échec du chargement des modèles TensorFlow.js — détection locale désactivée pour cette session.', err);
      modelsPromise = null;
      throw err;
    });
  }
  return modelsPromise;
}

// Start downloading/warming up the models ahead of time (e.g. while the
// student is on the intro screen) so the first real detection tick during
// the exam isn't delayed by the model fetch.
export function preloadProctoringModels() {
  return loadModels().catch(() => null);
}

// Best-effort left/right/up/down gaze label from a single blazeface
// prediction, or null when the face is roughly centered/frontal. Note: the
// raw camera frame isn't mirrored the way a selfie preview is, so "gauche"/
// "droite" here is from the camera's point of view — it may read as swapped
// from the student's own left/right, but the direction of a *sustained*
// deviation is what matters for flagging, not the exact label.
function estimateGaze(face) {
  const lm = face?.landmarks;
  if (!lm || lm.length < 4) return null;
  const [rightEye, leftEye, nose, mouth] = lm;
  const eyeMidX = (rightEye[0] + leftEye[0]) / 2;
  const eyeMidY = (rightEye[1] + leftEye[1]) / 2;
  const interEyeDist = Math.abs(rightEye[0] - leftEye[0]) || 1;
  const eyeToMouthDist = (mouth[1] - eyeMidY) || 1;

  const yawRatio = (nose[0] - eyeMidX) / interEyeDist;
  if (Math.abs(yawRatio) >= YAW_RATIO_THRESHOLD) {
    return yawRatio > 0 ? 'droite' : 'gauche';
  }

  const pitchRatio = (nose[1] - eyeMidY) / eyeToMouthDist;
  if (pitchRatio <= PITCH_LOW_RATIO) return 'haut';
  if (pitchRatio >= PITCH_HIGH_RATIO) return 'bas';
  return null;
}

// Any non-background object whose center falls within an expanded region
// around the face — catches a phone/paper/note held up near the face even
// when coco-ssd can't confidently name it, not just full-face occlusion.
function objectNearFace(objects, face) {
  if (!face) return false;
  const [fx, fy] = face.topLeft;
  const [fx2, fy2] = face.bottomRight;
  const fw = fx2 - fx, fh = fy2 - fy;
  if (fw <= 0 || fh <= 0) return false;
  const cx = fx + fw / 2, cy = fy + fh / 2;
  const rx = (fw / 2) * FACE_MARGIN_X;
  const ry = (fh / 2) * FACE_MARGIN_Y;
  return objects.some(o => {
    if (BACKGROUND_CLASSES.has(o.class)) return false;
    const [ox, oy, ow, oh] = o.bbox;
    const ocx = ox + ow / 2, ocy = oy + oh / 2;
    return Math.abs(ocx - cx) <= rx && Math.abs(ocy - cy) <= ry;
  });
}

// Runs one detection pass on a live <video> element. Returns
// { phoneDetected, faceCount, gazeAway } or null if the models failed to
// load (e.g. no WebGL support) — callers should treat null as "skip this
// tick" rather than a suspicious result. gazeAway is one of
// 'gauche'/'droite'/'haut'/'bas'/null (null = looking straight at the
// screen, or no single clear face to judge).
export async function analyzeFrame(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null;
  let models;
  try {
    models = await loadModels();
  } catch {
    return null;
  }
  const { objectModel, faceModel } = models;
  try {
    const [objects, faces] = await Promise.all([
      objectModel.detect(videoEl),
      faceModel.estimateFaces(videoEl, false),
    ]);
    const faceCount = faces.length;
    const primaryFace = faces[0] || null;

    const labeledPhone = objects.some(
      o => PHONE_LABELS.has(o.class) && o.score >= PHONE_SCORE_THRESHOLD
    );
    const videoArea = (videoEl.videoWidth || 0) * (videoEl.videoHeight || 0);
    const largeObjectNoFace = faceCount === 0 && videoArea > 0 && objects.some(o => {
      const [, , w, h] = o.bbox;
      return (w * h) / videoArea >= LARGE_OBJECT_AREA_RATIO;
    });
    const nearFace = faceCount === 1 && objectNearFace(objects, primaryFace);

    const gazeAway = faceCount === 1 ? estimateGaze(primaryFace) : null;

    return {
      phoneDetected: labeledPhone || largeObjectNoFace || nearFace,
      faceCount,
      gazeAway,
    };
  } catch {
    return null;
  }
}
