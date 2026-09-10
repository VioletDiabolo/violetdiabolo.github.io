import { SITE, ABOUT, EVENTS, CONTACT, SOCIALS, SECTION_HEADINGS } from '../content/index.js';
import { mountBoard } from './board.js';
import { mountMedia } from './media.js';
import { mountForms } from './forms.js';

function section(id, headingText, level = 'h2') {
  const el = document.createElement('section');
  el.dataset.section = id;
  el.className = `section section-${id}`;
  if (headingText) {
    const heading = document.createElement(level);
    heading.textContent = headingText;
    el.append(heading);
  }
  return el;
}

function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

export function renderSections(root) {
  const hero = section('hero', SITE.name, 'h1');
  hero.append(paragraph(SITE.tagline));

  const about = section('about', ABOUT.heading);
  about.append(paragraph(ABOUT.body));

  const events = section('events', EVENTS.heading);
  events.append(paragraph(EVENTS.body));
  mountForms(events);

  const media = section('media', SECTION_HEADINGS.media);
  mountMedia(media);

  const board = section('board', SECTION_HEADINGS.board);
  mountBoard(board);

  const contact = section('contact', SECTION_HEADINGS.contact);
  const mail = document.createElement('a');
  mail.href = `mailto:${CONTACT.email}`;
  mail.textContent = CONTACT.email;
  const linktree = document.createElement('a');
  linktree.href = CONTACT.linktree;
  linktree.textContent = 'Linktree';
  linktree.rel = 'noreferrer';
  linktree.target = '_blank';

  const contactLine = document.createElement('p');
  contactLine.append('Reach out to ', mail, ' — also see our ', linktree, '.');
  contact.append(contactLine);

  const socials = document.createElement('nav');
  socials.className = 'socials';
  socials.setAttribute('aria-label', 'Social links');
  for (const s of SOCIALS) {
    const a = document.createElement('a');
    a.href = s.href;
    a.textContent = s.label;
    a.rel = 'noreferrer';
    a.target = '_blank';
    socials.append(a);
  }
  contact.append(socials);

  root.replaceChildren(hero, about, events, media, board, contact);
}
