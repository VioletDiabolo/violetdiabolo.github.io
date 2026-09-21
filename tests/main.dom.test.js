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

describe('boot', () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.removeAttribute('data-stage');
    document.body.innerHTML = '<main id="content"></main>';
  });

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
    // Nothing yet stamps a supported state -- Task 3 mounts the gradient and does that.
    expect(document.documentElement.dataset.stage).not.toBe('unsupported');
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
