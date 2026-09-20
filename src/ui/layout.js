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
 */
export function applySectionSides(root) {
  for (const room of ROOMS) {
    const el = root.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`);
    if (el) el.dataset.side = room.textSide;
  }
}
