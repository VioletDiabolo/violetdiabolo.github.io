// tests/panels.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { RENDERERS } from '../src/ui/sections.js';

const PANELS = ['hero', 'teaser', 'feature', 'header', 'plate'];

/** The two patterns that OPEN a page, on the bare gradient. Every other one is glass. */
const BARE = ['hero', 'header'];

/** Every page's sections, as that page renders them. */
function allSections() {
  return Object.entries(RENDERERS).flatMap(([page, render]) => {
    const root = document.createElement('main');
    render(root);
    return [...root.querySelectorAll('[data-section]')].map((el) => ({ page, el }));
  });
}

describe('panel patterns', () => {
  it('gives every section on every page a layout pattern', () => {
    for (const { page, el } of allSections()) {
      expect(PANELS, `${page}: ${el.dataset.section}`).toContain(el.dataset.panel);
    }
  });

  it('uses every pattern at least once across the site', () => {
    const used = new Set(allSections().map(({ el }) => el.dataset.panel));
    expect([...used].sort()).toEqual([...PANELS].sort());
  });

  it('opens every page on the bare gradient, and plates everything after it in glass', () => {
    // "All pages can have the swirling background": the page's first panel has no
    // surface at all, and every other panel is glass, which lets the gradient through.
    // `solid` was the other surface, and it is exactly the one that would hide it.
    const byPage = new Map();
    for (const { page, el } of allSections()) {
      if (!byPage.has(page)) byPage.set(page, []);
      byPage.get(page).push(el);
    }
    expect([...byPage.keys()].sort()).toEqual(Object.keys(RENDERERS).sort());
    for (const [page, sections] of byPage) {
      const [first, ...rest] = sections;
      expect(BARE, `${page} opens on a ${first.dataset.panel} panel`).toContain(first.dataset.panel);
      expect(first.dataset.surface, `${page}'s opening panel is plated`).toBeUndefined();
      expect(rest.length, `${page} has nothing after its opening panel`).toBeGreaterThan(0);
      for (const el of rest) {
        expect(BARE, `${page}: ${el.dataset.section} is a ${el.dataset.panel} panel mid-page`)
          .not.toContain(el.dataset.panel);
        expect(el.dataset.surface, `${page}: ${el.dataset.section}`).toBe('glass');
      }
    }
  });

  it('names no rooms — they do not exist any more', () => {
    for (const { el } of allSections()) expect(el.dataset.room).toBeUndefined();
  });
});
