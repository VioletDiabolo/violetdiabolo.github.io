import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { buildDiabolo } from './build.js';
import { createMaterials, disposeMaterials } from './materials.js';

export const TIER_SETTINGS = Object.freeze({
  high: { dpr: 2.0, segments: 128, transmission: true },
  base: { dpr: 1.5, segments: 64, transmission: false },
});

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

const IDLE_SPIN = 0.22;            // radians/sec for the whole assembly
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
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.4);
  camera.lookAt(0, 0, 0);

  const materials = createMaterials({ renderer, settings });
  const { root, parts } = buildDiabolo({ materials, segments: settings.segments });
  scene.add(root);
  scene.environment = materials._envTarget.texture;

  /** anime.js writes this scalar; the render loop reads it. Never the reverse. */
  const state = { spinRate: 1 };
  const spinMesh = parts.axleBearing.userData.spinMesh;

  function render(deltaSeconds) {
    const spin = rotationDeltas(deltaSeconds, state.spinRate);
    root.rotation.y += spin.root;
    spinMesh.rotation.y += spin.bearing;
    renderer.render(scene, camera);
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

    // Repaint immediately. setSize() clears the drawing buffer, and on the
    // reduced-motion path no loop exists to redraw — the canvas would stay blank.
    renderer.render(scene, camera);
  }

  function dispose() {
    root.traverse((o) => o.geometry?.dispose());
    disposeMaterials(materials);
    renderer.dispose();
  }

  resize();
  return { renderer, scene, camera, root, parts, state, render, resize, dispose };
}
