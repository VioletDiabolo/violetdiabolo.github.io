// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createChoreography, ROOMS, PART_RANK, explodedY } from '../src/scroll/choreography.js';
import { CAMERA_NEAR_Z, CAMERA_FOV } from '../src/diabolo/stage.js';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { DIMS } from '../src/diabolo/profiles.js';

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
  const materials = {
    cup: {}, gasket: {}, hub: {}, bearing: {},
    edge: { cup: {}, gasket: {}, hub: {}, bearing: {} },
  };
  return buildDiabolo({ materials, segments: 16 });
}

const setup = () => {
  const target = document.createElement('div');
  target.style.position = 'static';
  document.body.append(target);
  const { tilt, spinner, parts } = buildScene();
  const state = { spinRate: 1, labelOpacity: 0, objectOpacity: 1 };
  const camera = { position: { x: 0, y: 0, z: CAMERA_NEAR_Z } };
  const choreo = createChoreography({ parts, tilt, state, camera, scrollTarget: target });
  return { ...choreo, parts, tilt, spinner, state, camera };
};
const seekTo = (tl, f) => tl.seek(tl.duration * f);

describe('scroll target validation', () => {
  const build = (position) => {
    const el = document.createElement('div');
    el.style.position = position;
    document.body.append(el);
    const { tilt, parts } = buildScene();
    const state = { spinRate: 1, labelOpacity: 0, objectOpacity: 1 };
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

describe('the explosion is contained', () => {
  const apartness = (parts) => Math.abs(parts.cupTop.position.y - HOME.cupTop.y);

  it('leaves the object assembled before the showcase room', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 0.10);
    expect(apartness(parts)).toBeLessThan(0.02);
  });

  it('pulls it fully apart inside the showcase room', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 0.55);
    expect(parts.cupTop.position.y).toBeCloseTo(explodedY('cupTop'), 3);
  });

  it('puts it back together after the showcase room', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 1.0);
    expect(apartness(parts)).toBeLessThan(0.02);
  });

  it('explodes every part together, not one after another', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 0.43); // mid-showcase
    const moving = Object.keys(PART_RANK).filter((id) => id !== 'axleBearing');
    const progress = (id) => {
      const rest = HOME[id].y, done = explodedY(id);
      return (parts[id].position.y - rest) / (done - rest);
    };
    const first = progress(moving[0]);
    expect(first).toBeGreaterThan(0.05);
    expect(first).toBeLessThan(0.95);
    for (const id of moving) expect(progress(id), `${id} is out of step`).toBeCloseTo(first, 6);
  });

  it('never writes the spinner, which the render loop owns', () => {
    const { timeline, spinner } = setup();
    const before = spinner.rotation.y;
    seekTo(timeline, 0.7);
    expect(spinner.rotation.y).toBe(before);
  });
});

describe('rooms', () => {
  it('reaches a distinct state at each room boundary, bar the panel which repeats the hero', () => {
    const { timeline, parts, tilt, camera } = setup();
    const seen = new Set();
    for (const room of ROOMS) {
      seekTo(timeline, room.end);
      seen.add([
        parts.cupTop.position.y.toFixed(2), tilt.rotation.x.toFixed(2),
        tilt.position.x.toFixed(2), camera.position.z.toFixed(2),
      ].join('|'));
    }
    // Four rooms, three distinct states. The panel is DEFINED to land exactly where the
    // hero did -- the page's panel slides up and covers the object, so animating it there
    // would move something nobody can see (see ROOMS). Every other room must differ, or
    // it is scroll distance spent on nothing.
    expect(seen.size, 'a room other than the panel repeats a state already reached').toBe(3);
  });

  it('drives the spin rate from scroll position', () => {
    const { timeline, state } = setup();
    seekTo(timeline, 0.55); // end of the showcase room, where the labels are read
    const whileApart = state.spinRate;
    seekTo(timeline, 1.0); // end of the grid room
    expect(state.spinRate, 'spin does not change between rooms').toBeGreaterThan(whileApart * 1.5);
  });

  it('fades the object out across the grid room, over the same bridge spinRate uses', () => {
    // anime.js writes state.objectOpacity; the render loop reads it (diabolo/stage.js).
    // The table pinning grid.opacity to 0 says nothing about the timeline actually
    // writing it -- an interface built but never wired is the exact defect this branch
    // shipped once with the edge materials.
    const { timeline, state } = setup();
    seekTo(timeline, 0.55);
    expect(state.objectOpacity, 'the object faded before the grid room').toBeCloseTo(1, 3);
    seekTo(timeline, 1.0);
    expect(state.objectOpacity, 'the object never faded out').toBeCloseTo(0, 3);
  });

  it('keeps the object out of the reading column for nearly the whole scrub', () => {
    // The endpoint-based clearance test in choreography.test.js passes by construction:
    // room boundaries are clean and the tween between them was never sampled.
    const { timeline, tilt } = setup();
    const COLUMN = 0.38;
    let overlapping = 0;
    const SAMPLES = 400;
    for (let i = 0; i <= SAMPLES; i++) {
      const f = i / SAMPLES;
      timeline.seek(timeline.duration * f);
      const room = ROOMS.find((r) => f <= r.end) ?? ROOMS.at(-1);
      if (room.textSide === 'center') continue;
      const visibleWidth = 2 * room.camZ * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * (16 / 10);
      const centre = 0.5 + tilt.position.x / visibleWidth;
      const half = DIMS.rimRadius / visibleWidth;
      const near = room.textSide === 'left' ? centre - half : centre + half;
      if (room.textSide === 'left' ? near < COLUMN : near > 1 - COLUMN) overlapping += 1;
    }
    expect(overlapping / SAMPLES, 'the object spends too long over the text').toBeLessThan(0.08);
  });
});
