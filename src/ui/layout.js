import { ACTS } from '../scroll/choreography.js';

/**
 * Which section each act plays over. Acts and reading order advance together, so the
 * object's state always belongs to whatever the visitor is reading.
 */
export const SECTION_FOR_ACT = Object.freeze({
  arrival: 'hero',
  apart: 'about',
  recombine: 'events',
  spin: 'media',
  orbit: 'board',
  settle: 'contact',
});

/**
 * Stamp each section with the side its reading column occupies. The object sits on the
 * other side for the whole act, which is why no text needs a plate behind it.
 */
export function applySectionSides(root) {
  for (const act of ACTS) {
    const el = root.querySelector(`[data-section="${SECTION_FOR_ACT[act.id]}"]`);
    if (el) el.dataset.side = act.textSide;
  }
}
