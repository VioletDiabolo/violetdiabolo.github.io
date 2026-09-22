import { BOARD } from '../content/index.js';
import { buildPicture } from './picture.js';

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

  const name = document.createElement('h3');
  name.textContent = member.name;
  const position = document.createElement('p');
  position.className = 'board-position';
  position.textContent = member.position;
  const bio = document.createElement('p');
  bio.textContent = member.description;

  article.append(name, position, bio);
  return article;
}

export function mountBoard(el) {
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
    list.replaceChildren(...BOARD[select.value].map(card));
  };

  select.addEventListener('change', paint);
  paint();

  el.append(select, list);
}
