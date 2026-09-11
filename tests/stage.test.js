import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  resolveQualityTier,
  TIER_SETTINGS,
  rotationDeltas,
  resolveViewport,
  aimCamera,
  CAMERA_FOV,
  CAMERA_NEAR_Z,
} from '../src/diabolo/stage.js';

const HIGH_END = { pointerFine: true, viewportWidth: 1440, deviceMemory: 16 };

describe('resolveQualityTier', () => {
  it('selects high for a wide fine-pointer device with ample memory', () => {
    expect(resolveQualityTier(HIGH_END)).toBe('high');
  });

  it('selects high when deviceMemory is unreported, since many browsers omit it', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: undefined })).toBe('high');
  });

  it('drops to base for a coarse pointer regardless of width', () => {
    expect(resolveQualityTier({ ...HIGH_END, pointerFine: false })).toBe('base');
  });

  it('drops to base below 1024px', () => {
    expect(resolveQualityTier({ ...HIGH_END, viewportWidth: 1023 })).toBe('base');
  });

  it('drops to base on low reported memory', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: 4 })).toBe('base');
  });

  it('defaults to base when signals are missing entirely', () => {
    expect(resolveQualityTier({})).toBe('base');
    expect(resolveQualityTier(undefined)).toBe('base');
  });

  it('enables transmission only on the high tier', () => {
    expect(TIER_SETTINGS.high.transmission).toBe(true);
    expect(TIER_SETTINGS.base.transmission).toBe(false);
  });

  it('caps device pixel ratio lower on the base tier', () => {
    expect(TIER_SETTINGS.base.dpr).toBeLessThan(TIER_SETTINGS.high.dpr);
  });

  it('treats 1024px as wide enough, the exact threshold', () => {
    expect(resolveQualityTier({ ...HIGH_END, viewportWidth: 1024 })).toBe('high');
  });

  it('treats 8GB as enough memory, the exact threshold', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: 8 })).toBe('high');
  });
});

describe('rotationDeltas', () => {
  it('advances both rotations in the same direction', () => {
    const d = rotationDeltas(0.016, 1);
    expect(d.spinner).toBeGreaterThan(0);
    expect(d.bearing).toBeGreaterThan(0);
  });

  it('spins the bearing faster than the body', () => {
    const d = rotationDeltas(0.016, 1);
    expect(d.bearing).toBeGreaterThan(d.spinner);
  });

  it('scales only the bearing with spinRate', () => {
    const slow = rotationDeltas(0.016, 1);
    const fast = rotationDeltas(0.016, 4);
    expect(fast.spinner).toBeCloseTo(slow.spinner, 10);
    expect(fast.bearing).toBeCloseTo(slow.bearing * 4, 10);
  });

  it('produces no rotation for a zero delta', () => {
    const d = rotationDeltas(0, 1);
    expect(d.spinner).toBe(0);
    expect(d.bearing).toBe(0);
  });

  it('spins fast enough to read as motion rather than drift', () => {
    // At least one visible revolution every ~10 seconds.
    expect(rotationDeltas(1, 1).spinner).toBeGreaterThan(0.6);
  });
});

describe('resolveViewport', () => {
  const BASE = { width: 800, height: 400, devicePixelRatio: 3, maxDpr: 2 };

  it('computes aspect as width over height', () => {
    expect(resolveViewport(BASE).aspect).toBeCloseTo(2, 10);
  });

  it('caps pixel ratio at the tier maximum', () => {
    expect(resolveViewport(BASE).pixelRatio).toBe(2);
  });

  it('uses the real pixel ratio when it is below the cap', () => {
    expect(resolveViewport({ ...BASE, devicePixelRatio: 1 }).pixelRatio).toBe(1);
  });

  it('returns null for an unmeasurable box rather than dividing by zero', () => {
    expect(resolveViewport({ ...BASE, width: 0 })).toBeNull();
    expect(resolveViewport({ ...BASE, height: 0 })).toBeNull();
  });
});

describe('aimCamera', () => {
  const forwardOf = (camera) => new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const angleToTarget = (camera, target) =>
    forwardOf(camera).angleTo(target.clone().sub(camera.position).normalize());

  it('points the camera at the target', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(0, 0, CAMERA_NEAR_Z);
    const target = new Vector3(0, 0, 0);
    aimCamera(camera, target);
    expect(angleToTarget(camera, target)).toBeLessThan(1e-6);
  });

  it('tracks an off-centre object, which is what the lateral offset needs', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(0, 0, 7);
    const target = new Vector3(-1.6, 0, 0);
    aimCamera(camera, target);
    expect(angleToTarget(camera, target)).toBeLessThan(1e-6);
  });

  it('still frames the object from the orbit position, which is the whole point', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(4.5, 0, 5.362);
    const target = new Vector3(-1.6, 0, 0);
    aimCamera(camera, target);
    expect(angleToTarget(camera, target)).toBeLessThan(1e-6);
  });

  it('leaves the camera position alone — anime.js owns that', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(4.5, 0, 5.362);
    aimCamera(camera, new Vector3(-1.6, 0, 0));
    expect(camera.position.toArray()).toEqual([4.5, 0, 5.362]);
  });
});

describe('camera aim target', () => {
  it('does not re-centre the object, which would cancel its lateral offset', () => {
    // Aiming at the object puts it on the optical axis, so a lateral offset moves it in
    // world space but not on screen — and anything projecting it reads dead centre.
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(0, 0.15, 7);
    const object = new Vector3(1.6, 0, 0);

    aimCamera(camera, object);
    camera.updateMatrixWorld(true);
    const centred = object.clone().project(camera);
    expect(Math.abs(centred.x), 'aiming at the object pins it to centre').toBeLessThan(1e-6);

    aimCamera(camera, new Vector3(0, 0, 0));
    camera.updateMatrixWorld(true);
    const offset = object.clone().project(camera);
    expect(Math.abs(offset.x), 'aiming at the origin lets the offset show').toBeGreaterThan(0.2);
  });

  it('aims the camera at a fixed origin, never at the object', () => {
    // createStage() needs a real WebGL context, so it never runs under jsdom/vitest —
    // there is no render() to call here and observe. Source inspection is the only route
    // available to pin what the render loop actually passes. That exact bug (aimCamera(
    // camera, tilt.position) instead of AIM_TARGET) shipped on this branch once: it
    // re-centres the object every frame, cancelling the lateral offset the whole
    // composition depends on.
    const source = readFileSync(new URL('../src/diabolo/stage.js', import.meta.url), 'utf8');
    // Excludes the function's own declaration line (`function aimCamera(camera, target)`),
    // which textually matches the same shape purely because its parameter is also named
    // `camera` — the call site inside render() is what actually matters here.
    const aimCall = source.match(/(?<!function )aimCamera\(camera,\s*([^)]+)\)/);
    expect(aimCall, 'no aimCamera call found in the render loop').not.toBeNull();
    expect(aimCall[1].trim()).toBe('AIM_TARGET');
  });
});

describe('overlay disposal', () => {
  it('disposes every registered overlay when the stage disposes, so their DOM subtrees do not leak', () => {
    // createStage() needs a real WebGL context, so it never runs under jsdom/vitest —
    // same constraint as the aimCamera guard above, so source inspection is again the
    // only route available. dispose() already frees geometry, materials and the
    // renderer but, unlike render() and resize() just above it (both of which already
    // loop `for (const overlay of overlays)`), never iterated overlays at all — leaking
    // the CSS3D label subtree and the spill element's DOM node on every teardown.
    const source = readFileSync(new URL('../src/diabolo/stage.js', import.meta.url), 'utf8');
    expect(source).toMatch(/for\s*\(const overlay of overlays\)\s*overlay\.dispose\(\);/);
  });
});
