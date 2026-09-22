import {
  SITE, ABOUT, EVENTS, CONTACT, SOCIALS, SECTION_HEADINGS, PHOTOS, MEDIA_INTRO,
} from '../content/index.js';
import { mountBoard } from './board.js';
import { mountMedia } from './media.js';
import { mountGallery } from './gallery.js';
import { buildIcon } from './icons.js';
import { PERFORMED_FOR } from '../content/index.js';
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

  return { el, room: inner, head, body };
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
 * The club name and the year, as the last line INSIDE the last panel.
 *
 * There is no standalone <footer> any more. It was a full-bleed strip after the contact
 * panel with one line in it, and between the panel's own bottom gap and the strip's
 * padding the page ended on a screenful of gradient -- "remove the whitespace from the
 * bottom entirely, treat Contact us as a footer". So the sign-off moved inside, the last
 * panel loses its trailing gap (sections.css), and the page now ends on the plate.
 *
 * Appended to `.room` rather than to head or body: it spans both of a grid panel's
 * columns, which neither of those can do from inside one of them.
 */
function signoff() {
  const line = document.createElement('p');
  line.className = 'footer-line';
  // Computed at render time, never hardcoded.
  line.textContent = `${SITE.name} ${new Date().getFullYear()}`;
  return line;
}

/**
 * The media page's own body. Same nav, same gradient, same panel vocabulary — the videos
 * and the practice gallery simply have a page to themselves instead of a panel at the
 * bottom of the home page, at the client's request.
 *
 * Not a second entry point: index.html and media.html both load src/main.js and differ
 * only by `data-page` on <body>. The boot sequence in main.js is load-bearing (content
 * before any graphics branch, the reduced-motion return, the no-IntersectionObserver
 * guard) and a second copy of it is a second thing to get wrong.
 */
export function renderMediaPage(root) {
  const media = section('media', SECTION_HEADINGS.media, 'page', 'solid');
  media.head.append(paragraph(MEDIA_INTRO));
  mountMedia(media.body);
  mountGallery(media.body);
  media.room.append(signoff());

  root.replaceChildren(media.el);
}

/**
 * One chip in the marquee: a mark if the organisation has given us one, its name if not.
 *
 * Exported for the tests, and that is the whole reason it is a named function. Every
 * entry in PERFORMED_FOR is name-only today, so the logo branch is unreachable from
 * renderSections — code that ships untested until the first logo lands, which is exactly
 * when nobody is looking. A test can call this directly with a synthetic entry.
 */
export function marqueeItem(org) {
  const li = document.createElement('li');
  if (org.logo) {
    li.dataset.logo = org.logo;
    // alt="" — decorative, because the name is right beside it in text. Giving the mark
    // the name as well would have a screen reader read every organisation twice. This is
    // the opposite of the nav, where the logo sits inside a link that already has a name:
    // same rule, which is that the name is said exactly once.
    li.append(buildPicture({
      base: org.logo, widths: [120, 240], alt: '', sizes: '120px', loading: 'lazy',
    }));
  }
  // The name always renders, logo or not. A mark is an addition beside it, never a
  // replacement for it, so a chip nobody could find artwork for still reads — and the
  // strip does not look half-finished because eight of eighteen came up empty.
  const name = document.createElement('span');
  name.className = 'marquee-name';
  name.textContent = org.name;
  li.append(name);
  return li;
}

/**
 * The names the club has performed under, running as a marquee.
 *
 * The list is duplicated into a second track and the pair is translated by exactly -50%,
 * so the moment the first track leaves the frame the second is where it started and the
 * loop has no seam. That is why `aria-hidden` is on the copy and not on both: a screen
 * reader should hear the list once, and a keyboard user should never tab into a duplicate.
 *
 * It is a <ul>, so what is announced is a list of seven organisations rather than one
 * run-on line, and it stops on `prefers-reduced-motion` (src/styles/sections.css) — a
 * loop that cannot be paused is the accessibility complaint this pattern usually earns.
 */
function marquee() {
  const strip = document.createElement('div');
  strip.className = 'marquee';
  strip.dataset.marquee = 'performed-for';

  const track = document.createElement('div');
  track.className = 'marquee-track';

  const list = (hidden) => {
    const ul = document.createElement('ul');
    ul.className = 'marquee-list';
    if (hidden) ul.setAttribute('aria-hidden', 'true');
    for (const org of PERFORMED_FOR) ul.append(marqueeItem(org));
    return ul;
  };

  track.append(list(false), list(true));
  strip.append(track);
  return strip;
}

export function renderSections(root) {
  const hero = section('hero', SITE.name, 'hero', undefined, 'h1');
  hero.head.append(paragraph(SITE.tagline));
  // 'eager', unlike every other photograph on the page: this one is above the fold, and
  // buildPicture defaults to lazy, which would leave the first screen half empty while
  // the browser decided it was needed after all.
  hero.body.append(figure(PHOTOS.hero, '(max-width: 767px) 92vw, 46vw', 'eager'));

  const about = section('about', ABOUT.heading, 'story', 'glass');
  about.head.append(paragraph(ABOUT.body));
  about.body.append(figure(PHOTOS.group, '(max-width: 900px) 92vw, 46vw', 'lazy'));
  about.room.append(marquee());

  // The copy and both form buttons go in the HEAD, which is the left column; the body
  // holds nothing but the photograph. Before this the head was the heading alone and
  // everything else sat in the right column, leaving the bottom-left quadrant of a
  // full-screen panel empty — the "unnecessary white space on the left side" the client
  // photographed.
  const events = section('events', EVENTS.heading, 'feature', 'glass');
  events.head.append(paragraph(EVENTS.body));
  mountForms(events.head);
  events.body.append(figure(PHOTOS.events, '(max-width: 767px) 92vw, 34vw', 'lazy'));

  const board = section('board', SECTION_HEADINGS.board, 'grid', 'solid');
  mountBoard(board.body);

  // Solid, not glass. Contact is the page's practical endpoint -- an address, the
  // socials and a photograph -- and closing on a plate before the footer releases back to
  // bare gradient is a firmer ending than fading out through a translucent panel. The
  // surface map and the reasoning for each entry are at the top of src/styles/sections.css.
  const contact = section('contact', SECTION_HEADINGS.contact, 'grid', 'solid');
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
    a.rel = 'noreferrer';
    a.target = '_blank';
    const mark = buildIcon(s.icon);
    if (mark) a.append(mark);
    // The label is always in the DOM, never replaced by the mark: it is the link's
    // accessible name. `.visually-hidden` takes it off the screen without taking it out
    // of the accessibility tree, and it comes back as visible text if the icon is ever
    // missing (buildIcon returns null), so a link can never end up with no name at all.
    const label = document.createElement('span');
    label.className = mark ? 'visually-hidden' : '';
    label.textContent = s.label;
    a.append(label);
    if (mark) a.title = s.label;
    socials.append(a);
  }
  // Socials belong with the sign-off in the text column, not out among the pictures:
  // they are the same act (here is how to reach us), and split across two columns they
  // read as an unrelated strip of links.
  contact.head.append(socials);
  contact.body.append(figure(PHOTOS.wide, '(max-width: 900px) 92vw, 46vw'));

  contact.room.append(signoff());

  root.replaceChildren(hero.el, about.el, events.el, board.el, contact.el);
}
