// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Group, Vector3 } from 'three';
import { createSpill } from '../src/diabolo/spill.js';
import { aimCamera, CAMERA_FOV } from '../src/diabolo/stage.js';

/**
 * Mirrors what stage.render() does each frame: aim the camera, then let the overlay
 * project. Testing the overlay against a hand-fixed camera cannot catch an aim target
 * that cancels the projection.
 */
const frame = (camera, tilt, spill) => {
  aimCamera(camera, new Vector3(0, 0, 0));
  camera.updateMatrixWorld(true);
  tilt.updateMatrixWorld(true);
  spill.render(null, camera);
};

describe('spill under the real render composition', () => {
  const setup = () => {
    const container = document.createElement('div');
    document.body.replaceChildren(container);
    const tilt = new Group();
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(0, 0.15, 7);
    return { container, tilt, camera, spill: createSpill({ container, tilt, camera }) };
  };
  const spillX = (c) => parseFloat(c.firstElementChild.style.getPropertyValue('--spill-x'));

  it('moves the bloom when the object moves, after the camera has been aimed', () => {
    const { container, tilt, camera, spill } = setup();
    tilt.position.set(1.6, 0, 0);
    frame(camera, tilt, spill);
    const right = spillX(container);
    tilt.position.set(-1.6, 0, 0);
    frame(camera, tilt, spill);
    const left = spillX(container);
    expect(right, 'the bloom does not follow the object').toBeGreaterThan(left + 10);
  });

  it('puts the bloom on the same side as the object', () => {
    const { container, tilt, camera, spill } = setup();
    tilt.position.set(1.6, 0, 0);
    frame(camera, tilt, spill);
    expect(spillX(container)).toBeGreaterThan(55);
    tilt.position.set(-1.6, 0, 0);
    frame(camera, tilt, spill);
    expect(spillX(container)).toBeLessThan(45);
  });

  it('keeps the bloom on the page even for an object outside the frustum', () => {
    const { container, tilt, camera, spill } = setup();
    tilt.position.set(40, 0, 0);
    frame(camera, tilt, spill);
    const x = spillX(container);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(100);
  });
});
