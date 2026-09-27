// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  NAV_LINKS, CTA, PAGES, buildNav, observeNavHeight,
} from '../src/ui/nav.js';
import { RENDERERS } from '../src/ui/sections.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('NAV_LINKS', () => {
  it('keeps only About us and Media beside the call to action', () => {
    // The client's words: "remove uncessary buttons, just keep media, join us, about us".
    // Events and Board went -- the schedule is directly under the home page's first
    // screen, and the board lives on the About page.
    expect(NAV_LINKS.map((l) => l.label)).toEqual(['About us', 'Media']);
    expect(NAV_LINKS.map((l) => l.page)).toEqual(['about', 'media']);
  });

  it('gives every link a label', () => {
    for (const link of NAV_LINKS) expect(link.label.length).toBeGreaterThan(0);
  });

  it('sends the call to action to the Join us page', () => {
    expect(CTA.page).toBe('join');
    expect(CTA.label).toBe('Join us');
  });
});

describe('buildNav', () => {
  it('renders one link per entry plus the wordmark and the call to action', () => {
    expect(buildNav().querySelectorAll('a')).toHaveLength(NAV_LINKS.length + 2);
  });

  it('marks the call to action so it can be styled apart', () => {
    expect(buildNav().querySelector('[data-cta]')).not.toBeNull();
  });

  it('is a landmark with an accessible name', () => {
    const nav = buildNav();
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  it('points every link, on every page, at a file or an anchor that actually exists', () => {
    // A nav that goes nowhere is worse than no nav. Checked from every page rather than
    // the home page alone: the wordmark's href depends on which page it is built for.
    for (const page of Object.keys(PAGES)) {
      document.body.innerHTML = '<main id="content"></main>';
      const content = document.getElementById('content');
      RENDERERS[page](content);
      const nav = buildNav({ page });
      document.body.prepend(nav);
      // Scoped to buildNav()'s own element: the footer's socials are a second <nav>,
      // and folding their external hrefs in here would test the wrong thing.
      const links = nav.querySelectorAll('a');
      // A query that silently matched nothing would pass this loop vacuously.
      expect(links.length).toBeGreaterThan(0);
      for (const a of links) {
        const href = a.getAttribute('href');
        if (!href.startsWith('#')) {
          expect(href, `${href} is neither an anchor nor a page`).toMatch(/^\.\/[\w-]+\.html(#|$)/);
          const file = href.replace(/^\.\//, '').split('#')[0];
          // A plain path, not `new URL(..., import.meta.url)`: under jsdom Vitest's global
          // URL shim resolves a relative file: URL against http://localhost:3000, so
          // existsSync() is handed an http URL and answers false for every file on disk.
          // The same workaround is documented in ui.dom.test.js and sections-layout.
          const abs = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', file);
          expect(existsSync(abs), `${file} does not exist`).toBe(true);
          continue;
        }
        const id = href.slice(1);
        expect(content.querySelector(`#${id}`), `${page}: ${id} has no section`).not.toBeNull();
      }
    }
  });

  it('marks the page you are on, and only that one', () => {
    // The visible state is the stylesheet's (base.css, [aria-current='page']); this is
    // the half a screen reader hears.
    for (const page of Object.keys(PAGES)) {
      const current = [...buildNav({ page }).querySelectorAll('[aria-current="page"]')];
      if (page === 'home') {
        // The home page has no button of its own -- the wordmark is the way there.
        expect(current, 'a button claims to be the home page').toHaveLength(0);
      } else {
        expect(current, `${page} is marked ${current.length} times`).toHaveLength(1);
        expect(current[0].getAttribute('href')).toBe(PAGES[page]);
      }
    }
  });

  it('sends the wordmark home from every other page, and to the top from home itself', () => {
    expect(buildNav({ page: 'home' }).querySelector('.site-nav-mark').getAttribute('href')).toBe('#hero');
    for (const page of Object.keys(PAGES).filter((p) => p !== 'home')) {
      expect(buildNav({ page }).querySelector('.site-nav-mark').getAttribute('href')).toBe(PAGES.home);
    }
  });
});

// The old 'room patterns' coverage that lived here (every section gets a valid pattern;
// all four patterns used) is superseded by tests/panels.dom.test.js, which asserts the
// same facts under the current data-panel/data-surface names plus the surface coverage
// and the absence of data-room. Keeping both would test the same claim under two
// vocabularies, one of them stale.

/* ---------------------------------------------------------------------------
 * The bar's measured height.
 *
 * .site-nav is fixed, so nothing in the flow knows it is there; five offsets in the
 * stylesheets clear it by hand and all of them used to read --nav-h, a fixed clamp().
 * A fixed clamp cannot know the bar has WRAPPED: measured at 375x812 with a 32px root
 * font (a user at 200% text zoom) the bar stands 188.8px against a --nav-h of 104px,
 * and the hero h1 sat at y 112 -- the fixed bar painted over the club's own name by
 * 76.8px, and every jump link landed its heading underneath it.
 *
 * These drive observeNavHeight() with a stub observer rather than grepping nav.js for
 * the words, so "measured and published" is distinguishable from "measured and
 * dropped" -- the same distinction the shader bench's control guard was missing.
 * ------------------------------------------------------------------------- */

describe('observeNavHeight', () => {
  /** A ResizeObserver stand-in; jsdom has none, which is also the no-support branch. */
  function stubResizeObserver() {
    const instances = [];
    class Stub {
      constructor(callback) {
        this.callback = callback;
        this.observed = [];
        this.disconnected = false;
        instances.push(this);
      }

      observe(el) { this.observed.push(el); }

      disconnect() { this.disconnected = true; }

      fire() { this.callback([], this); }
    }
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = Stub;
    return { instances, restore: () => { globalThis.ResizeObserver = previous; } };
  }

  const withHeight = (el, height) => {
    el.getBoundingClientRect = () => ({
      height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0,
    });
    return el;
  };

  it('publishes the measured height as --nav-offset', () => {
    const { instances, restore } = stubResizeObserver();
    try {
      const root = document.documentElement;
      const nav = withHeight(document.createElement('nav'), 188.8);
      document.body.append(nav);
      observeNavHeight(nav, root);

      const observer = instances.at(-1);
      expect(observer.observed, 'the bar itself is what has to be observed').toContain(nav);
      // Nothing is written until the observer fires: the value is a MEASUREMENT.
      expect(root.style.getPropertyValue('--nav-offset')).toBe('');

      observer.fire();
      expect(root.style.getPropertyValue('--nav-offset'),
        'the bar is 188.8px tall and every offset downstream still thinks it is 104px')
        .toBe('188.8px');
    } finally {
      restore();
      document.documentElement.style.removeProperty('--nav-offset');
    }
  });

  it('writes nothing when there is no layout, so the CSS fallback stands', () => {
    // A 0px offset is strictly worse than --nav-h: it would put the hero's h1 at the
    // top of the viewport, under the bar, on any engine that fired before first layout.
    const { instances, restore } = stubResizeObserver();
    try {
      const root = document.documentElement;
      const nav = withHeight(document.createElement('nav'), 0);
      document.body.append(nav);
      observeNavHeight(nav, root);
      instances.at(-1).fire();
      expect(root.style.getPropertyValue('--nav-offset')).toBe('');
    } finally {
      restore();
    }
  });

  it('lets go of a bar that has left the document', () => {
    // main.js has no teardown to hang this on, so the observer has to notice for
    // itself. A nav that has been removed must not keep an observer -- or a stale
    // offset -- alive behind it.
    const { instances, restore } = stubResizeObserver();
    try {
      const root = document.documentElement;
      const nav = withHeight(document.createElement('nav'), 120);
      document.body.append(nav);
      observeNavHeight(nav, root);
      const observer = instances.at(-1);
      observer.fire();
      expect(root.style.getPropertyValue('--nav-offset')).toBe('120px');

      nav.remove();
      observer.fire();
      expect(observer.disconnected, 'the observer outlived the nav it was watching').toBe(true);
      expect(root.style.getPropertyValue('--nav-offset'),
        'a removed bar left its height behind, so the page clears a bar that is gone')
        .toBe('');
    } finally {
      restore();
    }
  });

  it('returns a disposer that undoes both the observer and the offset', () => {
    const { instances, restore } = stubResizeObserver();
    try {
      const root = document.documentElement;
      const nav = withHeight(document.createElement('nav'), 64);
      document.body.append(nav);
      const stop = observeNavHeight(nav, root);
      const observer = instances.at(-1);
      observer.fire();
      expect(root.style.getPropertyValue('--nav-offset')).toBe('64px');
      stop();
      expect(observer.disconnected).toBe(true);
      expect(root.style.getPropertyValue('--nav-offset')).toBe('');
    } finally {
      restore();
    }
  });

  it('is a no-op, not a throw, where ResizeObserver does not exist', () => {
    // jsdom is that browser, and so is anything old enough to matter. The CSS fallback
    // (--nav-offset: var(--nav-h)) is today's behaviour, so nothing regresses.
    const previous = globalThis.ResizeObserver;
    delete globalThis.ResizeObserver;
    try {
      const nav = withHeight(document.createElement('nav'), 120);
      document.body.append(nav);
      expect(() => observeNavHeight(nav, document.documentElement)()).not.toThrow();
      expect(document.documentElement.style.getPropertyValue('--nav-offset')).toBe('');
    } finally {
      if (previous) globalThis.ResizeObserver = previous;
    }
  });
});
