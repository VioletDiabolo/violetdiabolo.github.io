// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ROOMS, HERO_ID } from '../src/scroll/choreography.js';
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
  it('gives every mapped section its own room\'s side while the object travels', () => {
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

  it('gives every section the held room\'s side when the object never moves', () => {
    // Reduced motion: main.js skips the entrance to one room's state and attaches no
    // scroll timeline, so the object sits at the hero room's position, at full opacity,
    // for the whole page. One object position means one correct reading side. Before
    // this existed, media kept the grid room's centred column and laid its title over an
    // object that was never going to fade or move out from under it.
    const root = build();
    applySectionSides(root, { staticAt: HERO_ID });
    const hero = ROOMS.find((r) => r.id === HERO_ID);
    for (const room of ROOMS) {
      const el = root.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`);
      expect(el.dataset.side, SECTION_FOR_ROOM[room.id]).toBe(hero.textSide);
    }
    // Not a tautology only because the table disagrees with itself here: grid's own side
    // is 'center', so a section really did change hands.
    expect(ROOMS.at(-1).textSide, 'the static path no longer differs from the normal one')
      .not.toBe(hero.textSide);
  });

  it('refuses a room name that does not exist, rather than silently stamping per-room sides', () => {
    // A typo falling through to the default would look exactly like success while
    // restoring the overlap the parameter exists to prevent.
    const root = build();
    expect(() => applySectionSides(root, { staticAt: 'showcase-room' })).toThrow(/no room named/);
  });

  it('leaves sections with no room alone on the static path too', () => {
    // board and contact getting no side is a known gap (see the test below); the static
    // path must not widen it by stamping them either.
    const root = build();
    applySectionSides(root, { staticAt: HERO_ID });
    for (const id of ['board', 'contact', 'footer']) {
      expect(root.querySelector(`[data-section="${id}"]`).dataset.side, id).toBeUndefined();
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
