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
