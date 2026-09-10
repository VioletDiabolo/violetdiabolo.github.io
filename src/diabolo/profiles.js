import { Vector2 } from 'three';

/** Ordered top to bottom. The scroll choreography relies on this order. */
export const PART_IDS = Object.freeze([
  'cupTop', 'gasketTop', 'hubConeTop', 'axleBearing', 'hubConeBottom', 'gasketBottom', 'cupBottom',
]);

/**
 * Silhouette constants, in scene units. Tune these against the reference photo —
 * nothing outside this module encodes the shape.
 */
export const DIMS = Object.freeze({
  neckRadius: 0.14,
  rimRadius: 1.0,
  cupHeight: 0.86,
  gasketRadius: 0.19,
  gasketThickness: 0.045,
  hubHeight: 0.3,
  bearingRadius: 0.075,
  bearingHeight: 0.26,
});

/** Shape exponents: <1 flares late (concave), >1 flares early (convex/cone-like). */
const RADIUS_EASE = 0.62;
const HEIGHT_EASE = 1.28;

/**
 * Half-profile of one cup, revolved about +Y.
 * Index 0 is the axle neck (y = 0); the last index is the outer rim (y = cupHeight).
 */
export function cupProfile(segments = 96) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = DIMS.neckRadius + (DIMS.rimRadius - DIMS.neckRadius) * Math.pow(t, RADIUS_EASE);
    const y = DIMS.cupHeight * Math.pow(t, HEIGHT_EASE);
    pts.push(new Vector2(radius, y));
  }
  return pts;
}

/** Thin ring seated on the cup's neck — the cyan gasket in the reference photo. */
export function gasketProfile() {
  const r = DIMS.gasketRadius;
  const h = DIMS.gasketThickness;
  const inner = DIMS.neckRadius * 0.92;
  return [
    new Vector2(inner, 0),
    new Vector2(r, 0),
    new Vector2(r, h),
    new Vector2(inner, h),
    new Vector2(inner, 0),
  ];
}

/** Black cone tapering from the cup neck down to the bearing. */
export function hubConeProfile() {
  const pts = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = DIMS.neckRadius * (1 - t) + DIMS.bearingRadius * t;
    pts.push(new Vector2(radius, DIMS.hubHeight * t));
  }
  return pts;
}

/** Chrome spool at the centre — the narrowest part of the assembly. */
export function bearingProfile() {
  const r = DIMS.bearingRadius;
  const h = DIMS.bearingHeight;
  const lip = r * 1.18;
  return [
    new Vector2(0, 0),
    new Vector2(lip, 0),
    new Vector2(lip, h * 0.08),
    new Vector2(r, h * 0.16),
    new Vector2(r, h * 0.84),
    new Vector2(lip, h * 0.92),
    new Vector2(lip, h),
    new Vector2(0, h),
  ];
}
