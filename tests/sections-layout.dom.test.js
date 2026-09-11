// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ACTS } from '../src/scroll/choreography.js';
import { SECTION_FOR_ACT, applySectionSides } from '../src/ui/layout.js';

const build = () => {
  const root = document.createElement('main');
  for (const id of ['hero', 'about', 'events', 'media', 'board', 'contact', 'footer']) {
    const s = document.createElement('section');
    s.dataset.section = id;
    root.append(s);
  }
  document.body.replaceChildren(root);
  return root;
};

describe('act to section mapping', () => {
  it('maps every act to exactly one section', () => {
    const sections = ACTS.map((a) => SECTION_FOR_ACT[a.id]);
    expect(sections.every(Boolean), 'an act has no section').toBe(true);
    expect(new Set(sections).size).toBe(ACTS.length);
  });

  it('follows the reading order of the page', () => {
    expect(ACTS.map((a) => SECTION_FOR_ACT[a.id])).toEqual(
      ['hero', 'about', 'events', 'media', 'board', 'contact'],
    );
  });
});

describe('applySectionSides', () => {
  it('gives every mapped section the side its act says', () => {
    const root = build();
    applySectionSides(root);
    for (const act of ACTS) {
      const el = root.querySelector(`[data-section="${SECTION_FOR_ACT[act.id]}"]`);
      expect(el.dataset.side, SECTION_FOR_ACT[act.id]).toBe(act.textSide);
    }
  });

  it('puts the text opposite the object every time', () => {
    const root = build();
    applySectionSides(root);
    for (const act of ACTS) {
      const side = root.querySelector(`[data-section="${SECTION_FOR_ACT[act.id]}"]`).dataset.side;
      if (side === 'left') expect(act.x).toBeGreaterThan(0);
      if (side === 'right') expect(act.x).toBeLessThan(0);
    }
  });

  it('alternates sides rather than stacking every section on one edge', () => {
    const sides = ACTS.map((a) => a.textSide).filter((s) => s !== 'center');
    for (let i = 1; i < sides.length; i++) {
      expect(sides[i], 'two consecutive sections share a side').not.toBe(sides[i - 1]);
    }
  });

  it('leaves sections with no act alone', () => {
    const root = build();
    applySectionSides(root);
    expect(root.querySelector('[data-section="footer"]').dataset.side).toBeUndefined();
  });
});

describe('scroll length', () => {
  it('gives the six acts enough page to play over', () => {
    // A plain path, not `new URL(..., import.meta.url)`: under this file's jsdom
    // environment, Vitest's global URL shim resolves relative file: URLs against
    // http://localhost:3000 instead of the filesystem, which breaks fs.readFileSync(url)
    // (see the identical workaround in tests/ui.dom.test.js's "content boundary" test).
    const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');
    const css = readFileSync(cssPath, 'utf8');
    const total = [...css.matchAll(/min-height:\s*(\d+)vh/g)]
      .map((m) => Number(m[1]))
      .reduce((a, b) => a + b, 0);
    expect(total, 'the page is too short for six acts to register').toBeGreaterThanOrEqual(1800);
  });
});
