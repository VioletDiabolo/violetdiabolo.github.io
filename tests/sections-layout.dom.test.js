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

/* ---------------------------------------------------------------------------
 * Scroll length.
 *
 * What used to be here was `total >= 1800vh`, "the page is too short for the rooms to
 * register". It was inherited from the six-act version of this page and never re-derived
 * for four rooms, and it asserted nothing whatever about the rooms: any set of numbers
 * adding up to 1800 satisfied it. What it did in practice was MANDATE the defect -- 2000vh
 * of page over roughly 500vh of content, with two to three screens at a stretch where a
 * held title was the only thing on the screen and the object had already faded to nothing.
 * A floor that can only ever be satisfied by making the page longer cannot see that.
 *
 * The heights exist for two things, so two tests now pin them:
 *
 *   1. Each room has to play over the section it was composed for. That is a relation
 *      between ROOMS and the stylesheet, so it is computed from both; the only constant in
 *      it is the tolerance, and that is stated in viewports of scroll rather than in
 *      progress, because a viewport is the unit a reader actually experiences.
 *
 *   2. No section may hold materially more scroll than it has anything to show in, and
 *      none may be SHORTER than its own content -- a section that overflows its
 *      min-height grows, which moves every boundary after it and silently breaks (1) in
 *      the browser while the stylesheet still reads as though it were aligned.
 *
 * Together they are two-sided: (1) fixes the ratios between the sections, (2) fixes the
 * absolute scale. (1) alone would not have stopped the page being 2000vh long, because it
 * is scale-free -- multiply every height here by 1.5 and all three handovers still land.
 * (2) alone would let the rooms drift off the sections they are composed for while every
 * section stayed comfortably full. Each was falsified against the other: see the report in
 * .superpowers/sdd/dead-scroll-report.md.
 * ------------------------------------------------------------------------- */

// A plain path, not `new URL(..., import.meta.url)`: under this file's jsdom environment,
// Vitest's global URL shim resolves relative file: URLs against http://localhost:3000
// instead of the filesystem, which breaks fs.readFileSync(url) (see the identical
// workaround in tests/ui.dom.test.js's "content boundary" test).
const SECTIONS_CSS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/styles/sections.css');

/** Page order, top to bottom. The footer is a section of the page but carries no room. */
const PAGE_ORDER = ['hero', 'about', 'events', 'media', 'board', 'contact', 'footer'];

const readLayout = () => {
  const css = readFileSync(SECTIONS_CSS, 'utf8');
  const heights = Object.fromEntries(
    [...css.matchAll(/\[data-section='(\w+)'\]\s*\{\s*min-height:\s*(\d+)vh/g)]
      .map((m) => [m[1], Number(m[2])]),
  );
  heights.footer = Number(css.match(/\.section-footer\s*\{[^}]*min-height:\s*(\d+)vh/)[1]);
  const held = Number(css.match(
    /\[data-section='media'\]\[data-side='center'\]\s*\.room-body\s*\{[^}]*margin-top:\s*(\d+)vh/,
  )[1]);
  // The scroll timeline is bound to #content with enter 'top top' / leave 'bottom bottom',
  // so progress 1 is reached after (page height - one viewport) of scrolling.
  const total = PAGE_ORDER.reduce((a, id) => a + heights[id], 0);
  return { css, heights, held, total, span: total - 100 };
};

describe('the rooms and the sections they play over', () => {
  /**
   * Half a viewport of scroll. Not fitted to the heights: at a full viewport of drift the
   * room reaches its target state with an entire screen of the WRONG section in front of
   * it, so half is where the screen is still more right than wrong. The heights land all
   * three handovers exactly, so every boundary clears this by the whole 50vh -- it is a
   * bound the design beats, not a line drawn round where the design happened to land.
   */
  const TOLERANCE_VH = 50;

  it('starts each room as the section it was composed for reaches the top of the viewport', () => {
    // THE invariant the section heights exist for, and until now it lived only in a
    // comment. A section whose top sits at cumulative height c reaches the top of the
    // viewport at progress c / span, and a room reaches its target state at its own `end`.
    // Pinning a room to a section is making those two agree at the room's start; get it
    // wrong and the beat plays over whatever else happens to be on the screen -- the
    // explosion detonating behind the panel's violet sheet, say, where nobody sees it.
    const { heights, span } = readLayout();
    for (const id of PAGE_ORDER) expect(heights[id], `${id} has no min-height`).toBeGreaterThan(0);

    const topOf = (id) => PAGE_ORDER
      .slice(0, PAGE_ORDER.indexOf(id))
      .reduce((a, k) => a + heights[k], 0);

    let roomBegins = 0;
    for (const room of ROOMS) {
      const section = SECTION_FOR_ROOM[room.id];
      expect(section, `the ${room.id} room has no section`).toBeTruthy();
      const arrives = topOf(section);
      const begins = roomBegins * span;
      const drift = arrives - begins;
      expect(
        Math.abs(drift),
        `the ${room.id} room does not begin over ${section}: ${section} arrives at progress ` +
        `${(arrives / span).toFixed(4)} (${arrives}vh) but the room begins at ${roomBegins.toFixed(4)} ` +
        `(${begins.toFixed(1)}vh) -- ${(drift / 100).toFixed(2)} viewports out, limit ` +
        `${(TOLERANCE_VH / 100).toFixed(2)}`,
      ).toBeLessThanOrEqual(TOLERANCE_VH);
      roomBegins = room.end;
    }
    expect(roomBegins, 'the last room no longer ends with the page').toBe(1);
  });

  it('counts every vh of the page towards that span', () => {
    // The span above is summed from seven named declarations. A min-height added anywhere
    // else in the stylesheet would lengthen the real page without appearing in it, and
    // every progression the test above computes would quietly be wrong by that much.
    const { css, heights, total } = readLayout();
    const declared = [...css.matchAll(/min-height:\s*(\d+)vh/g)]
      .map((m) => Number(m[1]))
      .reduce((a, b) => a + b, 0);
    expect(declared, 'a vh min-height is declared outside the seven sections the span is summed from')
      .toBe(total);
    expect(Object.keys(heights).sort()).toEqual([...PAGE_ORDER].sort());
  });
});

describe('scroll length against content', () => {
  /*
   * Content height per section, in vh, MEASURED in the built page (npm run build, vite
   * preview) at the three widths this layout is reviewed at, with every `.reveal-pending`
   * stamped visible and every image loaded. Each figure is the union box of .room-head and
   * .room-body as they are actually laid out at that width, plus the room's block padding.
   *
   * These are the NORMAL-motion layout. On the reduced-motion path src/ui/layout.js stamps
   * every section 'left', which stacks the grid rooms' cards into the narrow reading
   * column and makes media and board taller than their min-heights (measured: 397vh and
   * 230vh at 1440x900, so the page runs 1418vh instead of 1300vh). That path attaches no
   * timeline at all -- there are no rooms playing and no boundaries to move -- so the
   * growth is harmless there and is deliberately not what these numbers describe.
   *
   *                1440x900  768x1024  375x812
   */
  const CONTENT_VH = {
    hero:    [46, 31, 50],
    about:   [64, 50, 92],
    events:  [50, 53, 55],
    // Media's card column is pushed down by a hold-back declared in the stylesheet and
    // read back below; these are the cards WITHOUT it. At 375 the narrow block replaces
    // the hold-back with a normal gap, which is why the phone figure is the raw column.
    media:   [89, 121, 327],
    board:   [98, 100, 127],
    contact: [49, 40, 43],
    footer:  [22, 22, 22],
  };

  /*
   * Which widths a section's content SCROLLS at, as indices into the rows above.
   *
   * A pinned room has no dead scroll to measure: its composition is held on the screen for
   * the section's whole height, and that height is the room's beat rather than a queue of
   * content waiting to go past. Hero and showcase are pinned at every width (sections.css
   * pins them again below 768px, under the object's band), so they are exempt. The panel
   * is pinned on desktop and flows on a phone -- its content is 746px against the 487px
   * the band leaves below it -- so only the phone counts for it. The grid rooms never pin:
   * their cards have to scroll, at every width.
   */
  const FLOWS_AT = {
    hero: [],
    about: [2],
    events: [],
    media: [0, 1, 2],
    board: [0, 1, 2],
    contact: [0, 1, 2],
    footer: [0, 1, 2],
  };

  /**
   * How much scroll a section may hold beyond the content it has to show, before it is
   * simply scroll with nothing happening in it. Derived, not chosen:
   *
   *   100vh  the next section's top is already on screen for the last viewport of this
   *          one, so that viewport is never empty however short the content is; plus
   *    50vh  half a screen in which a held title, or the tail of the panel's sheet, may
   *          stand alone. Past that it stops reading as a beat and starts reading as a
   *          stall -- which at 440 / 360 / 240vh over 92 / 98 / 40vh of content it did.
   */
  const DEAD_BUDGET_VH = 150;

  it('gives no section more scroll than it has anything to show in', () => {
    const { heights, held } = readLayout();
    // The hold-back is scroll the media section genuinely uses -- the object's exit beat
    // plays over it -- so it counts as occupied at the two widths where it applies.
    const occupied = (id) => CONTENT_VH[id].map((vh, i) => (id === 'media' && i < 2 ? vh + held : vh));

    let checked = 0;
    for (const id of PAGE_ORDER) {
      const flowing = FLOWS_AT[id].map((i) => occupied(id)[i]);
      if (!flowing.length) continue;
      checked += 1;
      const emptiest = Math.min(...flowing);
      expect(
        heights[id] - emptiest,
        `${id} holds ${heights[id]}vh of scroll for ${emptiest}vh of content -- ` +
        `${((heights[id] - emptiest - 100) / 100).toFixed(2)} viewports with nothing arriving ` +
        `and nothing left, limit ${((DEAD_BUDGET_VH - 100) / 100).toFixed(2)}`,
      ).toBeLessThanOrEqual(DEAD_BUDGET_VH);
    }
    // Every exemption in FLOWS_AT is one section this test cannot see. Five of the seven
    // are still measured; if that ever drops, the exemptions have eaten the guard.
    expect(checked, 'too many sections are exempt for this to be measuring anything')
      .toBeGreaterThanOrEqual(5);
  });

  it('gives every section enough scroll to show its own content', () => {
    // The other side of the same measurement, and the one that protects the test above it.
    // min-height is a floor, not a height: a section whose content is taller simply grows,
    // which pushes every section after it down and moves every handover -- in the browser
    // only, while the stylesheet still says 144 / 216 / 300. Media is where this bites,
    // because its ten 16:9 facades stack into a single 327vh column on a phone.
    const { heights, held } = readLayout();
    for (const id of PAGE_ORDER) {
      const tallest = Math.max(
        ...CONTENT_VH[id].map((vh, i) => (id === 'media' && i < 2 ? vh + held : vh)),
      );
      expect(
        heights[id],
        `${id} is ${heights[id]}vh but its content measures ${tallest}vh at one of the three ` +
        `review widths, so the section will grow and every boundary below it will move`,
      ).toBeGreaterThanOrEqual(tallest);
    }
  });
});
