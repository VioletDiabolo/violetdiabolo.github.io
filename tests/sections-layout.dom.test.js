// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ROOMS, HERO_ID, OPACITY_SETTLE } from '../src/scroll/choreography.js';
import { SECTION_FOR_ROOM, applySectionSides } from '../src/ui/layout.js';
import { renderSections } from '../src/ui/sections.js';

// Mirrors the data-room src/ui/sections.js stamps on the real page: footer alone
// carries no room. Kept here rather than imported so the fixture below can build its
// sections without pulling in the real renderSections and everything it mounts -- the
// 'stays true to renderSections' test just below is what keeps this copy honest.
const ROOM_FOR_SECTION = {
  hero: 'hero', about: 'panel', events: 'showcase', media: 'grid', board: 'grid', contact: 'grid',
};

describe('ROOM_FOR_SECTION', () => {
  it('stays true to what renderSections really stamps', () => {
    // This file's own fixture (build(), below) hardcodes a copy of the data-room table
    // so it doesn't need to pull renderSections' real dependencies (mountBoard,
    // mountMedia, mountForms, buildPicture) into every other test in this file. That
    // copy could silently drift from reality -- this is the one test that would catch it.
    const root = document.createElement('main');
    renderSections(root);
    const real = {};
    for (const el of root.querySelectorAll('[data-section]')) {
      if (el.dataset.room) real[el.dataset.section] = el.dataset.room;
    }
    expect(ROOM_FOR_SECTION).toEqual(real);
  });
});

const build = () => {
  const root = document.createElement('main');
  for (const id of ['hero', 'about', 'events', 'media', 'board', 'contact', 'footer']) {
    const s = document.createElement('section');
    s.dataset.section = id;
    if (ROOM_FOR_SECTION[id]) s.dataset.room = ROOM_FOR_SECTION[id];
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

  it('gives board and contact the held room\'s side too, on the static path', () => {
    // board and contact are not the hero room's canonical section, but they carry a
    // data-room like every other section (src/ui/sections.js), so the static path's
    // fallback pairs them with the held room the same as it does everywhere else.
    // footer alone carries no data-room, so it alone stays unstamped.
    const root = build();
    applySectionSides(root, { staticAt: HERO_ID });
    const hero = ROOMS.find((r) => r.id === HERO_ID);
    for (const id of ['board', 'contact']) {
      expect(root.querySelector(`[data-section="${id}"]`).dataset.side, id).toBe(hero.textSide);
    }
    expect(root.querySelector('[data-section="footer"]').dataset.side, 'footer').toBeUndefined();
  });

  it('gives board and contact the grid room\'s side too, since they share its pattern', () => {
    // board and contact are deliberately absent from SECTION_FOR_ROOM -- media stays
    // the grid room's one canonical section, keeping the bijection above intact -- but
    // sections.js stamps all three data-room="grid", because the page layout pairs
    // them with the grid room's look even though the choreography never singles them
    // out. Without applySectionSides' fallback pass they would hug the left edge
    // unstamped instead of reading as one visual unit with media. footer carries no
    // data-room at all, so it alone stays unstamped.
    const root = build();
    applySectionSides(root);
    const grid = ROOMS.find((r) => r.id === 'grid');
    for (const id of ['board', 'contact']) {
      expect(root.querySelector(`[data-section="${id}"]`).dataset.side, id).toBe(grid.textSide);
    }
    expect(root.querySelector('[data-section="footer"]').dataset.side, 'footer').toBeUndefined();
  });
});

describe('the grid room hands over from the object', () => {
  it("holds media's cards back until the object has finished fading out", () => {
    // The one place on the page where a section's content and the object are scheduled to
    // want the same half of the screen. Media opens the grid room: its top edge crosses
    // the viewport's BOTTOM well before the object has faded, so its first row of cards
    // would sit on top of a fully visible, fully exploded object. Measured against live
    // canvas pixels at 61 scroll positions, the captions read 1.02:1 in that window --
    // white text on a white wireframe edge. sections.css holds the card column back past
    // the fade instead of putting anything behind the captions.
    //
    // Recomputed here from ROOMS and the section heights rather than restated, because
    // the literal in the stylesheet is only correct RELATIVE to those: retune a section's
    // height or the fade and a fixed number goes quietly wrong while still looking
    // deliberate. Everything below is in vh.
    const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');
    const css = readFileSync(cssPath, 'utf8');

    const heights = Object.fromEntries(
      [...css.matchAll(/\[data-section='(\w+)'\]\s*\{\s*min-height:\s*(\d+)vh/g)]
        .map((m) => [m[1], Number(m[2])]),
    );
    const order = ['hero', 'about', 'events', 'media', 'board', 'contact'];
    for (const id of order) expect(heights[id], `${id} has no min-height`).toBeGreaterThan(0);
    const footer = Number(css.match(/\.section-footer\s*\{[^}]*min-height:\s*(\d+)vh/)[1]);

    // The scroll timeline is bound to #content with enter 'top top' / leave 'bottom
    // bottom', so progress 1 is reached after (page height - one viewport) of scrolling.
    const span = order.reduce((a, id) => a + heights[id], 0) + footer - 100;
    const gridStart = ROOMS.at(-2).end;
    const grid = ROOMS.at(-1);
    const fadeDone = gridStart + (grid.end - gridStart) * OPACITY_SETTLE;

    const mediaTop = heights.hero + heights.about + heights.events;
    // A card becomes visible one viewport before its own top reaches the viewport's top.
    // The section's own top padding is ignored, which only ever makes this stricter.
    const required = fadeDone * span - mediaTop + 100;

    const declared = css.match(
      /\[data-section='media'\]\[data-side='center'\]\s*\.room-body\s*\{[^}]*margin-top:\s*(\d+)vh/,
    );
    expect(declared, 'media no longer holds its card column back at all').not.toBeNull();
    expect(Number(declared[1]), `the first media card appears while the object is still visible (needs >= ${required.toFixed(1)}vh)`)
      .toBeGreaterThanOrEqual(required);
  });

  it('leaves media enough room to actually show the cards it held back', () => {
    // The other half of the same trade: hold the cards back too far and they run past the
    // end of their own section, which pushes board and contact down and desynchronises
    // every room from the section it is supposed to be playing over.
    const cssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');
    const css = readFileSync(cssPath, 'utf8');
    const media = Number(css.match(/\[data-section='media'\]\s*\{\s*min-height:\s*(\d+)vh/)[1]);
    const held = Number(css.match(
      /\[data-section='media'\]\[data-side='center'\]\s*\.room-body\s*\{[^}]*margin-top:\s*(\d+)vh/,
    )[1]);
    // Ten video cards wrap to at most four rows at the widths this layout targets, and a
    // row is roughly a third of a viewport tall (16/9 thumbnail plus its caption).
    expect(media - held, 'the cards no longer fit below the hold-back').toBeGreaterThanOrEqual(110);
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
