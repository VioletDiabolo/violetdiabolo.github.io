import {
  SITE, ABOUT, EVENTS, CONTACT, SOCIALS, PHOTOS, PAGE_COPY, HOME_SECTIONS, PERFORMED_FOR, DISCORD,
} from '../content/index.js';
import { mountBoard } from './board.js';
import { mountMedia, mountMediaPreview } from './media.js';
import { buildIcon } from './icons.js';
import { formButton, formById } from './forms.js';
import { buildPicture } from './picture.js';
import { PAGES } from './nav.js';

/**
 * Every section is a self-contained PANEL, described by two attributes rather than a
 * place in a scroll choreography: `data-panel` names the LAYOUT, `data-surface` names the
 * MATERIAL. There is one material now -- glass, which lets the gradient show through --
 * and the panels that carry none sit on the gradient itself.
 *
 *   hero     the home page's first screen: the wordmark, the photograph, and the
 *            performed-for marquee directly under both. No surface.
 *   teaser   a home-page preview of another page: its heading and a link to the rest of
 *            it on one line, then a taste of what is there. Glass.
 *   feature  the home page's Join us section: the schedule beside a photograph. Glass.
 *   header   a sub-page's opening: a label, a heading and a lead, centred. No surface.
 *   plate    a sub-page's content at full width -- the board, the videos, the ways to
 *            join. Glass.
 *
 * Every panel is still the same two boxes arranged differently:
 *
 *   <section data-panel="..." data-surface="..."> <div class="room">
 *                                                    <div class="room-head"> ...text...
 *                                                    <div class="room-body"> ...everything else...
 *
 * The patterns in src/styles/sections.css are nothing but arrangements of that pair.
 * `.room` is also the single reveal unit per section (src/ui/reveal.js).
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

function paragraph(text, className) {
  const p = document.createElement('p');
  p.textContent = text;
  if (className) p.className = className;
  return p;
}

function figure(photo, sizes, loading) {
  const fig = document.createElement('figure');
  fig.className = 'section-photo';
  fig.append(buildPicture(loading ? { ...photo, sizes, loading } : { ...photo, sizes }));
  return fig;
}

/** A link styled as the page's filled control, for a place that is not a form. */
function buttonLink(href, label, { external = false } = {}) {
  const a = document.createElement('a');
  a.className = 'button';
  a.href = href;
  if (external) {
    a.rel = 'noreferrer';
    a.target = '_blank';
  }
  a.append(label);
  return a;
}

/**
 * The link from a home-page preview to the page it previews.
 *
 * The arrow is decoration, so it is hidden from assistive tech: the link's name is the
 * label alone ("See all videos"), not "See all videos right arrow".
 */
function moreLink(href, label) {
  const a = document.createElement('a');
  a.className = 'more-link';
  a.href = href;
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  a.append(label, arrow);
  return a;
}

/**
 * A sub-page's opening, after the client's team-page reference: a small label, a
 * statement heading, one line of lead, centred on the bare gradient.
 *
 * The page's only h1. The label is optional -- Media has none, because it would repeat
 * the heading word for word -- and so is the lead. The body box goes: a header has
 * nothing but reading text, and an empty box is one more thing for a layout rule to
 * size by accident.
 */
function pageHeader(id, { label, heading, lead }) {
  const header = section(id, heading, 'header', undefined, 'h1');
  if (label) header.head.prepend(paragraph(label, 'page-label'));
  if (lead) header.head.append(paragraph(lead, 'page-lead'));
  header.body.remove();
  return header;
}

/**
 * The practice schedule, as a list.
 *
 * It was one sentence -- "Two practices a week: Sundays 3-5PM in Kimmel Center, Room 606,
 * and Fridays 5-7PM outdoors at the Bust of Sylvette..." -- and the client asked for it
 * as bullets with the dates and places standing out. The day and time are <strong>, the
 * place is a <mark>: two different emphases because they answer two different questions
 * (when, and where), and a visitor scanning for one should not have to read the other.
 *
 * Rendered from EVENTS on both pages that show it -- the home page's events panel and the
 * Join us page -- so the two cannot drift.
 */
export function schedule() {
  const wrap = document.createElement('div');
  wrap.className = 'schedule';

  const sessions = document.createElement('ul');
  sessions.className = 'schedule-sessions';
  for (const session of EVENTS.sessions) {
    const li = document.createElement('li');
    const when = document.createElement('strong');
    when.textContent = `${session.day}, ${session.time}`;
    const where = document.createElement('mark');
    where.textContent = session.place;
    li.append(when, ` ${session.at} `, where);
    sessions.append(li);
  }

  const notes = document.createElement('ul');
  notes.className = 'schedule-notes';
  for (const note of EVENTS.notes) {
    const li = document.createElement('li');
    li.textContent = note;
    notes.append(li);
  }

  wrap.append(paragraph(EVENTS.intro, 'schedule-intro'), sessions, notes);
  return wrap;
}

/**
 * The club name and the year: the last line of every page.
 *
 * Computed at render time, never hardcoded.
 */
function signoff() {
  const line = document.createElement('p');
  line.className = 'footer-line';
  line.textContent = `${SITE.name} ${new Date().getFullYear()}`;
  return line;
}

/**
 * The socials, as a labelled landmark of icon links.
 *
 * The label is always in the DOM, never replaced by the mark: it is the link's accessible
 * name. `.visually-hidden` takes it off the screen without taking it out of the
 * accessibility tree, and it comes back as visible text if the icon is ever missing
 * (buildIcon returns null), so a link can never end up with no name at all.
 */
function socialLinks() {
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
    const label = document.createElement('span');
    label.className = mark ? 'visually-hidden' : '';
    label.textContent = s.label;
    a.append(label);
    if (mark) a.title = s.label;
    socials.append(a);
  }
  return socials;
}

/**
 * The footer: what the Contact panel became, on every page.
 *
 * The client asked for Contact to be compacted into "more of a footer". It was a
 * two-column panel -- a sentence and the socials on the left, a photograph on the right,
 * and the sign-off under the LEFT column only, which is why its hairline stopped a third
 * of the way across the page and its text centred on nothing in particular. Now it is one
 * centred column at the full width of the page: the socials, the address and the
 * Linktree, then the sign-off under a hairline that runs the whole way.
 *
 * A real <footer> OUTSIDE <main> (src/main.js mounts it), so it is the page's contentinfo
 * landmark; inside <main> it would be an anonymous box. Glass, because the address and
 * the Linktree are --accent links, and an accent link on the bare gradient measures
 * 2.06:1 against the brightest pixel the shader can draw.
 */
export function buildFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.dataset.surface = 'glass';

  const mail = document.createElement('a');
  mail.href = `mailto:${CONTACT.email}`;
  mail.textContent = CONTACT.email;
  const linktree = document.createElement('a');
  linktree.href = CONTACT.linktree;
  linktree.textContent = 'Linktree';
  linktree.rel = 'noreferrer';
  linktree.target = '_blank';

  // A list, so the separator between the two is drawn by the stylesheet rather than
  // spoken: a middle dot in the text is read out as "dot" by some screen readers.
  const contact = document.createElement('ul');
  contact.className = 'footer-contact';
  for (const link of [mail, linktree]) {
    const li = document.createElement('li');
    li.append(link);
    contact.append(li);
  }

  footer.append(socialLinks(), contact, signoff());
  return footer;
}

/**
 * How fast the marquee travels, in CSS pixels per second.
 *
 * This is the number the strip was tuned to read at, and it is now the thing held
 * constant rather than the duration. The CSS animation moves a FIXED DISTANCE (half the
 * track), so a fixed duration means the speed is set by how long the list happens to be:
 * going from 7 organisations to 18 took it from 56px/s to 87px/s with no rule changing,
 * and making the logos taller on desktop would have done it again.
 */
export const MARQUEE_SPEED = 66;

/**
 * Keeps the strip at MARQUEE_SPEED by writing the duration its measured width implies.
 *
 * A ResizeObserver rather than a one-off measurement, and for the same reasons
 * observeNavHeight uses one (src/ui/nav.js): the track's width changes on things `resize`
 * never fires for — a webfont swapping in and re-measuring every name, the logos crossing
 * a breakpoint, a name being added — and it needs no teardown bookkeeping in main.js.
 *
 * No feedback loop: --marquee-duration feeds `animation-duration` and nothing the track's
 * width depends on, so writing it cannot resize the thing being observed.
 *
 * Writes nothing while the width is 0 (jsdom has no layout) and leaves the CSS fallback
 * in place, which is also what a browser without ResizeObserver gets.
 *
 * @returns {() => void} a disposer.
 */
export function observeMarqueeSpeed(strip) {
  const track = strip?.querySelector('.marquee-track');
  const stop = () => strip?.style.removeProperty('--marquee-duration');
  if (!track || typeof ResizeObserver !== 'function') return stop;
  const observer = new ResizeObserver(() => {
    if (!track.isConnected) {
      observer.disconnect();
      stop();
      return;
    }
    const { width } = track.getBoundingClientRect();
    // Half, because that is the distance the keyframes actually travel (-50%).
    if (width > 0) strip.style.setProperty('--marquee-duration', `${(width / 2) / MARQUEE_SPEED}s`);
  });
  observer.observe(track);
  return () => { observer.disconnect(); stop(); };
}

/**
 * One chip in the marquee: a mark if the organisation has given us one, its name if not.
 *
 * Exported for the tests, so both branches can be driven with a synthetic entry rather
 * than depending on which organisations happen to have a mark today.
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
  // strip does not look half-finished because four of eighteen came up empty.
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
 * It is a <ul>, so what is announced is a list of organisations rather than one run-on
 * line, and it stops on `prefers-reduced-motion` (src/styles/sections.css) — a loop that
 * cannot be paused is the accessibility complaint this pattern usually earns.
 *
 * Glass, a band of its own. It moved out of the About panel's tinted glass onto the
 * hero, which is bare gradient -- where --ink-dim names and marks chosen against a dark
 * panel would both be at the mercy of whichever ribbon passed behind them.
 */
function marquee() {
  const strip = document.createElement('div');
  strip.className = 'marquee';
  strip.dataset.marquee = 'performed-for';
  strip.dataset.surface = 'glass';

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
  // Measured here rather than in renderSections: the strip's pace is the strip's business,
  // the same call nav.js makes about its own height.
  observeMarqueeSpeed(strip);
  return strip;
}

/**
 * The home page: the first screen, then a simplified version of every other page, in the
 * nav's order -- About us, Media, Join us -- at the client's request ("For the main page,
 * lets add a simplified version of all sections"). Each is a taste and a way on: the
 * club's story and "Meet the board", the three newest videos and "See all videos", the
 * practice times and "How to join". Ending on Join us puts the call to action last,
 * directly above the footer.
 *
 * The marquee is the last thing inside the hero rather than a panel of its own, which is
 * what puts it on the first screen: the hero is a screen tall and ends on it, directly
 * under the wordmark and the photograph, at the client's request ("immediately visible").
 * A panel after the hero would start a screen down, wherever the hero happened to end.
 */
export function renderSections(root) {
  const hero = section('hero', SITE.name, 'hero', undefined, 'h1');
  hero.head.append(paragraph(SITE.tagline));
  // 'eager', unlike every other photograph on the site: this one is above the fold, and
  // buildPicture defaults to lazy, which would leave the first screen half empty while
  // the browser decided it was needed after all.
  hero.body.append(figure(PHOTOS.hero, '(max-width: 767px) 92vw, 46vw', 'eager'));
  hero.room.append(marquee());

  // About us, simplified: the club's own account of itself, which is also the About
  // page's lead. The board stays on its page -- "Meet the board" is the way to it.
  const about = section('about', HOME_SECTIONS.about.heading, 'teaser', 'glass');
  about.head.append(moreLink(PAGES.about, HOME_SECTIONS.about.more));
  about.body.append(paragraph(ABOUT.body, 'teaser-story'));

  // Media, simplified: the newest videos, laid out as the Media page lays out its own.
  const media = section('media', HOME_SECTIONS.media.heading, 'teaser', 'glass');
  media.head.append(moreLink(PAGES.media, HOME_SECTIONS.media.more));
  mountMediaPreview(media.body);

  // Join us, simplified: the practice times on the left, the photograph on the right,
  // and the way on to the page with the forms and the Discord.
  const join = section('join', HOME_SECTIONS.join.heading, 'feature', 'glass');
  join.head.append(schedule(), buttonLink(PAGES.join, HOME_SECTIONS.join.more));
  join.body.append(figure(PHOTOS.events, '(max-width: 767px) 92vw, 34vw', 'lazy'));

  root.replaceChildren(hero.el, about.el, media.el, join.el);
}

/**
 * About us: the club's account of itself as the page lead, then the board.
 *
 * The board moved here from the home page at the client's request ("Board can be in
 * about us page so it will not appear in the default page"), laid out after the team
 * page they pointed at: four cards across, name, role and bio, and a dashed card at the
 * end that is the way in (src/ui/board.js).
 */
export function renderAboutPage(root) {
  const copy = PAGE_COPY.about;
  const header = pageHeader('about', copy);
  const board = section('board', copy.team, 'plate', 'glass');
  mountBoard(board.body, { controls: board.head });
  root.replaceChildren(header.el, board.el);
}

/**
 * Media: the videos, and only the videos. The practice gallery that shared this page went
 * at the client's request; the ten videos run in blocks of five that alternate which side
 * their lead sits on (src/ui/media.js).
 *
 * The videos' h2 is for the outline and is not shown: without it the page would go h1,
 * then straight to each video's h3, and the header above already says what the list is.
 */
export function renderMediaPage(root) {
  const copy = PAGE_COPY.media;
  const header = pageHeader('media', copy);
  const videos = section('videos', null, 'plate', 'glass');
  const heading = document.createElement('h2');
  heading.className = 'visually-hidden';
  heading.textContent = copy.videos;
  videos.head.replaceWith(heading);
  mountMedia(videos.body);
  root.replaceChildren(header.el, videos.el);
}

/** A card on the Join us page: a heading and the one thing it lets you do. */
function joinCard(title, action) {
  const card = document.createElement('div');
  card.className = 'join-card';
  const heading = document.createElement('h3');
  heading.textContent = title;
  card.append(heading, action);
  return card;
}

function formCard(form) {
  const card = joinCard(form.title, formButton(form));
  card.dataset.form = form.id;
  return card;
}

function discordCard() {
  const { title, action } = PAGE_COPY.join.discord;
  const link = buttonLink(DISCORD, action, { external: true });
  const mark = buildIcon('discord');
  if (mark) link.prepend(mark);
  const card = joinCard(title, link);
  card.dataset.link = 'discord';
  return card;
}

/**
 * Join us: when and where practice is, and every way in.
 *
 * The two forms used to be buttons in the home page's events panel. They live here now,
 * with the Discord the client asked to add, each in a card of its own: the interest form
 * first, because that is what someone arriving from "Join us" came to do, and the
 * performance request last, because it is for somebody else entirely -- a host booking
 * the club.
 */
export function renderJoinPage(root) {
  const copy = PAGE_COPY.join;
  const header = pageHeader('join', copy);

  const practices = section('practices', copy.practices, 'plate', 'glass');
  practices.body.append(schedule());

  const involved = section('get-involved', copy.involved, 'plate', 'glass');
  const ways = document.createElement('div');
  ways.className = 'join-ways';
  ways.append(formCard(formById('interest')), discordCard(), formCard(formById('request')));
  involved.body.append(ways);

  root.replaceChildren(header.el, practices.el, involved.el);
}

/**
 * Every page on the site, by the `data-page` its HTML file carries. One boot for all four
 * (src/main.js): the page files differ by that attribute alone.
 */
export const RENDERERS = Object.freeze({
  home: renderSections,
  about: renderAboutPage,
  media: renderMediaPage,
  join: renderJoinPage,
});
