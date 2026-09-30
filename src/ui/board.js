import { BOARD } from '../content/index.js';
import { buildPicture } from './picture.js';
import { CTA, hrefFor } from './nav.js';

function card(member) {
  const article = document.createElement('article');
  article.dataset.member = member.name;
  article.className = 'board-card';
  if (member.placeholder) article.dataset.placeholder = 'true';

  if (member.image) {
    const picture = buildPicture({
      base: member.image,
      widths: [400, 800],
      alt: `${member.name}, ${member.position}`,
      sizes: '(max-width: 720px) 90vw, 320px',
    });
    article.append(picture);
  } else if (!member.placeholder) {
    // A seated member whose photograph has not arrived yet — distinct from an open slot,
    // which has nobody to photograph and gets nothing.
    //
    // It occupies the same 4:5 box a picture would, because the alternative is what this
    // grid did before: a card with a photograph stands ~300px taller than one without, so
    // a mixed roster reads as broken rather than as pending. Initials rather than a bare
    // tile, so the box says WHOSE photograph is missing.
    //
    // Derived from the name rather than stored beside it: initials are not copy, and a
    // second field would be one more thing to forget to update when a name changes.
    const pending = document.createElement('div');
    pending.className = 'board-photo-pending';
    pending.dataset.pendingPhoto = member.name;
    pending.setAttribute('role', 'img');
    pending.setAttribute('aria-label', `No photograph of ${member.name} yet`);
    const initials = document.createElement('span');
    initials.setAttribute('aria-hidden', 'true');
    initials.textContent = member.name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    pending.append(initials);
    article.append(pending);
  }

  // A name and a position, and nothing under them: no bios, at the client's request
  // (src/content/index.js, above BOARD).
  const name = document.createElement('h3');
  name.textContent = member.name;
  const position = document.createElement('p');
  position.className = 'board-position';
  position.textContent = member.position;

  article.append(name, position);
  return article;
}

/**
 * The last card on the current board: a dashed tile with a plus, linking to Join us.
 *
 * The client's reference ends its team grid the same way. It is a link and not a
 * `[data-member]` card, because it is not a member — every count of the roster, in the
 * tests and anywhere else, has to keep meaning people. Its label and target are the
 * nav's own call to action, so the two can never point at different places.
 */
function joinCard() {
  const a = document.createElement('a');
  a.className = 'board-card board-join';
  a.href = hrefFor(CTA);
  const tile = document.createElement('span');
  tile.className = 'board-join-tile';
  tile.setAttribute('aria-hidden', 'true');
  const plus = document.createElement('span');
  plus.className = 'board-join-plus';
  plus.textContent = '+';
  tile.append(plus);
  const label = document.createElement('span');
  label.className = 'board-join-label';
  label.textContent = CTA.label;
  a.append(tile, label);
  return a;
}

/**
 * The roster and the select that picks its semester.
 *
 * `controls` is where the select goes, when that is not beside the grid: the About page
 * seats it in the panel's head, level with the BOARD heading, the way a filter sits on a
 * section title. Omitted, both land in `el`, which is all a test needs.
 */
export function mountBoard(el, { controls = el } = {}) {
  const semesters = Object.keys(BOARD);

  const select = document.createElement('select');
  select.className = 'semester-select';
  select.setAttribute('aria-label', 'Select semester');
  for (const s of semesters) {
    const option = document.createElement('option');
    option.value = s;
    option.textContent = s;
    select.append(option);
  }
  select.value = semesters[0];

  const list = document.createElement('div');
  list.className = 'board-list';

  const paint = () => {
    const cards = BOARD[select.value].map(card);
    // The newest board only: an invitation to join is about the club as it is now, and on
    // Fall 2023's roster it would be an invitation to a board that no longer exists.
    if (select.value === semesters[0]) cards.push(joinCard());
    list.replaceChildren(...cards);
  };

  select.addEventListener('change', paint);
  paint();

  controls.append(select);
  el.append(list);
}
