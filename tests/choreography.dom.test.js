// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createChoreography, HERO_HOLD, REASSEMBLE_AT, BEAT_DURATION } from '../src/scroll/choreography.js';
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

describe('scroll target validation', () => {
  const build = (position) => {
    const el = document.createElement('div');
    el.style.position = position;
    document.body.append(el);
    return () => createChoreography({ parts: {}, state: { spinRate: 1 }, scrollTarget: el });
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

describe('happy path: a real timeline against real groups', () => {
  // Real Three.js Groups from the real geometry builder are simpler than hand-rolled
  // stubs and exercise the actual .position/.rotation objects anime.js writes in
  // production (Vector3 / Euler instances with numeric x/y/z, not plain objects) --
  // LatheGeometry and Group are pure math/scene-graph, no WebGL context required, so
  // this works fine under jsdom. Materials are never sampled by anime.js, so plain
  // placeholder objects stand in for them.
  function buildScene() {
    const materials = { cup: {}, gasket: {}, hub: {}, bearing: {} };
    const { parts } = buildDiabolo({ materials, segments: 24 });
    const state = { spinRate: 1 };
    const scrollTarget = document.createElement('div');
    document.body.append(scrollTarget);
    return { parts, state, scrollTarget };
  }

  it('schedules a hero hold, an explode cascade, and a reassembly, then disposes cleanly', () => {
    const { parts, state, scrollTarget } = buildScene();
    const { timeline, dispose } = createChoreography({ parts, state, scrollTarget });

    // The reassembly beat is the last thing added to the timeline, so its own duration
    // (BEAT_DURATION, from the timeline's `defaults`) is what the whole timeline ends on.
    expect(timeline.duration).toBe(REASSEMBLE_AT + BEAT_DURATION);

    timeline.seek(0);
    for (const id of Object.keys(HOME)) {
      expect(parts[id].position.y, `${id} not at HOME before the hero hold`).toBeCloseTo(HOME[id].y, 5);
    }

    // cupTop is the first beat (index 0), scheduled at HERO_HOLD; by HERO_HOLD +
    // BEAT_DURATION its own animation has fully played out.
    timeline.seek(HERO_HOLD + BEAT_DURATION);
    expect(parts.cupTop.position.y).not.toBeCloseTo(HOME.cupTop.y, 2);

    // The reassembly actually lands: every part is back at HOME once the timeline ends.
    timeline.seek(timeline.duration);
    for (const id of Object.keys(HOME)) {
      expect(parts[id].position.y, `${id} did not reassemble to HOME`).toBeCloseTo(HOME[id].y, 5);
      expect(parts[id].rotation.x, `${id} did not reassemble its rotation`).toBeCloseTo(0, 5);
      expect(parts[id].rotation.z, `${id} did not reassemble its rotation`).toBeCloseTo(0, 5);
    }

    // Reversible: scrolling back up returns to the assembled hero state.
    timeline.seek(0);
    for (const id of Object.keys(HOME)) {
      expect(parts[id].position.y, `${id} did not reverse back to HOME`).toBeCloseTo(HOME[id].y, 5);
    }

    expect(() => dispose()).not.toThrow();
  });
});
