import {
  SITE, ABOUT, EVENTS, CONTACT, SOCIALS, SECTION_HEADINGS, PHOTOS, HERO_TEASER,
} from '../content/index.js';
import { mountBoard } from './board.js';
import { mountMedia } from './media.js';
import { mountForms } from './forms.js';
import { buildPicture } from './picture.js';

/**
 * Every section is one ROOM, and every room is the same two boxes arranged differently:
 *
 *   <section data-room="..."> <div class="room"> <div class="room-head"> ...text...
 *                                                <div class="room-body"> ...everything else...
 *
 * The four patterns in src/styles/sections.css are nothing but four arrangements of that
 * pair, which is the whole reason the wrapper exists. The flat heading/paragraph/list
 * structure this replaces could not express any of them: a sticky text column standing
 * beside a scrolling column of cards needs the two to be SIBLINGS in a two-track grid,
 * and a composition pinned for the length of a multi-screen section needs one box to pin
 * rather than three that each stick at a separately guessed offset and drift apart as the
 * heading rewraps. `.room` is also the single reveal unit per section (src/ui/reveal.js).
 *
 * data-section, data-room, the id and the class all stay on the <section> itself:
 * src/ui/layout.js stamps data-side by querying [data-room], and the nav's hrefs and the
 * choreography's room pairing both key off the same element they always did.
 */
function room(id, headingText, pattern, level = 'h2') {
  const el = document.createElement('section');
  el.id = id;
  el.dataset.section = id;
  if (pattern) el.dataset.room = pattern;
  el.className = `section section-${id}`;

  const inner = document.createElement('div');
  inner.className = 'room';
  const head = document.createElement('div');
  head.className = 'room-head';
  const body = document.createElement('div');
  body.className = 'room-body';
  inner.append(head, body);
  el.append(inner);

  if (headingText) {
    const heading = document.createElement(level);
    heading.textContent = headingText;
    head.append(heading);
  }

  return { el, head, body };
}

function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function figure(photo, sizes, loading) {
  const fig = document.createElement('figure');
  fig.className = 'section-photo';
  fig.append(buildPicture(loading ? { ...photo, sizes, loading } : { ...photo, sizes }));
  return fig;
}

/**
 * The hero's one piece of furniture: a small card carrying when and where to turn up,
 * and a link to the section that says more. Its copy is content/'s (HERO_TEASER), never
 * this module's.
 */
function teaser() {
  const card = document.createElement('div');
  card.className = 'teaser';

  const when = document.createElement('p');
  when.className = 'teaser-when';
  when.textContent = HERO_TEASER.heading;

  const where = document.createElement('p');
  where.className = 'teaser-where';
  where.textContent = HERO_TEASER.detail;

  const link = document.createElement('a');
  link.className = 'teaser-link';
  link.href = `#${HERO_TEASER.action.target}`;
  link.textContent = HERO_TEASER.action.label;

  card.append(when, where, link);
  return card;
}

export function renderSections(root) {
  const hero = room('hero', SITE.name, 'hero', 'h1');
  hero.head.append(paragraph(SITE.tagline));
  hero.body.append(teaser());

  const about = room('about', ABOUT.heading, 'panel');
  about.head.append(paragraph(ABOUT.body));
  about.body.append(figure(PHOTOS.group, '(max-width: 900px) 92vw, 46vw', 'lazy'));

  const events = room('events', EVENTS.heading, 'showcase');
  events.body.append(paragraph(EVENTS.body));
  mountForms(events.body);

  const media = room('media', SECTION_HEADINGS.media, 'grid');
  mountMedia(media.body);

  const board = room('board', SECTION_HEADINGS.board, 'grid');
  mountBoard(board.body);

  const contact = room('contact', SECTION_HEADINGS.contact, 'grid');
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
  contact.head.append(contactLine);

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
  // Socials belong with the sign-off in the text column, not out among the pictures:
  // they are the same act (here is how to reach us), and split across two columns they
  // read as an unrelated strip of links.
  contact.head.append(socials);
  contact.body.append(figure(PHOTOS.wide, '(max-width: 900px) 92vw, 46vw'));

  // The choreography (src/scroll/choreography.js) is one continuous animation that
  // finishes back where it began -- assembled and face-on (the `settle` act) -- by the
  // time scroll reaches here. Year is computed at render time, never hardcoded.
  const footer = document.createElement('footer');
  footer.dataset.section = 'footer';
  footer.className = 'section-footer';
  const footerLine = document.createElement('p');
  footerLine.className = 'footer-line';
  footerLine.textContent = `${SITE.name} ${new Date().getFullYear()}`;
  footer.append(footerLine);

  root.replaceChildren(hero.el, about.el, events.el, media.el, board.el, contact.el, footer);
}
