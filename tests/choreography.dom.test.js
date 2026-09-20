// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  createChoreography, ROOMS, PART_RANK, explodedY, LATERAL_SETTLE,
} from '../src/scroll/choreography.js';
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
    const stateAt = (room) => {
      seekTo(timeline, room.end);
      return [
        parts.cupTop.position.y.toFixed(2), tilt.rotation.x.toFixed(2),
        tilt.position.x.toFixed(2), camera.position.z.toFixed(2),
      ].join('|');
    };
    const [hero, panel, showcase, grid] = ROOMS.map(stateAt);
    // The panel is DEFINED to land exactly where the hero did -- the page's panel slides
    // up and covers the object, so animating it there would move something nobody can see
    // (see ROOMS). Naming that pair is the point: counting distinct states alone reported
    // the same 3 whichever two rooms collided, so showcase and grid quietly sharing a
    // state would have passed as this intended repeat. Every other room must differ, or it
    // is scroll distance spent on nothing.
    expect(panel, 'the panel no longer repeats the hero, which is its whole design').toBe(hero);
    expect(new Set([hero, showcase, grid]).size, 'a room other than the panel repeats a state')
      .toBe(3);
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
    let examined = 0;
    const SAMPLES = 400;
    for (let i = 0; i <= SAMPLES; i++) {
      const f = i / SAMPLES;
      timeline.seek(timeline.duration * f);
      const room = ROOMS.find((r) => f <= r.end) ?? ROOMS.at(-1);
      // A centred room has no side for the object to be on, so there is nothing for this
      // measure to say about it -- its own clearance is the vertical sweep's job, below.
      if (room.textSide === 'center') continue;
      examined += 1;
      const visibleWidth = 2 * room.camZ * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * (16 / 10);
      const centre = 0.5 + tilt.position.x / visibleWidth;
      const half = DIMS.rimRadius / visibleWidth;
      const near = room.textSide === 'left' ? centre - half : centre + half;
      if (room.textSide === 'left' ? near < COLUMN : near > 1 - COLUMN) overlapping += 1;
    }
    // Over EXAMINED, not over SAMPLES. The grid room is centred and skipped, so 45% of
    // the sweep can no longer contribute an overlap at all: dividing by the full count
    // would quietly relax the same 8% threshold to the ~15% of the sweep it can actually
    // reach, and it would loosen again every time another room turned centred.
    expect(examined, 'every sample was skipped, so nothing was actually checked')
      .toBeGreaterThan(0);
    expect(overlapping / examined, 'the object spends too long over the text').toBeLessThan(0.08);
  });
});

describe('the closing room clears its centred title', () => {
  const grid = ROOMS.at(-1);
  const gridStart = ROOMS.at(-2).end;
  // The closing room's title is held at top: 18vh -- [data-room='grid'][data-side='center']
  // .room-head in src/styles/sections.css -- so the object's bottom edge has to stay above
  // that line: 100 - 18 = 82% of the viewport clear beneath it, measured from the bottom.
  //
  // This was 66 while that room's column was centred and its title sat in the lower third.
  // The grid pattern moved the title to a sticky column at the top left, which makes the
  // bar strictly harder to clear, not easier: every sample that violated at 66 still
  // violates at 18, and samples that cleared 66 can now fail. It passes for the reason the
  // assertion below states -- the object is GONE, not merely low -- which is also why the
  // horizontal protection the left-hand column now gets (the object is right of centre for
  // the whole fade) is a second line of defence rather than the one being measured here.
  const TITLE_TOP_PCT = 18;
  /** Below this the object is a ghost, and there is genuinely nothing to lay text over. */
  const INVISIBLE = 0.05;
  const SAMPLES = 400;
  const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
  // The object's own top edge, read off the ANIMATED part positions rather than assumed
  // assembled: cupTop's rim sits cupHeight above its group origin, so this is 1.095 when
  // whole and 2.51 at full explode. The grid room opens fully exploded, so the assembled
  // constant the endpoint tests use would understate the overlap by more than a unit.
  const topEdge = ({ tilt, parts }) => tilt.position.y + parts.cupTop.position.y + DIMS.cupHeight;

  it('is laid over that title only while it is fading out', () => {
    // The vertical counterpart of the lateral sweep above, and the only test anywhere that
    // samples the INTERIOR of a centred room. Its endpoint twin cannot do this job: grid's
    // table entry is `opacity: 0`, which at the endpoint is true, so an endpoint test reads
    // "no object to lay text over" and exempts itself. Across the room's interior the
    // object is still fading, still exploded and still dead centre -- which is the state a
    // visitor actually sees. Skipping is therefore keyed to the ANIMATED
    // state.objectOpacity, never to the table's endpoint value.
    const scene = setup();
    let visible = 0;
    let violating = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      const f = gridStart + (grid.end - gridStart) * (i / SAMPLES);
      scene.timeline.seek(scene.timeline.duration * f);
      if (scene.state.objectOpacity < INVISIBLE) continue;
      visible += 1;
      const vh = visibleHalfHeight(scene.camera.position.z);
      const clearBelowPct = 100 * ((vh - topEdge(scene)) / (2 * vh));
      if (clearBelowPct <= 100 - TITLE_TOP_PCT) violating += 1;
    }
    // Unlike the lateral sweep, the denominator is every sample in the room rather than
    // only those examined: a skipped sample here means the object is GONE, which is the
    // pass condition itself, not a sample another room's geometry excuses.
    expect(visible, 'every sample was skipped, so nothing was actually checked')
      .toBeGreaterThan(0);
    expect(violating / SAMPLES, 'the object sits over the closing title for too long')
      .toBeLessThan(0.12);
  });

  it('has faded out by the time it reaches the centre of the frame', () => {
    // Why the room needs no vertical lift: there is nothing left to see by the time the
    // object arrives dead centre. The lateral move takes LATERAL_SETTLE of the room, so
    // the fade has to take less. Once x reaches 0 the object is under the centred column
    // with no horizontal escape left, and anything still visible there is over the title.
    const { timeline, tilt, state } = setup();
    const centred = gridStart + (grid.end - gridStart) * LATERAL_SETTLE;
    seekTo(timeline, centred);
    expect(tilt.position.x, 'the object is not actually centred here').toBeCloseTo(0, 6);
    expect(state.objectOpacity, 'still visible when it reaches the centre')
      .toBeLessThan(INVISIBLE);
  });
});
