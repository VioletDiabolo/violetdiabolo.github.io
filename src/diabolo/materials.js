import {
  CanvasTexture, Color, MeshPhysicalMaterial, MeshStandardMaterial,
  PMREMGenerator, SRGBColorSpace, DoubleSide,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Neck (0) to rim (1). Matches the translucent violet-to-milky cup in the reference photo. */
export const GRADIENT_STOPS = [
  { offset: 0.00, color: '#7b3fd4' },
  { offset: 0.42, color: '#a86ef0' },
  { offset: 0.78, color: '#ddc9f7' },
  { offset: 1.00, color: '#f6f1fb' },
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

export function createEnvironment(renderer) {
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

/**
 * `transmission` is gated to the `high` tier: it forces an extra render pass per
 * frame and is the most expensive single feature on the page.
 */
export function createMaterials({ renderer, tier }) {
  const map = createGradientTexture();
  const env = createEnvironment(renderer);
  const high = tier === 'high';

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

  return { cup, gasket, hub, bearing, _map: map, _env: env };
}

export function disposeMaterials(materials) {
  for (const value of Object.values(materials)) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
}
