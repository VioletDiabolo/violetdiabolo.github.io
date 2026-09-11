// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createChoreography, PART_RANK, explodedY, FACE_ON_X, PROFILE_X, SCRUB_DURATION } from '../src/scroll/choreography.js';
import { CAMERA_NEAR_Z, CAMERA_FAR_Z } from '../src/diabolo/stage.js';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';

// jsdom implements neither ResizeObserver nor IntersectionObserver. anime.js's
// ScrollObserver (what onScroll(...) constructs) creates a ResizeObserver
// synchronously the first time it registers a scroll container, so without this stub
// createChoreography's real happy path throws immediately in this environment and only
// its sticky/fixed guard (which returns before onScroll ever runs) is reachable here —
// which is exactly the gap this file exists to close. The stub supplies a missing jsdom
// global; it does not touch, wrap, or weaken createChoreography or onScroll themselves.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Real Three.js Groups from the real geometry builder are simpler than hand-rolled
// stubs and exercise the actual .position/.rotation objects anime.js writes in
// production (Vector3 / Euler instances with numeric x/y/z, not plain objects) --
// LatheGeometry and Group are pure math/scene-graph, no WebGL context required, so
// this works fine under jsdom. Materials are never sampled by anime.js, so plain
// placeholder objects stand in for them.
function buildScene() {
  const materials = { cup: {}, gasket: {}, hub: {}, bearing: {} };
  return buildDiabolo({ materials, segments: 16 });
}

describe('scroll target validation', () => {
  const build = (position) => {
    const el = document.createElement('div');
    el.style.position = position;
    document.body.append(el);
    const { tilt, parts } = buildScene();
    const state = { spinRate: 1 };
    return () => createChoreography({ parts, tilt, state, scrollTarget: el });
  };

  it('refuses a sticky target, whose rect never travels', () => {
    expect(build('sticky')).toThrow(/position:sticky/);
  });

  it('refuses a fixed target for the same reason', () => {
    expect(build('fixed')).toThrow(/position:fixed/);
  });

  it('names the fix in the error, not just the fault', () => {
    expect(build('sticky')).toThrow(/scrolls with the page/);
  });
});

describe('simultaneous explosion', () => {
  const setup = () => {
    const target = document.createElement('div');
    target.style.position = 'static';
    document.body.append(target);
    const { tilt, spinner, parts } = buildDiabolo({
      materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16,
    });
    // In production, `tilt.rotation.x` is already FACE_ON_X by the time createChoreography
    // runs: entrance.js (Task 4) sets it synchronously and completes before the scroll
    // timeline is ever created. buildDiabolo alone leaves it at Three.js's Group default of
    // 0, so this test establishes the same precondition entrance.js will own in production.
    tilt.rotation.x = FACE_ON_X;
    const state = { spinRate: 1 };
    // A plain stub, not a real Three.js camera: createChoreography only ever tweens
    // camera.position.z, so this is all the shape it needs (same approach as
    // tests/entrance.test.js's stubCamera()).
    const camera = { position: { z: CAMERA_NEAR_Z } };
    const choreo = createChoreography({ parts, tilt, state, camera, scrollTarget: target });
    return { ...choreo, parts, tilt, spinner, state, camera };
  };

  it('has every part in motion at the same time, rather than one after another', () => {
    const { timeline, parts } = setup();
    timeline.seek(SCRUB_DURATION * 0.5);
    for (const id of Object.keys(PART_RANK)) {
      if (id === 'axleBearing') continue;
      const y = parts[id].position.y;
      expect(Math.abs(y - HOME[id].y), `${id} has not started`).toBeGreaterThan(1e-6);
      expect(Math.abs(y - explodedY(id)), `${id} has already finished`).toBeGreaterThan(1e-6);
    }
  });

  it('lands every part on its exploded position at the end', () => {
    const { timeline, parts } = setup();
    timeline.seek(SCRUB_DURATION);
    for (const id of Object.keys(PART_RANK)) {
      expect(parts[id].position.y).toBeCloseTo(explodedY(id), 4);
    }
  });

  it('turns the object from face-on to profile across the same span', () => {
    const { timeline, tilt } = setup();
    timeline.seek(0);
    const atStart = tilt.rotation.x;
    timeline.seek(SCRUB_DURATION);
    expect(tilt.rotation.x).toBeCloseTo(PROFILE_X, 4);
    expect(Math.abs(atStart - tilt.rotation.x)).toBeGreaterThan(0.5);
  });

  it('never writes the spinner, which the render loop owns', () => {
    const { timeline, spinner } = setup();
    const before = spinner.rotation.y;
    timeline.seek(SCRUB_DURATION * 0.7);
    expect(spinner.rotation.y).toBe(before);
  });

  it('dollies the real camera from its near to its far distance across the same span', () => {
    const { timeline, camera } = setup();
    timeline.seek(0);
    expect(camera.position.z).toBeCloseTo(CAMERA_NEAR_Z, 6);
    timeline.seek(SCRUB_DURATION);
    expect(camera.position.z).toBeCloseTo(CAMERA_FAR_Z, 4);
  });
});
