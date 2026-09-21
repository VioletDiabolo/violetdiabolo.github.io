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

describe('the closing room is empty for nearly all of its centred title', () => {
  const grid = ROOMS.at(-1);
  const gridStart = ROOMS.at(-2).end;
  /** Below this the object is a ghost, and there is genuinely nothing to lay text over. */
  const INVISIBLE = 0.05;
  const SAMPLES = 400;

  // This block used to be "the closing room clears its centred title", built around a
  // TITLE_TOP_PCT constant (66, later "tightened" to 18) meant to check the object stays
  // clear of the title held at top: 18vh ([data-room='grid'][data-side='center']
  // .room-head, sections.css). It did not check that. Across the room's fade window
  // (state.objectOpacity >= INVISIBLE, which inOutSine ends at 8.56% into the room) camZ
  // only moves 10 -> 9.93, so the object's measured clearance sits at essentially one
  // constant value -- roughly 28% of the viewport clear below its top edge -- at every
  // visible sample. That is below 100 - C for every C the constant was ever set to (66 or
  // 18) and for every C up to ~72, so `violating` was always exactly equal to `visible`
  // (≈35 of 400 samples, 8.75%), and above ~72 it was always exactly 0. Both are under the
  // 0.12 bar the assertion checked -- the test passed for every value the constant could
  // plausibly take, including the ones it never held, which means it was never measuring
  // where the title sits. Lowering 66 to 18 did not make the check stronger; the comment
  // that claimed it did ("samples that cleared 66 can now fail") was wrong -- no visible
  // sample cleared 66 either.
  //
  // What follows checks the one thing the arithmetic above actually supports: the object
  // is visible for only the front slice of the room and gone for the rest. Vertical
  // clearance between the object and the held title is NOT covered by this or by anything
  // else in this suite -- a real answer needs the object's projected on-screen silhouette
  // intersected with the title's box, which is a materially bigger test than this file
  // builds elsewhere, and building a cheap approximation of it is exactly how the removed
  // constant ended up decorating an assertion it had no effect on. See
  // .superpowers/sdd/task-5-fixes-report.md, finding 4.
  it('leaves the object visible for only the front slice of the room, invisible for the rest', () => {
    const scene = setup();
    let visible = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      const f = gridStart + (grid.end - gridStart) * (i / SAMPLES);
      scene.timeline.seek(scene.timeline.duration * f);
      if (scene.state.objectOpacity >= INVISIBLE) visible += 1;
    }
    expect(visible, 'every sample was skipped, so nothing was actually checked')
      .toBeGreaterThan(0);
    expect(visible / SAMPLES, 'the object stays visible for too much of the closing room')
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
