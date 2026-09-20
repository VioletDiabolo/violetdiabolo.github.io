import { ROOMS } from '../scroll/choreography.js';

/**
 * Which section is each room's CANONICAL one -- the section whose scroll position the
 * choreography actually keys off. Rooms and reading order advance together, so the
 * object's state always belongs to whatever the visitor is reading. A strict bijection:
 * four rooms, four unique sections (see tests/sections-layout.dom.test.js).
 *
 * Four rooms, so `board` and `contact` are deliberately absent here -- they are not
 * *any* room's canonical section. They still end up with a side: src/ui/sections.js
 * stamps them `data-room="grid"` like `media`, and applySectionSides' second pass below
 * pairs every such section with its room directly. That pairing is the page layout's
 * job, not the choreography's, which is why it lives below rather than in this table.
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
 * exactly one correct reading side, and every mapped section takes that room's. Stamping
 * each section with its own room's side instead describes a journey the object never
 * makes: under the four-room table it put a centred column over the grid room while the
 * object sat, at full opacity, wherever the hero room's state left it.
 */
export function applySectionSides(root, { staticAt } = {}) {
  let held = null;
  if (staticAt !== undefined) {
    held = ROOMS.find((room) => room.id === staticAt) ?? null;
    // Loudly, not silently: a mistyped id falling back to per-room sides would restore
    // the exact overlap this parameter exists to prevent, and look like it had worked.
    if (!held) throw new Error(`applySectionSides: no room named "${staticAt}"`);
  }
  const canonical = new Set();
  for (const room of ROOMS) {
    const el = root.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`);
    if (el) {
      el.dataset.side = (held ?? room).textSide;
      canonical.add(el);
    }
  }
  // SECTION_FOR_ROOM (above) names one canonical section per room, and the bijection
  // tests/sections-layout.dom.test.js holds it to. Other sections can still carry that
  // room's *pattern* without being its canonical section: src/ui/sections.js stamps
  // every section with a data-room (board and contact both get 'grid', same as media),
  // because the page layout pairs them with the grid room's look even though the
  // choreography itself never singles them out. Give any such leftover section the
  // side its room already resolved to, so a shared pattern reads as one visual unit
  // instead of hugging the left edge.
  //
  // Guarded by the `canonical` set built just above, not by checking `el.dataset.side`
  // for truthiness: main.js calls this function twice on the same, already-rendered
  // content (once unconditionally, then again with `staticAt` under reduced motion),
  // so a still-set attribute from the FIRST call would read as "already handled" on the
  // second and leave board/contact stranded on their stale side.
  for (const el of root.querySelectorAll('[data-room]')) {
    if (canonical.has(el)) continue;
    const room = ROOMS.find((r) => r.id === el.dataset.room);
    if (room) el.dataset.side = (held ?? room).textSide;
  }
}
