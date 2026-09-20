import { ROOMS } from '../scroll/choreography.js';

/**
 * Which section is each room's CANONICAL one -- the section whose scroll position the
 * choreography actually keys off. Rooms and reading order advance together, so the
 * object's state always belongs to whatever the visitor is reading. A strict bijection:
 * four rooms, four unique sections (see tests/sections-layout.dom.test.js).
 *
 * Four rooms, so `board` and `contact` are deliberately absent here -- they are not
 * *any* room's canonical section. They still end up with a side: src/ui/sections.js
 * stamps them `data-room="grid"` like `media`, and applySectionSides pairs every such
 * section with its room directly. That pairing is the page layout's job, not the
 * choreography's, which is why it lives below rather than in this table.
 */
export const SECTION_FOR_ROOM = Object.freeze({
  hero: 'hero',
  panel: 'about',
  showcase: 'events',
  grid: 'media',
});

/**
 * Stamp each section with the side its reading column occupies. The object sits on the
 * other side for the whole room, which is why no text needs a plate behind it.
 *
 * `staticAt` names a room the object is HELD at and never leaves -- the reduced-motion
 * path, where main.js skips the entrance to one room's state and attaches no scroll
 * timeline at all. There is then exactly one object position on the page, so there is
 * exactly one correct reading side, and every section takes that room's. Stamping each
 * section with its own room's side instead describes a journey the object never makes:
 * under the four-room table it put a centred column over the grid room while the object
 * sat, at full opacity, wherever the hero room's state left it.
 *
 * Driven entirely by `[data-room]`, which src/ui/sections.js stamps on every section but
 * the footer. SECTION_FOR_ROOM plays no part here: for the four sections it names, a
 * section's own data-room already reads back the same room SECTION_FOR_ROOM's lookup
 * would have produced (the two agree by construction), and board/contact never appear in
 * SECTION_FOR_ROOM at all -- so resolving every section from its own data-room covers
 * all six in one pass instead of two routes to the same value.
 *
 * Idempotent per call and safe to call repeatedly on the same rendered content (main.js
 * does exactly that: once unconditionally, then again with `staticAt` under reduced
 * motion) -- every element in the loop is re-read and re-written from scratch each call,
 * never skipped because of an attribute a previous call left behind.
 */
export function applySectionSides(root, { staticAt } = {}) {
  let held = null;
  if (staticAt !== undefined) {
    held = ROOMS.find((room) => room.id === staticAt) ?? null;
    // Loudly, not silently: a mistyped id falling back to per-room sides would restore
    // the exact overlap this parameter exists to prevent, and look like it had worked.
    if (!held) throw new Error(`applySectionSides: no room named "${staticAt}"`);
  }
  for (const el of root.querySelectorAll('[data-room]')) {
    const room = ROOMS.find((r) => r.id === el.dataset.room);
    if (room) el.dataset.side = (held ?? room).textSide;
  }
}
