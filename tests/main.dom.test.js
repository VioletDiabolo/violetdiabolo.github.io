// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stubGL } from './helpers/webgl-stub.js';

// jsdom implements no IntersectionObserver, and initReveal() (src/ui/reveal.js) is
// mounted unconditionally in boot() -- before the WebGL branch, per main.js's own
// comment on that ordering -- so its default observerFactory needs the global to exist
// whenever prefersReducedMotion is false. Supplies a missing jsdom global and nothing
// more: it does not touch, wrap or weaken main.js or initReveal, which is what these
// tests measure.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
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
  delete window.__vd;
  // jsdom has no real WebGL implementation; left unmocked it still logs a noisy (but
  // harmless) "Not implemented" error for every getContext('webgl') call. This is the
  // same mock detect.dom.test.js already uses for the "no WebGL" case, and it is
  // genuinely the condition most tests in this file run under -- the "with a working GL
  // context" describe block below overrides this per-test where it needs a real stub.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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
    // The initial fit() reached the GL layer (confirms the mount really ran against
    // this stub, not a short-circuited path). No draw call is expected here: jsdom's
    // IntersectionObserver stub never reports an intersection, so createLifecycle's
    // `active()` stays false and start() never actually arms requestAnimationFrame --
    // onFrame (and therefore gradient.render) never fires in this harness. That's a
    // harness limitation, not something this test claims otherwise.
    expect(gl.calls.viewports).toBeGreaterThan(0);
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
