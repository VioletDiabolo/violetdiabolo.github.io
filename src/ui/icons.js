/**
 * The social marks, drawn inline rather than loaded.
 *
 * Inline <svg> with `fill="currentColor"` so a mark takes the colour of the link around
 * it — hover, focus and the two different grounds on this page all come free, which an
 * <img> could not do without a second file per state. Three small paths cost less than
 * one network request, and public/engage.svg (413x413 of traced path data, black on
 * transparent) would have been invisible on a dark panel anyway.
 *
 * Simplified constructions, not the brands' own artwork: a rounded square with a circle
 * and a dot, a rounded rectangle with a play triangle, a globe, and a controller outline
 * with two eyes for Discord. Recognisable at 20px, which is the whole job.
 *
 * `aria-hidden` on every one of them. The accessible name is the link's own label
 * (SOCIALS[].label, src/content/index.js) — an icon that announces itself as well would
 * have a screen reader say the name twice.
 */
const PATHS = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/>',
  youtube:
    '<rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M10 8.8v6.4l5.4-3.2z" fill="currentColor"/>',
  engage:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6"/>',
  discord:
    '<path d="M5.2 7.3C7.4 6 9.6 5.4 12 5.4s4.6.6 6.8 1.9c1.5 2.3 2.2 4.9 2.1 7.7' +
    '-1.6 1.2-3.3 2-5.2 2.5l-.9-1.5M9.2 16l-.9 1.5C6.4 17 4.7 16.2 3.1 15 3 12.2 3.7 9.6 5.2 7.3z" ' +
    'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<circle cx="9.3" cy="12.2" r="1.35" fill="currentColor"/>' +
    '<circle cx="14.7" cy="12.2" r="1.35" fill="currentColor"/>',
};

/** The mark names this module can draw, so a guard can check content against it. */
export const ICON_NAMES = Object.freeze(Object.keys(PATHS));

/**
 * @returns {SVGElement|null} the mark, or null when `name` has no drawing — a missing
 * icon leaves the link's text label rather than an empty box.
 */
export function buildIcon(name) {
  if (!PATHS[name]) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('social-icon');
  svg.innerHTML = PATHS[name];
  return svg;
}
