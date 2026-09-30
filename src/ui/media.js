import { MEDIA } from '../content/index.js';

/** Videos per block: one lead and four beside it, as in the client's reference. */
export const MEDIA_BLOCK = 5;

/**
 * The videos, in blocks of five that alternate which side the lead sits on.
 *
 * The first block leads on the LEFT with its first video; the next leads on the RIGHT
 * with its LAST — four small on the left, then the large one. That choice is about
 * order, not looks: making the mirrored block's FIRST video the large one would put it on
 * the right while it came first in the DOM, so a keyboard would jump right, then back left
 * for the four beside it. Leading with the last keeps tab order and reading order the same
 * way round in both blocks.
 *
 * Each block is its own grid (src/styles/sections.css) rather than one grid for all ten.
 * One grid needed a row number per block, and CSS cannot compute "2 × block + 1" from
 * nth-child; auto-placement with a definite column also walks the cursor forward past the
 * left-hand cells of the mirrored block and drops its first small video a row too low.
 */
export function mountMedia(el) {
  const list = document.createElement('div');
  list.className = 'media-list';

  for (let start = 0; start < MEDIA.length; start += MEDIA_BLOCK) {
    const block = document.createElement('div');
    block.className = 'media-block';
    block.dataset.lead = (start / MEDIA_BLOCK) % 2 === 0 ? 'left' : 'right';
    for (const item of MEDIA.slice(start, start + MEDIA_BLOCK)) block.append(card(item));
    list.append(block);
  }

  el.append(list);
}

/** How many videos the home page previews. */
export const MEDIA_PREVIEW = 3;

/**
 * The home page's taste of the Media page: its first MEDIA_PREVIEW videos, the newest,
 * one large and the rest beside it -- the Media page's own lead-and-small layout, cut down
 * (src/styles/sections.css). Same cards and the same click-to-play as the full page, so a
 * video started from the home page behaves exactly as it does there.
 */
export function mountMediaPreview(el) {
  const list = document.createElement('div');
  list.className = 'media-preview';
  for (const item of MEDIA.slice(0, MEDIA_PREVIEW)) list.append(card(item));
  el.append(list);
}

/** One video facade: a thumbnail button that swaps itself for the embed on click. */
function card(item) {
  const el = document.createElement('article');
  el.dataset.video = item.youtubeId;
  el.className = 'media-card';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'media-facade';
  button.setAttribute('aria-label', `Play ${item.name}`);
  button.style.backgroundImage = `url(https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg)`;

  const title = document.createElement('h3');
  title.textContent = item.name;

  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1`;
    frame.title = item.name;
    frame.loading = 'lazy';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    button.replaceWith(frame);
    // replaceWith removes the focused element, which resets focus to <body>.
    // Move focus onto the embed so keyboard users stay where they were.
    frame.tabIndex = -1;
    frame.focus();
  });

  el.append(button, title);
  return el;
}
