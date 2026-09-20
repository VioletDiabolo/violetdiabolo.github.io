// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ROOMS } from '../src/scroll/choreography.js';
import { SECTION_FOR_ROOM, applySectionSides } from '../src/ui/layout.js';

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

describe('room to section mapping', () => {
  it('maps every room to exactly one section', () => {
    const sections = ROOMS.map((r) => SECTION_FOR_ROOM[r.id]);
    expect(sections.every(Boolean), 'a room has no section').toBe(true);
    expect(new Set(sections).size).toBe(ROOMS.length);
  });

  it('follows the reading order of the page', () => {
    expect(ROOMS.map((r) => SECTION_FOR_ROOM[r.id])).toEqual(
      ['hero', 'about', 'events', 'media'],
    );
  });
});

describe('applySectionSides', () => {
  it('gives every mapped section the side its room says', () => {
    const root = build();
    applySectionSides(root);
    for (const room of ROOMS) {
      const el = root.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`);
      expect(el.dataset.side, SECTION_FOR_ROOM[room.id]).toBe(room.textSide);
    }
  });

  it('puts the text opposite the object every time', () => {
    const root = build();
    applySectionSides(root);
    for (const room of ROOMS) {
      const side = root.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`).dataset.side;
      if (side === 'left') expect(room.x).toBeGreaterThan(0);
      if (side === 'right') expect(room.x).toBeLessThan(0);
    }
  });

  it('leaves sections with no room alone', () => {
    // board and contact are deliberately unmapped here: the four rooms cover hero,
    // about, events and media, and the page layout that pairs the remaining sections
    // with the grid room is a later task's work.
    const root = build();
    applySectionSides(root);
    for (const id of ['board', 'contact', 'footer']) {
      expect(root.querySelector(`[data-section="${id}"]`).dataset.side, id).toBeUndefined();
    }
  });
});

describe('scroll length', () => {
  it('gives the four rooms enough page to play over', () => {
    // A plain path, not `new URL(..., import.meta.url)`: under this file's jsdom
    // environment, Vitest's global URL shim resolves relative file: URLs against
    // http://localhost:3000 instead of the filesystem, which breaks fs.readFileSync(url)
    // (see the identical workaround in tests/ui.dom.test.js's "content boundary" test).
    const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');
    const css = readFileSync(cssPath, 'utf8');
    const total = [...css.matchAll(/min-height:\s*(\d+)vh/g)]
      .map((m) => Number(m[1]))
      .reduce((a, b) => a + b, 0);
    expect(total, 'the page is too short for the rooms to register').toBeGreaterThanOrEqual(1800);
  });
});
