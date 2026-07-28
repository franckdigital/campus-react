// Client-side exam proctoring: phone detection + face presence, running
// entirely in the student's browser via TensorFlow.js. No account, no API
// key, no per-image network cost. Deliberately narrower than the very first
// version of this module: that one also flagged "any unrecognized object
// near the face" and "a large object filling the frame with no face
// visible" as suspicious, which made an entirely innocent gesture — resting
// a hand on the cheek, scratching an itch, stretching — indistinguishable
// from holding up a phone (both momentarily block the face and put
// *something* right where the face was). Phone detection here now relies
// solely on coco-ssd actually recognizing the object as phone-shaped;
// nothing about merely covering or losing the face counts on its own.
//
// Models are lazy-loaded (dynamic import) so exams without webcam_required
// never pay the ~10MB download cost.

// coco-ssd frequently misclassifies a phone held at close range as "remote"
// (similar rectangular shape/aspect ratio) — treat both as a phone signal.
const PHONE_LABELS = new Set(['cell phone', 'remote']);
const PHONE_SCORE_THRESHOLD = 0.5;

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

// Runs one detection pass on a live <video> element. Returns
// { phoneDetected, faceCount } or null if the models failed to load (e.g.
// no WebGL support) — callers should treat null as "skip this tick" rather
// than a suspicious result. phoneDetected only ever comes from coco-ssd
// confidently naming the object itself — a hand, a face-touching gesture,
// or an empty seat never sets it, however the frame looks geometrically.
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
    const phoneDetected = objects.some(
      o => PHONE_LABELS.has(o.class) && o.score >= PHONE_SCORE_THRESHOLD
    );
    return { phoneDetected, faceCount: faces.length };
  } catch {
    return null;
  }
}
