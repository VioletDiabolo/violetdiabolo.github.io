import { BOARD } from '../content/index.js';

function card(member) {
  const article = document.createElement('article');
  article.dataset.member = member.name;
  article.className = 'board-card';
  if (member.placeholder) article.dataset.placeholder = 'true';

  if (member.image) {
    const img = document.createElement('img');
    img.src = member.image;
    img.alt = `${member.name}, ${member.position}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 800;
    img.height = 800;
    article.append(img);
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
