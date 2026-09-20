import { ROOMS } from '../scroll/choreography.js';

/**
 * Which section each room plays over. Rooms and reading order advance together, so the
 * object's state always belongs to whatever the visitor is reading.
 *
 * Four rooms, so `board` and `contact` are deliberately unmapped and keep no side of
 * their own -- pairing the remaining sections with the grid room is the page layout's
 * job, not the choreography's.
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
  for (const room of ROOMS) {
    const el = root.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`);
    if (el) el.dataset.side = (held ?? room).textSide;
  }
}
