import { NoToneMapping, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { buildDiabolo } from './build.js';
import { createMaterials, disposeMaterials, flattenMaterials } from './materials.js';

export const TIER_SETTINGS = Object.freeze({
  high: { dpr: 2.0 },
  base: { dpr: 1.5 },
});

/** Camera framing. Exported because the scroll choreography dollies between these and
 *  its tests assert the exploded object actually fits the frustum. */
export const CAMERA_FOV = 34;
/** Assembled and close: frames the whole object. Kept equal to the hero room's own
 *  camZ (src/scroll/choreography.js ROOMS) -- entrance.js seeds the camera to this
 *  value synchronously, so the very first painted frame already matches the hero's
 *  target instead of dollying in over the first few percent of scroll. If the hero's
 *  camZ ever changes, this must move with it. */
export const CAMERA_NEAR_Z = 6.2;
/** Profile and fully exploded: the object spans ~5.02 units and needs the room. Like
 *  CAMERA_NEAR_Z, kept equal to a ROOMS camZ (the showcase room's) by convention rather
 *  than by import -- the table hardcodes its own literal so it stays plain data (see
 *  ROOMS's own doc comment in choreography.js). No production code reads this constant
 *  itself any more; it now exists purely as the far bound the "keeps the camera between
 *  its near and far distances" test (choreography.test.js) checks every room against. */
export const CAMERA_FAR_Z = 10;

/**
 * Capability signals only — never user-agent sniffing. `base` is the safe default
 * whenever a signal is missing.
 */
export function resolveQualityTier(signals) {
  if (!signals) return 'base';
  const { pointerFine, viewportWidth, deviceMemory } = signals;
  if (pointerFine !== true) return 'base';
  if (!(viewportWidth >= 1024)) return 'base';
  // navigator.deviceMemory is Chromium-only; treating `undefined` as "enough" means
  // Safari and Firefox are gated by pointer and viewport alone.
  if (deviceMemory !== undefined && deviceMemory < 8) return 'base';
  return 'high';
}

export function readSignals() {
  return {
    pointerFine: window.matchMedia('(pointer: fine)').matches,
    viewportWidth: window.innerWidth,
    deviceMemory: navigator.deviceMemory,
  };
}

const IDLE_SPIN = 0.7;             // radians/sec for the whole assembly
const BEARING_SPIN_MULTIPLIER = 6; // the bearing spins faster than the body

/**
 * Pure: the per-frame rotation increments. Extracted from the render closure so the
 * arithmetic is testable without a GPU — a sign error here is invisible until runtime.
 */
export function rotationDeltas(deltaSeconds, spinRate) {
  return {
    spinner: IDLE_SPIN * deltaSeconds,
    bearing: IDLE_SPIN * BEARING_SPIN_MULTIPLIER * spinRate * deltaSeconds,
  };
}

/**
 * Pure: resolves a canvas box and the current DPR into what the renderer and camera
 * should adopt. Returns null when the box is unmeasurable, so callers no-op rather
 * than dividing by zero.
 */
export function resolveViewport({ width, height, devicePixelRatio, maxDpr }) {
  if (!(width > 0) || !(height > 0)) return null;
  return { width, height, aspect: width / height, pixelRatio: Math.min(devicePixelRatio, maxDpr) };
}

/**
 * Point a camera at a target. anime.js owns camera.position; this owns where the camera
 * looks — separate properties, so the two drivers never collide. Which target to pass is
 * the render loop's decision below; see AIM_TARGET for why it is always the world origin.
 */
export function aimCamera(camera, target) {
  camera.lookAt(target);
}

/**
 * The camera always looks at the world origin, never at the object.
 *
 * Aiming at the object would re-centre it every frame: its lateral offset would stop
 * moving it on screen (so it could never clear the reading column) and anything
 * projecting its position through this camera would read dead centre forever. The
 * object's offset is a compositional shift away from the subject point, not a
 * relocation of it.
 */
const AIM_TARGET = new Vector3(0, 0, 0);

export function createStage({ canvas, tier }) {
  const settings = TIER_SETTINGS[tier];

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  // The object is entirely flat, unlit colour (MeshBasicMaterial fills, LineBasicMaterial
  // edges), not lit PBR output. ACES filmic is an HDR display transform: applied here it
  // desaturates and shifts every authored palette value (materials.js's PART_COLORS /
  // EDGE_COLORS are tuned by exact saturation and luminance arithmetic). NoToneMapping
  // passes those colours through untransformed, which is what an unlit object needs.
  renderer.toneMapping = NoToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.position.set(0, 0.15, CAMERA_NEAR_Z);
  camera.lookAt(0, 0, 0);

  const materials = createMaterials();
  // Flattened once, at construction. Materials are SHARED across parts (one cup material
  // for both cups, and so on), so fading the object is eight writes per frame rather than
  // one per mesh. The traversal lives in materials.js, alongside createMaterials and the
  // disposal that has to cover the identical set: a list assembled here by hand would go
  // stale the moment that module added a material under a container key this file had
  // never heard of, and it would go stale silently.
  const materialList = flattenMaterials(materials);
  const { tilt, spinner, parts } = buildDiabolo({ materials });
  scene.add(tilt);

  /** anime.js writes these scalars; the render loop and overlays only read them. */
  const state = { spinRate: 1, labelOpacity: 0, objectOpacity: 1 };
  const spinMesh = parts.axleBearing.userData.spinMesh;

  // Registered post-construction via addOverlay() — see below. Kept local (not on the
  // returned object) so the only way to add one is the seam meant for it.
  const overlays = [];

  function render(deltaSeconds) {
    const spin = rotationDeltas(deltaSeconds, state.spinRate);
    spinner.rotation.y += spin.spinner;
    spinMesh.rotation.y += spin.bearing;
    // anime.js owns state.objectOpacity; this only reads it. Materials are shared across
    // parts, so this is one write per material per frame, not one per mesh.
    for (const material of materialList) material.opacity = state.objectOpacity;
    aimCamera(camera, AIM_TARGET);
    renderer.render(scene, camera);
    for (const overlay of overlays) overlay.render(scene, camera);
  }

  function resize() {
    const view = resolveViewport({
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
      maxDpr: settings.dpr,
    });
    if (view === null) return;
    // Re-applied on every resize, not just at construction: DPR changes when a window
    // moves between displays of different density.
    renderer.setPixelRatio(view.pixelRatio);
    renderer.setSize(view.width, view.height, false);
    camera.aspect = view.aspect;
    camera.updateProjectionMatrix();
    for (const overlay of overlays) overlay.setSize(view.width, view.height);

    // Repaint immediately. setSize() clears the drawing buffer, and on the
    // reduced-motion path no loop exists to redraw — the canvas would stay blank.
    renderer.render(scene, camera);
  }

  function dispose() {
    tilt.traverse((o) => o.geometry?.dispose());
    disposeMaterials(materials);
    renderer.dispose();
    // Mirrors render()'s and resize()'s own loops above: without this, an overlay's DOM
    // subtree (the CSS3D label layer) outlives the stage that owned it.
    for (const overlay of overlays) overlay.dispose();
  }

  resize();
  return {
    renderer, scene, camera, tilt, spinner, parts, state, render, resize, dispose,
    /**
     * Registration seam for renderers that share this scene/camera but live outside
     * WebGL (e.g. the CSS3D label layer in diabolo/labels.js). Called after construction,
     * not wired in here directly: overlays need `parts` from this return value, so
     * building them at construction time would be circular.
     */
    addOverlay(overlay) {
      overlays.push(overlay);
      overlay.setSize(canvas.clientWidth, canvas.clientHeight);
    },
  };
}
