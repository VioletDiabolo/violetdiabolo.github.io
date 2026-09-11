// @vitest-environment jsdom
//
// This file's setup() calls camera.lookAt() once, at construction, and never re-aims —
// it deliberately fixes the camera so these tests can unit-test the projection maths in
// isolation. That does not model stage.js's real render loop, which re-aims the camera
// every frame; tests/stage-spill.dom.test.js composes aimCamera() with createSpill() the
// way render() actually does, and is what covers the real composition.
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Group, Vector3 } from 'three';
import { createSpill } from '../src/diabolo/spill.js';
import { CAMERA_FOV, CAMERA_NEAR_Z } from '../src/diabolo/stage.js';

const setup = () => {
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  const tilt = new Group();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
  camera.position.set(0, 0, CAMERA_NEAR_Z);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrixWorld(true);
  return { container, tilt, camera, spill: createSpill({ container, tilt, camera }) };
};

const spillX = (container) =>
  parseFloat(container.firstElementChild.style.getPropertyValue('--spill-x'));

describe('createSpill', () => {
  it('mounts a single element into the container', () => {
    const { container } = setup();
    expect(container.children).toHaveLength(1);
  });

  it('centres the bloom when the object is centred', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(0, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(spillX(container)).toBeCloseTo(50, 0);
    expect(parseFloat(container.firstElementChild.style.getPropertyValue('--spill-y')))
      .toBeCloseTo(50, 0);
  });

  it('follows the object to the right, which is what couples page to object', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(1.6, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(spillX(container)).toBeGreaterThan(55);
  });

  it('follows the object to the left', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(-1.6, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(spillX(container)).toBeLessThan(45);
  });

  it('expresses position as a percentage, so CSS places it without JS units', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(0.5, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(container.firstElementChild.style.getPropertyValue('--spill-x')).toMatch(/%$/);
  });

  it('does not intercept pointer events', () => {
    const { container } = setup();
    expect(container.firstElementChild.style.pointerEvents).toBe('none');
  });

  it('removes its element on dispose', () => {
    const { container, spill } = setup();
    spill.dispose();
    expect(container.children).toHaveLength(0);
  });
});
