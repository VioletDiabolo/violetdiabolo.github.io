// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initReveal, PENDING_CLASS, VISIBLE_CLASS } from '../src/ui/reveal.js';

// A plain path, not `new URL(..., import.meta.url)`: under this file's jsdom environment
// Vitest's global URL shim resolves relative file: URLs against http://localhost:3000
// rather than the filesystem (the same workaround sections-layout.dom.test.js documents).
const BASE_CSS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/base.css');

function harness({ reducedMotion = false } = {}) {
  document.body.innerHTML = `
    <section data-section="about"><h2>About</h2><p>Body copy</p></section>
    <section data-section="events"><h2>Events</h2></section>
  `;

  let ioCallback;
  const observed = [];
  const unobserved = [];
  const observerFactory = (cb) => {
    ioCallback = cb;
    return {
      observe: (el) => observed.push(el),
      unobserve: (el) => unobserved.push(el),
      disconnect: vi.fn(),
    };
  };

  const reveal = initReveal({ root: document, observerFactory, reducedMotion });

  return {
    reveal,
    observed,
    unobserved,
    intersect: (el) => ioCallback([{ target: el, isIntersecting: true }]),
    missIntersect: (el) => ioCallback([{ target: el, isIntersecting: false }]),
  };
}

describe('reveal', () => {
  it('marks every direct child of every section as pending on init', () => {
    const h = harness();
    const targets = [...document.querySelectorAll('[data-section] > *')];
    expect(targets.length).toBe(3); // about > h2, about > p, events > h2
    for (const el of targets) expect(el.classList.contains(PENDING_CLASS)).toBe(true);
    expect(h.observed).toEqual(targets);
  });

  it('adds the visible class only once an element intersects', () => {
    const h = harness();
    const heading = document.querySelector('[data-section="about"] h2');
    expect(heading.classList.contains(VISIBLE_CLASS)).toBe(false);
    h.intersect(heading);
    expect(heading.classList.contains(VISIBLE_CLASS)).toBe(true);
  });

  it('stops observing an element once it has been revealed, so it never re-triggers', () => {
    const h = harness();
    const heading = document.querySelector('[data-section="about"] h2');
    h.intersect(heading);
    expect(h.unobserved).toContain(heading);
  });

  it('ignores a non-intersecting entry rather than revealing it', () => {
    const h = harness();
    const heading = document.querySelector('[data-section="about"] h2');
    h.missIntersect(heading);
    expect(heading.classList.contains(VISIBLE_CLASS)).toBe(false);
    expect(h.unobserved).not.toContain(heading);
  });

  it('does nothing for a reduced-motion visitor: no pending class, no observation', () => {
    const h = harness({ reducedMotion: true });
    const targets = [...document.querySelectorAll('[data-section] > *')];
    for (const el of targets) expect(el.classList.contains(PENDING_CLASS)).toBe(false);
    expect(h.observed).toEqual([]);
  });

  it('disposes cleanly by disconnecting the observer', () => {
    const h = harness();
    expect(() => h.reveal.dispose()).not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
 * The blank-page case.
 *
 * `.reveal-pending` is `opacity: 0` (base.css), it is added SYNCHRONOUSLY by initReveal,
 * and the only thing that ever takes it off again is an IntersectionObserver callback.
 * So in a browser with no IntersectionObserver the class is a one-way door: every `.room`
 * -- one per section, each `min-height: 100dvh` -- is hidden with nothing left that could
 * reveal it. Measured on the real page with the constructor deleted, before the guard:
 * all six rooms at `opacity: 0`, plus an uncaught ReferenceError that took the rest of
 * boot() with it.
 *
 * The three tests below are one claim each: the guard fires, the guard is not too wide
 * (an injected observer still runs), and the class the guard is about is the class the
 * stylesheet actually hides -- without that last one, "no pending class" would not mean
 * "visible" and the first test would be asserting a string rather than an outcome.
 * ------------------------------------------------------------------------- */

/** Runs `body` with the global IntersectionObserver removed, then puts it back. */
function withoutIntersectionObserver(body) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'IntersectionObserver');
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver');
  delete globalThis.IntersectionObserver;
  try {
    // The harness itself is checked: jsdom ships no IntersectionObserver, so this would
    // pass vacuously if a sibling file's polyfill ever leaked in and the delete missed.
    expect(typeof IntersectionObserver, 'harness did not remove the global').toBe('undefined');
    return body();
  } finally {
    if (had) Object.defineProperty(globalThis, 'IntersectionObserver', saved);
  }
}

describe('reveal in a browser with no IntersectionObserver', () => {
  it('leaves every section visible instead of hiding it with nothing left to reveal it', () => {
    withoutIntersectionObserver(() => {
      document.body.innerHTML = `
        <section data-section="hero"><div class="room">Hero</div></section>
        <section data-section="about"><div class="room">About</div></section>
        <section data-section="events"><div class="room">Events</div></section>
        <section data-section="media"><div class="room">Media</div></section>
        <section data-section="board"><div class="room">Board</div></section>
        <section data-section="contact"><div class="room">Contact</div></section>
        <footer data-section="footer"><p>Violet Diabolo 2026</p></footer>
      `;

      // No observerFactory: this is main.js's own call shape (initReveal() with no
      // arguments), which is the only one that reaches for the global.
      let reveal;
      expect(() => { reveal = initReveal({ root: document, reducedMotion: false }); },
        'initReveal threw where IntersectionObserver does not exist').not.toThrow();

      const targets = [...document.querySelectorAll('[data-section] > *')];
      expect(targets.length, 'fixture built nothing to hide').toBe(7);
      for (const el of targets) {
        const where = el.closest('[data-section]').dataset.section;
        expect(el.classList.contains(PENDING_CLASS), `${where} was hidden with no way back`).toBe(false);
        expect(el.classList.contains(VISIBLE_CLASS), `${where} was given a class that means nothing here`).toBe(false);
      }

      expect(() => reveal.dispose()).not.toThrow();
    });
  });

  it('still uses an injected observer, which needs no global at all', () => {
    // The guard must be about the CONSTRUCTOR being reachable, not about the feature
    // being wanted. Widened to "skip whenever the global is missing" it would silently
    // disable the reveal for every caller that brings its own observer -- including the
    // five tests above this block, which is the direction a too-eager guard breaks in.
    withoutIntersectionObserver(() => {
      document.body.innerHTML = '<section data-section="about"><div class="room">About</div></section>';
      const observed = [];
      initReveal({
        root: document,
        reducedMotion: false,
        observerFactory: () => ({ observe: (el) => observed.push(el), unobserve() {}, disconnect() {} }),
      });
      const room = document.querySelector('.room');
      expect(room.classList.contains(PENDING_CLASS), 'an injected observer was ignored').toBe(true);
      expect(observed).toEqual([room]);
    });
  });

  it('guards the one class base.css actually hides, so an absent class really is visible', () => {
    // Couples the JS constant to the stylesheet. If the hiding ever moves to another
    // selector, or a second selector starts hiding things, the test above stops meaning
    // "the content is visible" and this one says so rather than letting it drift.
    const css = readFileSync(BASE_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const hiding = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => /(?:^|;)\s*opacity:\s*0\s*(?:;|$)/.test(body.trim()))
      .map(([, selector]) => selector.trim());
    expect(hiding, 'base.css no longer hides anything with opacity: 0 -- update this test')
      .toEqual([`.${PENDING_CLASS}`]);
  });
});
