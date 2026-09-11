import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { buildDiabolo } from './build.js';
import { createMaterials, disposeMaterials } from './materials.js';

export const TIER_SETTINGS = Object.freeze({
  high: { dpr: 2.0, segments: 128, transmission: true },
  base: { dpr: 1.5, segments: 64, transmission: false },
});

/** Camera framing. Exported because the scroll choreography dollies between these and
 *  its tests assert the exploded object actually fits the frustum. */
export const CAMERA_FOV = 34;
/** Face-on and assembled: frames the cup disc. */
export const CAMERA_NEAR_Z = 5.4;
/** Profile and fully exploded: the object spans ~5.02 units and needs the room. */
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
    root: IDLE_SPIN * deltaSeconds,
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

export function createStage({ canvas, tier }) {
  const settings = TIER_SETTINGS[tier];

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.position.set(0, 0.15, CAMERA_NEAR_Z);
  camera.lookAt(0, 0, 0);

  const materials = createMaterials({ renderer, settings });
  const { tilt, spinner, parts } = buildDiabolo({ materials, segments: settings.segments });
  scene.add(tilt);
  scene.environment = materials._envTarget.texture;

  /** anime.js writes these scalars; the render loop and overlays only read them. */
  const state = { spinRate: 1, labelOpacity: 0 };
  const spinMesh = parts.axleBearing.userData.spinMesh;

  // Registered post-construction via addOverlay() — see below. Kept local (not on the
  // returned object) so the only way to add one is the seam meant for it.
  const overlays = [];

  function render(deltaSeconds) {
    const spin = rotationDeltas(deltaSeconds, state.spinRate);
    spinner.rotation.y += spin.root;
    spinMesh.rotation.y += spin.bearing;
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
