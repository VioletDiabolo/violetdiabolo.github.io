// tests/panels.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderSections } from '../src/ui/sections.js';

const PANELS = ['hero', 'story', 'feature', 'grid'];
const SURFACES = ['solid', 'glass'];

let content;
beforeEach(() => {
  document.body.innerHTML = '<main id="content"></main>';
  content = document.getElementById('content');
  renderSections(content);
});

const sections = () => [...content.querySelectorAll('[data-section]')]
  .filter((el) => el.dataset.section !== 'footer');

describe('panel patterns', () => {
  it('gives every section a layout pattern', () => {
    for (const el of sections()) {
      expect(PANELS, el.dataset.section).toContain(el.dataset.panel);
    }
  });

  it('uses every pattern at least once', () => {
    const used = new Set(sections().map((el) => el.dataset.panel));
    expect([...used].sort()).toEqual([...PANELS].sort());
  });

  it('gives every section but the hero a surface', () => {
    // The hero has no surface because the gradient itself is the hero.
    for (const el of sections()) {
      if (el.dataset.panel === 'hero') {
        expect(el.dataset.surface, 'the hero should not be plated').toBeUndefined();
        continue;
      }
      expect(SURFACES, el.dataset.section).toContain(el.dataset.surface);
    }
  });

  it('uses both surfaces, so the gradient is neither hidden nor unreadable', () => {
    const used = new Set(sections().map((el) => el.dataset.surface).filter(Boolean));
    expect([...used].sort()).toEqual([...SURFACES].sort());
  });

  it('names no rooms — they do not exist any more', () => {
    for (const el of sections()) expect(el.dataset.room).toBeUndefined();
  });
});
