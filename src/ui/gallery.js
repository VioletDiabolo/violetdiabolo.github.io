import { PRACTICE_PHOTOS } from '../content/index.js';
import { buildPicture } from './picture.js';

/**
 * The practice gallery, mounted inside the media panel below its video facades.
 *
 * A grid rather than a carousel, and no lightbox: every photograph is reachable by
 * scrolling, which is one behaviour instead of three and works with a keyboard for free.
 *
 * `align-items: start` in the stylesheet, not a shared aspect-ratio here — these are
 * mixed portraits and landscapes, and cropping them to one shape would cut the group
 * photograph's outer two people off. Each cell keeps its own height; the intrinsic size
 * comes from the width/height pair content carries, so nothing reflows on load.
 */
export function mountGallery(el) {
  const heading = document.createElement('h3');
  heading.className = 'gallery-heading';
  heading.textContent = PRACTICE_PHOTOS.heading;

  const grid = document.createElement('div');
  grid.className = 'photo-grid';

  for (const photo of PRACTICE_PHOTOS.photos) {
    const cell = document.createElement('figure');
    cell.className = 'photo-cell';
    cell.dataset.photo = photo.base;
    cell.append(buildPicture({
      base: photo.base,
      widths: photo.widths,
      alt: photo.alt,
      width: photo.width,
      height: photo.height,
      sizes: '(max-width: 720px) 90vw, (max-width: 1100px) 44vw, 30vw',
    }));
    grid.append(cell);
  }

  el.append(heading, grid);
}
