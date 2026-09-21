// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  // jsdom has no real WebGL implementation; left unmocked it still logs a noisy (but
  // harmless) "Not implemented" error for every getContext('webgl') call. This is the
  // same mock detect.dom.test.js already uses for the "no WebGL" case, and it is
  // genuinely the condition every test in this file runs under -- gradient.dom.test.js
  // is where a working GL stub belongs, not here.
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

  it('renders every section and the nav when WebGL is supported, with no graphics mounted yet', async () => {
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
