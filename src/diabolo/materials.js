import {
  CanvasTexture, Color, MeshPhysicalMaterial, MeshStandardMaterial,
  PMREMGenerator, SRGBColorSpace, DoubleSide,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Neck (0) to rim (1). Matches the translucent violet-to-milky cup in the reference
 * photo.
 *
 * The rim is where the lathed cup has by far the most surface area (radius grows to
 * ~7x the neck radius, and Pappus's theorem says a revolved surface's area scales
 * with radius), so whatever colour sits in the back half of this range dominates what
 * a viewer actually sees. An earlier version reached near-white (#f6f1fb) by the rim
 * and measured only 44% clearly-violet lit pixels, mean RGB (178,160,193) -- pale
 * lavender-grey, not violet. This version holds saturated violet through the middle
 * of the range and only lightens toward a pale (never white) violet at the very rim,
 * which also matters for lit pixels specifically: a specular highlight or clearcoat
 * reflection adds brightness on TOP of this base colour, and a highlight over an
 * already near-white base clips straight to neutral grey/white, while the same
 * highlight over a still-saturated violet keeps a visible violet cast.
 *
 * A first pass (0/0.45/0.80/1.00 -> #4c1d95/#7c3aed/#a78bfa/#e9d5ff) measured 66.9%
 * (mean RGB 159,132,197) -- a big jump from 44.4%, but short of the 70% target. This
 * version pushes the same idea further: richer violet holds through the middle stop
 * (offset moved 0.45 -> 0.50), the "start lightening" stop moves later (0.80 -> 0.85)
 * and is itself less pale (#a78bfa -> #9d6ff0), and the rim stop is a pale violet
 * rather than a near-white one (#e9d5ff -> #d9bdf7). Measured after this change:
 * see materials-tuning notes in task-11-report.md.
 */
export const GRADIENT_STOPS = [
  { offset: 0.00, color: '#4c1d95' },
  { offset: 0.50, color: '#7c3aed' },
  { offset: 0.85, color: '#9d6ff0' },
  { offset: 1.00, color: '#d9bdf7' },
];

export function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
  for (const { offset, color } of GRADIENT_STOPS) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * Returns the PMREM **render target**, not just its texture.
 *
 * `fromScene()` allocates a WebGLRenderTarget with a real framebuffer and depth
 * renderbuffer. Only `WebGLRenderTarget.dispose()` frees those; disposing the bare
 * texture calls `gl.deleteTexture` and leaks the rest. `renderer.dispose()` does not
 * rescue it either — `WebGLProperties.dispose()` swaps in a fresh WeakMap without
 * walking the old one. On a page that tears down and re-inits, that leak is unbounded.
 *
 * The RoomEnvironment scene owns a BoxGeometry and 8 materials and is only needed
 * synchronously, so it is disposed as soon as `fromScene` returns.
 */
export function createEnvironment(renderer) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  return target;
}

/**
 * `transmission` is controlled by `settings.transmission` (from `TIER_SETTINGS`): it
 * forces an extra render pass per frame and is the most expensive single feature on
 * the page.
 */
export function createMaterials({ renderer, settings }) {
  const map = createGradientTexture();
  const envTarget = createEnvironment(renderer);
  const env = envTarget.texture;
  // Driven by TIER_SETTINGS, not re-derived from the tier name, so the two cannot drift.
  const high = settings.transmission;

  const cup = new MeshPhysicalMaterial({
    map,
    envMap: env,
    envMapIntensity: 1.15,
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: high ? 1.0 : 0.88,
    transmission: high ? 0.55 : 0.0,
    thickness: high ? 0.6 : 0.0,
    ior: 1.46,
    side: DoubleSide,
  });

  const gasket = new MeshStandardMaterial({
    color: new Color('#5fd7e8'), envMap: env, roughness: 0.3, metalness: 0.1,
  });

  const hub = new MeshStandardMaterial({
    color: new Color('#131017'), envMap: env, roughness: 0.42, metalness: 0.05,
  });

  const bearing = new MeshStandardMaterial({
    color: new Color('#cfd2d8'), envMap: env, roughness: 0.18, metalness: 1.0,
  });

  // _envTarget, not _env: disposing the target frees its framebuffer AND its texture.
  return { cup, gasket, hub, bearing, _map: map, _envTarget: envTarget };
}

export function disposeMaterials(materials) {
  for (const value of Object.values(materials)) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
}
