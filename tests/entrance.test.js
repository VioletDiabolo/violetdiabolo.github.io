import { describe, it, expect, vi } from 'vitest';
import {
  ENTRANCE_SCATTER, entranceStartY, createEntrance,
} from '../src/scroll/entrance.js';
import { FACE_ON_X, ACTS } from '../src/scroll/choreography.js';
import { CAMERA_NEAR_Z } from '../src/diabolo/stage.js';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { PART_IDS, DIMS } from '../src/diabolo/profiles.js';

const scene = () => buildDiabolo({
  materials: {
    cup: {}, gasket: {}, hub: {}, bearing: {},
    edge: { cup: {}, gasket: {}, hub: {}, bearing: {} },
  },
  segments: 16,
});
// A plain stub, not a real Three.js camera: createEntrance only ever writes
// camera.position.z, so this is all the shape it needs.
const stubCamera = () => ({ position: { z: 0 } });

describe('entranceStartY', () => {
  it('starts every part further out than it will ever travel', () => {
    for (const id of PART_IDS) {
      expect(Math.abs(entranceStartY(id))).toBeGreaterThan(Math.abs(HOME[id].y));
    }
  });

  it('scatters symmetrically about the centre', () => {
    expect(entranceStartY('cupTop')).toBeCloseTo(-entranceStartY('cupBottom'), 10);
  });

  it('gives even the centre bearing somewhere to come from', () => {
    expect(entranceStartY('axleBearing')).not.toBe(0);
  });

  it('derives from ENTRANCE_SCATTER, so the spread is one number', () => {
    expect(entranceStartY('cupTop')).toBeCloseTo(HOME.cupTop.y + ENTRANCE_SCATTER, 10);
  });

  it('starts every part in front of the camera, not clipped through the near plane', () => {
    // At face-on the scatter runs along world Z toward the camera.
    const nearestApproach = CAMERA_NEAR_Z - (ENTRANCE_SCATTER + HOME.cupTop.y + DIMS.cupHeight);
    expect(nearestApproach).toBeGreaterThan(0.5);
  });
});

describe('createEntrance', () => {
  it('places parts scattered and face-on before it plays', () => {
    const { tilt, parts } = scene();
    const camera = stubCamera();
    createEntrance({ parts, tilt, camera, onComplete: () => {} });
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 6);
    for (const id of PART_IDS) {
      expect(parts[id].position.y).toBeCloseTo(entranceStartY(id), 6);
    }
  });

  it('pins the camera to its near distance synchronously, so a reload mid-page never starts at whatever z the last scrub left behind', () => {
    const { tilt, parts } = scene();
    const camera = stubCamera();
    createEntrance({ parts, tilt, camera, onComplete: () => {} });
    expect(camera.position.z).toBe(CAMERA_NEAR_Z);
  });

  it('seeds tilt.position to the arrival act\'s target synchronously, so the hero title clears the object from the very first frame', () => {
    // Without this, tilt.position sits at the Three.js Group default (0, 0) and the
    // scroll choreography only tweens the lift in gradually across the first 10% of
    // scroll — the hero (and, since skip() shares this seeding, the reduced-motion
    // still) would land the title on top of the object instead of clear of it.
    const arrival = ACTS.find((a) => a.id === 'arrival');
    const { tilt, parts } = scene();
    const camera = stubCamera();
    createEntrance({ parts, tilt, camera, onComplete: () => {} });
    expect(tilt.position.x).toBe(arrival.x);
    expect(tilt.position.y).toBe(arrival.y);
  });

  it('skip() leaves tilt.position at the same arrival target', () => {
    const arrival = ACTS.find((a) => a.id === 'arrival');
    const { tilt, parts } = scene();
    const camera = stubCamera();
    const { skip } = createEntrance({ parts, tilt, camera, onComplete: () => {} });
    skip();
    expect(tilt.position.x).toBe(arrival.x);
    expect(tilt.position.y).toBe(arrival.y);
  });

  it('converges every part onto its rest position by the end', () => {
    const { tilt, parts } = scene();
    const camera = stubCamera();
    const { timeline } = createEntrance({ parts, tilt, camera, onComplete: () => {} });
    timeline.seek(timeline.duration);
    for (const id of PART_IDS) {
      expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 4);
    }
  });

  it('leaves the object face-on when it finishes, so the turn has somewhere to go', () => {
    const { tilt, parts } = scene();
    const camera = stubCamera();
    const { timeline } = createEntrance({ parts, tilt, camera, onComplete: () => {} });
    timeline.seek(timeline.duration);
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 4);
  });

  it('skip() lands the final state immediately and reports completion', () => {
    const { tilt, parts } = scene();
    const camera = stubCamera();
    const onComplete = vi.fn();
    const { skip } = createEntrance({ parts, tilt, camera, onComplete });
    skip();
    for (const id of PART_IDS) expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 4);
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 4);
    expect(camera.position.z).toBe(CAMERA_NEAR_Z);
    expect(onComplete.mock.calls.length).toBe(1);
  });

  it('reports completion exactly once, so the scroll timeline is never built twice', () => {
    const { tilt, parts } = scene();
    const camera = stubCamera();
    const onComplete = vi.fn();
    const { skip } = createEntrance({ parts, tilt, camera, onComplete });
    skip();
    skip();
    expect(onComplete.mock.calls.length).toBe(1);
  });
});
