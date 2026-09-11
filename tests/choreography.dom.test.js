// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createChoreography, ACTS, PART_RANK, explodedY, FACE_ON_X, PROFILE_X } from '../src/scroll/choreography.js';
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
  const materials = { cup: {}, gasket: {}, hub: {}, bearing: {} };
  return buildDiabolo({ materials, segments: 16 });
}

describe('scroll target validation', () => {
  const build = (position) => {
    const el = document.createElement('div');
    el.style.position = position;
    document.body.append(el);
    const { tilt, parts } = buildScene();
    const state = { spinRate: 1, labelOpacity: 0 };
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

describe('acts', () => {
  const setup = () => {
    const target = document.createElement('div');
    target.style.position = 'static';
    document.body.append(target);
    const { tilt, spinner, parts } = buildDiabolo({
      materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16,
    });
    const state = { spinRate: 1, labelOpacity: 0 };
    const camera = { position: { x: 0, y: 0, z: CAMERA_NEAR_Z } };
    const choreo = createChoreography({ parts, tilt, state, camera, scrollTarget: target });
    return { ...choreo, parts, tilt, spinner, state, camera };
  };
  const at = (tl, f) => tl.seek(tl.duration * f);

  it('reaches a visibly different state at each act boundary', () => {
    const { timeline, parts, tilt, camera } = setup();
    const seen = new Set();
    for (const act of ACTS) {
      at(timeline, act.end);
      seen.add([
        parts.cupTop.position.y.toFixed(2), tilt.rotation.x.toFixed(2),
        tilt.position.x.toFixed(2), camera.position.x.toFixed(2), camera.position.z.toFixed(2),
      ].join('|'));
    }
    expect(seen.size, 'two acts land on the same state').toBe(ACTS.length);
  });

  it('explodes every part simultaneously within the apart act', () => {
    const { timeline, parts } = setup();
    at(timeline, 0.21);
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

  it('recombines while turning, rather than replaying the explosion backwards', () => {
    const { timeline, parts, tilt } = setup();
    at(timeline, 0.42);
    expect(Math.abs(parts.cupTop.position.y - HOME.cupTop.y)).toBeGreaterThan(0.01);
    expect(tilt.rotation.x).toBeGreaterThan(FACE_ON_X + 0.05);
    expect(tilt.rotation.x).toBeLessThan(PROFILE_X - 0.001);
  });

  it('never writes the spinner, which the render loop owns', () => {
    const { timeline, spinner } = setup();
    const before = spinner.rotation.y;
    at(timeline, 0.63);
    expect(spinner.rotation.y).toBe(before);
  });

  it('drives the spin rate from scroll position', () => {
    const { timeline, state } = setup();
    at(timeline, 0.30);
    const whileApart = state.spinRate;
    at(timeline, 0.68);
    expect(state.spinRate, 'spin does not change between acts').toBeGreaterThan(whileApart * 1.5);
  });

  it('keeps the object out of the reading column for nearly the whole scrub', () => {
    // The endpoint-based clearance test in choreography.test.js passes by construction:
    // act boundaries are clean and the tween between them was never sampled.
    const { timeline, tilt } = setup();
    const COLUMN = 0.38;
    let overlapping = 0;
    const SAMPLES = 400;
    for (let i = 0; i <= SAMPLES; i++) {
      const f = i / SAMPLES;
      timeline.seek(timeline.duration * f);
      const act = ACTS.find((a) => f <= a.end) ?? ACTS.at(-1);
      if (act.textSide === 'center') continue;
      const visibleWidth = 2 * act.camZ * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * (16 / 10);
      const centre = 0.5 + tilt.position.x / visibleWidth;
      const half = DIMS.rimRadius / visibleWidth;
      const near = act.textSide === 'left' ? centre - half : centre + half;
      if (act.textSide === 'left' ? near < COLUMN : near > 1 - COLUMN) overlapping += 1;
    }
    expect(overlapping / SAMPLES, 'the object spends too long over the text').toBeLessThan(0.08);
  });

  it('lifts clear of the closing title for nearly the whole settle act', () => {
    // The vertical counterpart of the test above. arrival never has this problem:
    // entrance.js seeds tilt.position.y to arrival's own target before this timeline
    // exists, so arrival's y tween runs seeded-value-to-itself, a no-op regardless of
    // duration (see entrance.test.js). settle has no such seed — its y genuinely ramps
    // from the previous act's 0 up to 0.6 — and the endpoint-only clearance test in
    // choreography.test.js only ever samples that ramp's un-ramped final state.
    const { timeline, tilt, camera } = setup();
    const settle = ACTS.find((a) => a.id === 'settle');
    const prevEnd = ACTS[ACTS.indexOf(settle) - 1].end;
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const half = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    // [data-side='center'] h1/h2 sit at top: 66vh (sections.css) — the object's bottom
    // edge must clear above that line, i.e. clearBelowPct (percent of viewport clear
    // beneath it, measured from the very bottom) must exceed 100 - 66 = 34.
    const TITLE_TOP_PCT = 66;
    const SAMPLES = 400;
    let violating = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      const f = prevEnd + (settle.end - prevEnd) * (i / SAMPLES);
      timeline.seek(timeline.duration * f);
      const vh = visibleHalfHeight(Math.hypot(camera.position.x, camera.position.z));
      const clearBelowPct = 100 * ((vh + tilt.position.y - half) / (2 * vh));
      if (clearBelowPct <= 100 - TITLE_TOP_PCT) violating += 1;
    }
    expect(violating / SAMPLES, 'the object sits over the closing title for too long').toBeLessThan(0.08);
  });
});
