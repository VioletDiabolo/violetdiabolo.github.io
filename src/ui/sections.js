import {
  SITE, ABOUT, EVENTS, CONTACT, SOCIALS, SECTION_HEADINGS, PHOTOS, HERO_TEASER,
} from '../content/index.js';
import { mountBoard } from './board.js';
import { mountMedia } from './media.js';
import { mountForms } from './forms.js';
import { buildPicture } from './picture.js';

/**
 * Every section is a self-contained PANEL, described by two attributes rather than a
 * place in a scroll choreography: `data-panel` names the LAYOUT (hero/story/feature/
 * grid), `data-surface` names the MATERIAL (solid/glass — whether the animated gradient
 * behind the page shows through). The hero carries no surface: the gradient itself is
 * the hero, so there is nothing to plate it against.
 *
 * Every panel is still the same two boxes arranged differently:
 *
 *   <section data-panel="..." data-surface="..."> <div class="room">
 *                                                    <div class="room-head"> ...text...
 *                                                    <div class="room-body"> ...everything else...
 *
 * The four patterns in src/styles/sections.css are nothing but four arrangements of that
 * pair, which is the whole reason the wrapper exists. The flat heading/paragraph/list
 * structure this replaces could not express any of them: a sticky text column standing
 * beside a scrolling column of cards needs the two to be SIBLINGS in a two-track grid,
 * and a composition pinned for the length of a multi-screen section needs one box to pin
 * rather than three that each stick at a separately guessed offset and drift apart as the
 * heading rewraps. `.room` is also the single reveal unit per section (src/ui/reveal.js).
 *
 * data-section, data-panel, data-surface, the id and the class all stay on the <section>
 * itself: the nav's hrefs (src/ui/nav.js) key off the same id they always did.
 */
function section(id, headingText, panel, surface, level = 'h2') {
  const el = document.createElement('section');
  el.id = id;
  el.dataset.section = id;
  el.dataset.panel = panel;
  if (surface) el.dataset.surface = surface;
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
  const hero = section('hero', SITE.name, 'hero', undefined, 'h1');
  hero.head.append(paragraph(SITE.tagline));
  hero.body.append(teaser());

  const about = section('about', ABOUT.heading, 'story', 'glass');
  about.head.append(paragraph(ABOUT.body));
  about.body.append(figure(PHOTOS.group, '(max-width: 900px) 92vw, 46vw', 'lazy'));

  const events = section('events', EVENTS.heading, 'feature', 'glass');
  events.body.append(paragraph(EVENTS.body));
  mountForms(events.body);

  const media = section('media', SECTION_HEADINGS.media, 'grid', 'solid');
  mountMedia(media.body);

  const board = section('board', SECTION_HEADINGS.board, 'grid', 'solid');
  mountBoard(board.body);

  const contact = section('contact', SECTION_HEADINGS.contact, 'grid', 'glass');
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

  // No 3D object plays behind this line any more (this branch strips it) -- sections.css's
  // .section-footer comment still walks through why it used to be left-aligned rather
  // than centred there; the other reason it gives (matching the rest of the page, which
  // is left-aligned throughout) is the one still live. Year is computed at render time,
  // never hardcoded.
  const footer = document.createElement('footer');
  footer.dataset.section = 'footer';
  footer.className = 'section-footer';
  const footerLine = document.createElement('p');
  footerLine.className = 'footer-line';
  footerLine.textContent = `${SITE.name} ${new Date().getFullYear()}`;
  footer.append(footerLine);

  root.replaceChildren(hero.el, about.el, events.el, media.el, board.el, contact.el, footer);
}
