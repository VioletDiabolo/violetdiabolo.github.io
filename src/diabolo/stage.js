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

const IDLE_SPIN = 0.22; // radians/sec for the whole assembly

export function createStage({ canvas, tier }) {
  const settings = TIER_SETTINGS[tier];

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.dpr));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.4);
  camera.lookAt(0, 0, 0);

  const materials = createMaterials({ renderer, tier });
  const { root, parts } = buildDiabolo({ materials, segments: settings.segments });
  scene.add(root);
  scene.environment = materials._envTarget.texture;

  /** anime.js writes this scalar; the render loop reads it. Never the reverse. */
  const state = { spinRate: 1 };
  const spinMesh = parts.axleBearing.userData.spinMesh;

  function render(deltaSeconds) {
    root.rotation.y += IDLE_SPIN * deltaSeconds;
    spinMesh.rotation.y += IDLE_SPIN * 6 * state.spinRate * deltaSeconds;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    root.traverse((o) => o.geometry?.dispose());
    disposeMaterials(materials);
    renderer.dispose();
  }

  resize();
  return { renderer, scene, camera, root, parts, state, render, resize, dispose };
}
