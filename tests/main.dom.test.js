// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stubGL } from './helpers/webgl-stub.js';
import { TARGET_FPS } from '../src/render/budget.js';
import { PENDING_CLASS } from '../src/ui/reveal.js';

// jsdom implements no IntersectionObserver, and initReveal() (src/ui/reveal.js) is
// mounted unconditionally in boot() -- before the WebGL branch, per main.js's own
// comment on that ordering -- so its default observerFactory needs the global to exist
// whenever prefersReducedMotion is false. Supplies a missing jsdom global and nothing
// more: it does not touch, wrap or weaken main.js or initReveal, which is what these
// tests measure.
//
// IT REPORTS AN INTERSECTION, which the earlier version of this stub did not. `observe()`
// was a no-op, so createLifecycle's `visible` never became true, `active()` never became
// true, start() never armed a frame, and onFrame -- the one place where Lenis's step, the
// frame cap and the gradient's draw are composed (main.js) -- never ran once in this
// file. The honest `expect(gl.calls.draws).toBe(0)` that recorded this was a limitation
// being written down, not a property being checked: invert the cap's `elapsed > 0`, drop
// the cap call, or hand render() the wrong argument, and nothing here noticed.
//
// Delivery is synchronous inside observe(), which a real IntersectionObserver never is.
// That is deliberate and safe for what this file measures: every consumer (createLifecycle
// and initReveal alike) assigns its `observer` const before calling observe(), so nothing
// here depends on the async gap. It buys determinism -- no test has to wait for an
// entry -- in exchange for not exercising the async ordering, which tests/lifecycle.test.js
// covers through its own injected observer.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserverStub {
    constructor(callback) { this.callback = callback; }
    observe(element) { this.callback([{ target: element, isIntersecting: true }], this); }
    unobserve() {}
    disconnect() {}
  };
}

/**
 * A requestAnimationFrame the test drives by hand.
 *
 * Installed for EVERY test in this file, not just the ones that step it. With the
 * observer above now reporting an intersection, createLifecycle really does arm a frame
 * during boot, and left on jsdom's own rAF that loop would run free on a timer --
 * producing draws at unpredictable moments in tests that are measuring something else.
 * Here nothing advances until a test says so, and `pending()` is how a test asks whether
 * the loop is armed at all.
 */
function stubRaf() {
  const queue = new Map();
  let nextId = 0;
  return {
    raf: (cb) => { const id = ++nextId; queue.set(id, cb); return id; },
    caf: (id) => { queue.delete(id); },
    pending: () => queue.size,
    /** Runs every callback queued right now, with `now` as the timestamp, once. */
    step(now) {
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(now);
      return due.length;
    },
  };
}

// jsdom implements neither matchMedia nor ResizeObserver, and Lenis (Task 4) uses both
// unconditionally inside its own constructor -- window.matchMedia(...) to read
// prefers-reduced-motion, and a ResizeObserver on its content element -- for every real
// (non-stub) instance. main.js's animated path constructs a real Lenis via
// createSmoothScroll() with no LenisCtor override, so these globals need to exist
// whenever that path runs here. Minimal, inert stubs: matchMedia always reports
// `matches: false` and the observer does nothing. Neither touches, wraps, or weakens
// main.js or createSmoothScroll, which is what these tests measure.
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const SECTION_IDS = ['hero', 'about', 'events', 'media', 'board', 'contact'];

/** The current test's hand-driven rAF. Reassigned by the file-level beforeEach. */
let frames;

// Shared by every describe in this file: resets modules so each test's vi.doMock takes
// effect on a fresh import, and rebuilds the body to match index.html's own two
// top-level nodes -- the gradient canvas (Task 3) and #content -- so main.js's
// document.getElementById('gradient') always finds a real element instead of a null
// that would throw inside createGradient.
beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-stage');
  document.body.innerHTML = '<canvas id="gradient" aria-hidden="true"></canvas><main id="content"></main>';
  // main.js only ever assigns window.__vd by spreading whatever was already there
  // (`{ ...(window.__vd ?? {}), gradient, lifecycle }`), so a value left behind by one
  // test would otherwise leak into the next -- most importantly into a test asserting
  // window.__vd stays unset (the reduced-motion path never touches it at all).
  //
  // Deleting the PROPERTY is not enough on its own: a previous test's real Lenis (this
  // file never overrides LenisCtor) attaches its wheel/click listeners to window/document,
  // which persist for the file's whole run regardless of what window.__vd points to --
  // jsdom gives this file one window for every test in it, and replacing document.body's
  // innerHTML does not detach a listener registered on window or document itself. Left
  // undestroyed, a stale Lenis from an earlier test silently intercepts a later test's own
  // dispatched wheel/click events. Harmless to every test that only checks properties of
  // the boot it just ran (gl and frames are always fresh), but exactly the failure mode a
  // test asserting an event was NOT intercepted needs guarded against.
  window.__vd?.smooth?.destroy?.();
  window.__vd?.lifecycle?.dispose?.();
  delete window.__vd;
  // jsdom has no real WebGL implementation; left unmocked it still logs a noisy (but
  // harmless) "Not implemented" error for every getContext('webgl') call. This is the
  // same mock detect.dom.test.js already uses for the "no WebGL" case, and it is
  // genuinely the condition most tests in this file run under -- the "with a working GL
  // context" describe block below overrides this per-test where it needs a real stub.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  // createLifecycle captures `raf`/`caf` from these globals as default parameters, at
  // call time, so this has to be in place before main.js is imported -- which it is:
  // every test in this file imports inside its own body, after this runs.
  frames = stubRaf();
  globalThis.requestAnimationFrame = frames.raf;
  globalThis.cancelAnimationFrame = frames.caf;
});

describe('boot', () => {
  it('renders every section and the nav even when WebGL is unsupported', async () => {
    // The binding constraint this whole task exists to protect: content is never gated
    // behind the graphics. Every section must render with no WebGL at all.
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => false,
      prefersReducedMotion: () => false,
    }));

    await import('../src/main.js');

    for (const id of SECTION_IDS) {
      expect(document.querySelector(`[data-section="${id}"]`), id).not.toBeNull();
    }
    expect(document.querySelector('.site-nav')).not.toBeNull();
    // The one hook Task 3 reuses.
    expect(document.documentElement.dataset.stage).toBe('unsupported');
  });

  it('renders every section and the nav when WebGL is supported but jsdom still has no real context', async () => {
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => false,
    }));

    await import('../src/main.js');

    for (const id of SECTION_IDS) {
      expect(document.querySelector(`[data-section="${id}"]`), id).not.toBeNull();
    }
    expect(document.querySelector('.site-nav')).not.toBeNull();
    // jsdom has no real WebGL context, so createGradient (Task 3) returns null here too
    // -- the quick supportsWebGL() probe above said yes, but the authoritative check
    // inside createGradient still fails, and the page falls back safely rather than
    // throwing. That is a DIFFERENT code path than the 'unsupported' test above (through
    // createGradient's own null return, not the early supportsWebGL() branch), which is
    // what this test exercises now that Task 3 is mounted.
    expect(document.documentElement.dataset.stage).toBe('unsupported');
  });

  it('renders content and the nav before checking WebGL support at all', async () => {
    // "Mounted before any graphics branch" (main.js's own comment) is an ordering
    // guarantee, not just an outcome -- assert supportsWebGL is called only after the
    // content and nav already exist, so a slow or throwing WebGL probe could never
    // block first paint of the club's actual content.
    let contentPresentWhenChecked = false;
    let navPresentWhenChecked = false;
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => {
        contentPresentWhenChecked = document.querySelector('[data-section="hero"]') !== null;
        navPresentWhenChecked = document.querySelector('.site-nav') !== null;
        return true;
      },
      prefersReducedMotion: () => false,
    }));

    await import('../src/main.js');

    expect(contentPresentWhenChecked, 'content was not mounted before the WebGL check').toBe(true);
    expect(navPresentWhenChecked, 'the nav was not mounted before the WebGL check').toBe(true);
  });
});

describe('the gradient mount', () => {
  // DOM reset comes from the file-level beforeEach above; this one adds only the doMock
  // + import both tests below share. No WebGL stub is needed: jsdom has no real WebGL
  // context, so canvas.getContext('webgl') already returns null on its own, which is
  // exactly the "no WebGL" condition the second test exercises -- createGradient hits
  // its own `if (!gl) return null` branch for real, and main.js falls back to
  // data-stage="unsupported" without ever throwing.
  beforeEach(async () => {
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => false,
    }));
    await import('../src/main.js');
  });

  it('gives the gradient a canvas behind the content', () => {
    const canvas = document.getElementById('gradient');
    expect(canvas, 'no gradient canvas').not.toBeNull();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('renders every section even with no WebGL', () => {
    // Content is never gated behind the graphics.
    expect(document.querySelectorAll('[data-section]').length).toBeGreaterThan(4);
  });
});

describe('the gradient mount, with a working GL context', () => {
  // Every test above runs with getContext('webgl') mocked to null, which is the right
  // condition for testing the no-WebGL fallback but means nothing in this file has ever
  // driven main.js down its success path. Reuses gradient.dom.test.js's stubGL() (see
  // tests/helpers/webgl-stub.js) rather than a fresh mock, per the brief's own Step 1
  // note anticipating that reuse. withCanvas() isn't used here because main.js looks up
  // the #gradient canvas that's already in the DOM fixture (document.getElementById),
  // rather than owning a canvas of its own -- so the stub GL is wired in through the
  // same getContext spy the file-level beforeEach already installs, just pointed at a
  // working stub instead of null.
  let gl;

  beforeEach(() => {
    gl = stubGL();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl);
  });

  it('starts the lifecycle and populates window.__vd when motion is not reduced', async () => {
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => false,
    }));

    await import('../src/main.js');

    expect(document.documentElement.dataset.stage).not.toBe('unsupported');
    expect(window.__vd?.gradient).toBeDefined();
    expect(window.__vd?.lifecycle).toBeDefined();
    expect(typeof window.__vd.lifecycle.start).toBe('function');
    // main.js (Task 4) assigns smooth into window.__vd alongside gradient and
    // lifecycle; nothing here previously asserted it actually lands there.
    expect(window.__vd?.smooth).toBeDefined();
    // The initial fit() reached the GL layer (confirms the mount really ran against
    // this stub, not a short-circuited path).
    expect(gl.calls.viewports).toBeGreaterThan(0);
    // The loop is ARMED but has not been stepped: the observer reported an intersection
    // and `document.hidden` is false, so createLifecycle's active() is true and start()
    // queued a frame on the hand-driven rAF above. Nothing has run it, so no draw has
    // happened yet. This is now a statement about a harness the test controls, not the
    // "the loop can never start here" limitation it used to record -- the block below
    // steps that queue and watches what onFrame does.
    expect(window.__vd.lifecycle.isRunning(), 'the loop was never armed').toBe(true);
    expect(frames.pending(), 'no frame was queued').toBe(1);
    expect(gl.calls.draws).toBe(0);
  });

  it('re-fits the framebuffer to the window on resize in the animated path', async () => {
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => false,
    }));

    await import('../src/main.js');
    const viewportsAfterBoot = gl.calls.viewports;

    window.dispatchEvent(new Event('resize'));

    expect(gl.calls.viewports).toBeGreaterThan(viewportsAfterBoot);
  });

  it('keeps the canvas painted across a resize under reduced motion', async () => {
    // Regression test for the leaked-listener bug: main.js used to attach its resize
    // listener (`fit`, which only calls gradient.resize()) unconditionally, before the
    // reduced-motion branch returned. gradient.resize() reassigns canvas.width/height,
    // which clears the WebGL drawing buffer as a side effect, and under reduced motion
    // there is no lifecycle left running to draw a next frame -- so a resize (e.g. a
    // mobile orientation change) permanently blanked the canvas. This test would have
    // failed against that code: see the falsification run recorded in the task-3
    // report's Fix pass section.
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => true,
    }));

    await import('../src/main.js');
    // No lifecycle under reduced motion: window.__vd is never assigned.
    expect(window.__vd).toBeUndefined();
    const drawsAfterBoot = gl.calls.draws;
    expect(drawsAfterBoot).toBeGreaterThan(0);

    window.dispatchEvent(new Event('resize'));

    // The canvas is "still painted" here in the sense a stub GL can observe: a render
    // (drawArrays) actually ran again after the resize, rather than the resize leaving
    // the last real render stranded before a since-cleared buffer.
    expect(gl.calls.draws).toBeGreaterThan(drawsAfterBoot);
  });
});

/* ---------------------------------------------------------------------------
 * The animated onFrame composition.
 *
 * main.js's onFrame is three things meeting in four lines: Lenis is stepped every frame,
 * `createFrameCap` accumulates the delta and reports how much to draw with, and the
 * gradient is rendered only when that report is non-zero. Each piece had tests --
 * budget.test.js for the cap's arithmetic, smooth.dom.test.js for Lenis, gradient.dom.
 * test.js for render() -- and the COMPOSITION had none. VERIFICATION.md §3's frame-budget
 * figure is the shader's drawArrays in a bare canvas, and §4's proof that the loop runs
 * counts `frameCount()`, which increments whether or not onFrame draws anything.
 *
 * So the whole of the coupling was unguarded: invert `if (elapsed > 0)`, delete the
 * `cap(delta)` call, or hand `render()` the raw delta instead of the accumulated elapsed,
 * and every test on this branch stayed green. These four do not.
 *
 * ON THE CADENCES BELOW. They are derived from TARGET_FPS rather than hardcoded -- the
 * task's constraints forbid retuning it, and a test pinning 30 by hand would be a second
 * place to remember if it ever changed -- but they are deliberately kept AWAY from the
 * cap's exact interval. Spacing frames by exactly 1000/TARGET_FPS ms puts the comparison
 * `accumulated < interval` on a floating-point knife edge: `(33.333333333333336)/1000`
 * lands either side of `1/30` depending on how the timestamps accumulated, and the first
 * draft of this block asserted 11 draws and measured 6 for precisely that reason. SLOW
 * and FAST below are a comfortable third of an interval and a comfortable interval and a
 * fifth, so every expectation here is decided by the cap's logic and never by the last
 * bit of a double.
 * ------------------------------------------------------------------------- */

describe('the animated onFrame composition', () => {
  let gl;

  /** Comfortably under one cap interval: three of these still owe the cap a draw. */
  const SLOW_MS = 1000 / TARGET_FPS / 3.333;
  /** Comfortably over one cap interval: every frame at this spacing releases a draw. */
  const FAST_MS = (1000 / TARGET_FPS) * 1.2;

  async function boot() {
    gl = stubGL();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl);
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => false,
    }));
    await import('../src/main.js');
    // The real loop, armed by the real createLifecycle against the real canvas.
    expect(window.__vd.lifecycle.isRunning(), 'the loop never armed; the rest is vacuous').toBe(true);
    return gl;
  }

  /**
   * Steps the loop `count` times, `spacingMs` apart, and reports what happened. `at` is
   * the timestamp of the first of them, so a test can continue a cadence it started.
   */
  function run(count, spacingMs, at = 1000) {
    const drawsBefore = gl.calls.draws;
    const framesBefore = window.__vd.lifecycle.frameCount();
    for (let i = 0; i < count; i++) {
      expect(frames.pending(), `loop stopped scheduling after frame ${i}`).toBe(1);
      frames.step(at + i * spacingMs);
    }
    return {
      draws: gl.calls.draws - drawsBefore,
      frames: window.__vd.lifecycle.frameCount() - framesBefore,
      time: gl.calls.uniforms.u_time,
      next: at + count * spacingMs,
    };
  }

  it('draws when the loop runs -- onFrame really does reach gradient.render', async () => {
    await boot();
    // Twelve frames, each spaced by more than a full cap interval. The first carries
    // delta 0 (createLifecycle starts a resumed loop at zero, deliberately) so it cannot
    // draw; each of the other eleven releases exactly one draw.
    const r = run(12, FAST_MS);
    expect(r.frames, 'onFrame did not run at all').toBe(12);
    expect(r.draws, 'the loop ran but never reached gradient.render').toBe(11);
  });

  it('lets the cap gate the draw: frames that do not add up to an interval draw nothing', async () => {
    await boot();
    // Four frames a third of an interval apart. onFrame runs four times; the accumulated
    // time is three thirds of... just under one interval (the first frame's delta is 0),
    // so the cap returns 0 every time and nothing may be drawn. Delete the `cap(delta)`
    // call and render every frame instead, and this is 4 draws rather than 0.
    const r = run(4, SLOW_MS);
    expect(r.frames, 'onFrame did not run at all').toBe(4);
    expect(r.draws, 'drew on a frame the cap had already refused').toBe(0);
  });

  it('releases exactly one draw once the accumulated time crosses the interval', async () => {
    await boot();
    // The other half of the claim above: the cap DELAYS the draw, it does not cancel it.
    // Without this, "0 draws" would pass just as well against a cap that never released
    // anything at all.
    const held = run(4, SLOW_MS);
    expect(held.draws, 'the cadence was not actually sub-interval').toBe(0);
    const crossing = run(1, SLOW_MS, held.next);
    expect(crossing.draws, 'the cap never released the time it had accumulated').toBe(1);
  });

  it('hands render() the ACCUMULATED elapsed, not the single frame delta', async () => {
    await boot();
    // gradient.render(delta) does `time += delta` and writes u_time, so the uniform is a
    // running total of what onFrame passed it. Five frames a third of an interval apart
    // produce exactly one draw, and the time it advanced by must be the four deltas the
    // cap held onto -- not the one delta of the frame that happened to trip it, which is
    // four times smaller and what `gradient.render(delta)` would have written.
    const r = run(5, SLOW_MS);
    expect(r.draws).toBe(1);
    expect(r.time, 'render() got the frame delta rather than the accumulated elapsed')
      .toBeCloseTo((4 * SLOW_MS) / 1000, 9);
    expect(r.time, 'render() got a single frame delta').not.toBeCloseTo(SLOW_MS / 1000, 9);
  });

  it('steps Lenis on EVERY frame, ahead of the cap, not only on the frames that draw', async () => {
    await boot();
    // The third limb of the composition, and the only one that is a deliberate asymmetry:
    // main.js's own comment says the cap throttles the gradient's draw ALONE, because
    // stepping Lenis at 30 Hz would make the inertia stutter. That is a claim about
    // ordering and frequency, and until this test it was a claim made only in a comment --
    // deleting `smooth.raf(performance.now())` outright left all four tests above green.
    //
    // Spying after boot works because main.js closes over the same object window.__vd
    // exposes and looks `raf` up on it at call time, so this observes the real call site
    // rather than a copy of it.
    const stepped = vi.spyOn(window.__vd.smooth, 'raf');
    const r = run(6, SLOW_MS);
    expect(r.frames).toBe(6);
    // Sub-interval cadence: at most one of these six frames drew anything...
    expect(r.draws).toBeLessThanOrEqual(1);
    // ...and Lenis was still stepped on all six.
    expect(stepped, 'Lenis was stepped at the capped rate, or not at all').toHaveBeenCalledTimes(6);
  });
});

/* ---------------------------------------------------------------------------
 * Boot with no IntersectionObserver at all.
 *
 * initReveal() already guards this (tests/reveal.dom.test.js) so content stays visible.
 * What that guard does NOT reach is createLifecycle, called later in the same boot(): its
 * default observerFactory constructs `new IntersectionObserver(...)` unconditionally, and
 * with the global missing that throws a ReferenceError -- but not until AFTER
 * createSmoothScroll has already run and wired up a real Lenis, which attaches its own
 * `wheel` listener and calls preventDefault() on every cancelable one regardless of
 * whether anything ever pumps raf() to turn that into a scroll. With the lifecycle dead on
 * arrival, nothing here would. So the failure was worse than the thrown error: a wheel
 * that does nothing, and nav links (also intercepted by Lenis's click handler) that go
 * dead, on a page that otherwise looks loaded.
 *
 * main.js now renders one frame and returns before either constructor runs. Falsify by
 * deleting that guard: the first test below fails outright (the import rejects with the
 * ReferenceError), and if the guard were instead narrowed rather than deleted -- say, to
 * only cover createLifecycle and not return early -- the last two tests catch that, because
 * Lenis would still have been constructed before createLifecycle ever threw.
 * ------------------------------------------------------------------------- */

/** Runs `body` with the global IntersectionObserver removed, then restores it. */
async function withoutIntersectionObserver(body) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'IntersectionObserver');
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
  delete globalThis.IntersectionObserver;
  try {
    // This file's own top-level polyfill (top of file) would make this pass vacuously if
    // the delete above ever missed.
    expect(typeof IntersectionObserver, 'harness did not remove the global').toBe('undefined');
    return await body();
  } finally {
    if (had) Object.defineProperty(globalThis, 'IntersectionObserver', saved);
  }
}

describe('boot without IntersectionObserver', () => {
  let gl;

  beforeEach(() => {
    gl = stubGL();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl);
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => false,
    }));
  });

  it('renders one frame and returns instead of throwing, with window.__vd left unassigned', async () => {
    await withoutIntersectionObserver(async () => {
      let threw = null;
      try {
        await import('../src/main.js');
      } catch (e) {
        threw = e;
      }
      expect(threw, `boot() threw: ${threw?.message}`).toBeNull();

      // Same shape as the reduced-motion branch just above: nothing constructed, nothing
      // scheduled -- a composition VERIFICATION.md §5 already covers, not a new one.
      expect(window.__vd).toBeUndefined();
      expect(gl.calls.draws, 'expected at least the one render(0) call').toBeGreaterThan(0);
      expect(frames.pending(), 'a frame got scheduled even though no lifecycle should exist').toBe(0);
    });
  });

  it('leaves every room visible, composing correctly with the reveal guard', async () => {
    await withoutIntersectionObserver(async () => {
      await import('../src/main.js');
      const rooms = document.querySelectorAll('.room');
      expect(rooms.length, 'renderSections did not build the expected six rooms').toBe(6);
      for (const room of rooms) expect(room.classList.contains(PENDING_CLASS)).toBe(false);
    });
  });

  it('does not construct Lenis: a cancelable wheel is left unprevented', async () => {
    await withoutIntersectionObserver(async () => {
      await import('../src/main.js');
      const event = new window.Event('wheel', { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented, 'something still called preventDefault() on the wheel').toBe(false);
    });
  });

  it('does not construct Lenis: a nav click reaches the browser instead of being swallowed', async () => {
    await withoutIntersectionObserver(async () => {
      await import('../src/main.js');
      const link = document.querySelector('.site-nav-links a[href="#about"]');
      expect(link, 'nav did not render its About link').not.toBeNull();

      // Neutralise jsdom's own in-page hash navigation strictly AFTER reading what the
      // app decided, exactly as the external-link test in smooth.dom.test.js does -- this
      // measures the app's own choice rather than whatever jsdom does with it afterward.
      const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
      let preventedByTheApp = null;
      window.addEventListener('click', (e) => {
        preventedByTheApp = e.defaultPrevented;
        e.preventDefault();
      }, { once: true });
      link.dispatchEvent(event);

      expect(preventedByTheApp, 'a nav click was still swallowed with no Lenis to land it').toBe(false);
    });
  });
});
