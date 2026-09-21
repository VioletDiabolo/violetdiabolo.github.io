// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { NAV_LINKS, CTA, buildNav } from '../src/ui/nav.js';
import { renderSections } from '../src/ui/sections.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('NAV_LINKS', () => {
  it('jumps to the sections a visitor most wants', () => {
    expect(NAV_LINKS.map((l) => l.target)).toEqual(['about', 'events', 'media', 'board']);
  });

  it('gives every link a label', () => {
    for (const link of NAV_LINKS) expect(link.label.length).toBeGreaterThan(0);
  });

  it('sends the call to action to contact', () => {
    expect(CTA.target).toBe('contact');
    expect(CTA.label).toBe('Join us');
  });
});

describe('buildNav', () => {
  it('renders one link per entry plus the call to action', () => {
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

  it('points every link at a section that actually exists', () => {
    // A nav that scrolls nowhere is worse than no nav.
    const content = document.getElementById('content');
    renderSections(content);
    const nav = buildNav();
    document.body.prepend(nav);
    // Scoped to buildNav()'s own element, not `document.querySelectorAll('nav a')`:
    // the page also has a second, real <nav> (the contact section's socials landmark,
    // src/ui/sections.js), and an unscoped query would fold its external hrefs
    // (mailto:..., https://instagram.com/...) into this loop too -- `.slice(1)` on
    // those produces strings like `ttps://instagram.com/violet_diabolo`, not a valid
    // CSS id selector, which throws a SyntaxError from querySelector rather than
    // failing the assertion cleanly.
    const links = nav.querySelectorAll('a');
    // A query that silently matched nothing would pass this loop vacuously.
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      const id = a.getAttribute('href').slice(1);
      expect(content.querySelector(`#${id}`), `${id} has no section`).not.toBeNull();
    }
  });
});

// The old 'room patterns' coverage that lived here (every section gets a valid pattern;
// all four patterns used) is superseded by tests/panels.dom.test.js, which asserts the
// same facts under the current data-panel/data-surface names plus the surface coverage
// and the absence of data-room. Keeping both would test the same claim under two
// vocabularies, one of them stale.
