// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderSections, renderAboutPage, renderMediaPage, renderJoinPage, RENDERERS, buildFooter,
  schedule, marqueeItem, observeMarqueeSpeed, MARQUEE_SPEED,
} from '../src/ui/sections.js';
import { mountBoard } from '../src/ui/board.js';
import { mountMedia, MEDIA_BLOCK, MEDIA_PREVIEW } from '../src/ui/media.js';
import { formButton, formById } from '../src/ui/forms.js';
import { PAGES, CTA, NAV_LINKS } from '../src/ui/nav.js';
import {
  BOARD, MEDIA, SITE, CONTACT, ABOUT, EVENTS, FORMS, PERFORMED_FOR, PAGE_COPY, HOME_SECTIONS,
  DISCORD, SOCIALS,
} from '../src/content/index.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

/** A page rendered into a fresh <main>, as main.js renders it. */
const rendered = (render) => { const root = document.createElement('main'); render(root); return root; };
const sectionIds = (root) => [...root.querySelectorAll('[data-section]')].map((e) => e.dataset.section);

describe('pages', () => {
  it('renders the home page as the first screen, then a preview of every other page', () => {
    // "For the main page, lets add a simplified version of all sections."
    expect(sectionIds(rendered(renderSections))).toEqual(['hero', 'about', 'media', 'join']);
  });

  it("previews the pages in the nav's own order, each with its way on", () => {
    // The previews follow the bar: About us, Media, then Join us -- the call to action
    // last, directly above the footer. Each one links to the page it previews.
    const order = [...NAV_LINKS.map((l) => l.page), CTA.page];
    const home = rendered(renderSections);
    const previews = sectionIds(home).slice(1);
    expect(previews).toEqual(order);
    for (const page of order) {
      const section = home.querySelector(`#${page}`);
      expect(section.querySelector('h2').textContent).toBe(HOME_SECTIONS[page].heading);
      const onward = section.querySelector(`a[href="${PAGES[page]}"]`);
      expect(onward, `the ${page} preview has no link to ${PAGES[page]}`).not.toBeNull();
      expect(onward.textContent.replace('→', '').trim()).toBe(HOME_SECTIONS[page].more);
    }
  });

  it('previews About us with the club\'s own story, and not the board', () => {
    const about = rendered(renderSections).querySelector('#about');
    expect(about.querySelector('.teaser-story').textContent).toBe(ABOUT.body);
    expect(about.querySelector('.board-list, [data-member]')).toBeNull();
  });

  it('previews Media with its newest videos, the same click-to-play cards as the page', () => {
    const media = rendered(renderSections).querySelector('#media');
    const cards = [...media.querySelectorAll('[data-video]')];
    expect(cards.map((c) => c.dataset.video))
      .toEqual(MEDIA.slice(0, MEDIA_PREVIEW).map((m) => m.youtubeId));
    expect(media.querySelectorAll('iframe'), 'a preview loads an embed up front').toHaveLength(0);
    cards[0].querySelector('button').click();
    expect(media.querySelector('iframe').src).toContain('youtube-nocookie.com');
  });

  it('keeps each preview link\'s arrow out of its accessible name', () => {
    // The arrow is decoration. Unhidden, "See all videos" would be announced as "See all
    // videos right arrow" -- and the label alone already says where the link goes.
    const links = [...rendered(renderSections).querySelectorAll('.more-link')];
    expect(links).toHaveLength(2);
    for (const link of links) {
      const arrow = link.querySelector('span');
      expect(arrow.textContent).toBe('→');
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('keeps the board off the home page', () => {
    // "Board can be in about us page so it will not appear in the default page."
    const home = rendered(renderSections);
    expect(home.querySelector('.board-list')).toBeNull();
    expect(home.querySelector('[data-member]')).toBeNull();
  });

  it('renders About us: its header, then the board', () => {
    const root = rendered(renderAboutPage);
    expect(sectionIds(root)).toEqual(['about', 'board']);
    expect(root.querySelector('#about h1').textContent).toBe(PAGE_COPY.about.heading);
    expect(root.querySelector('#about .page-label').textContent).toBe(PAGE_COPY.about.label);
    expect(root.querySelector('#about .page-lead').textContent).toBe(ABOUT.body);
    const newest = BOARD[Object.keys(BOARD)[0]];
    expect(root.querySelectorAll('#board [data-member]')).toHaveLength(newest.length);
    // The select sits in the panel's head, level with its heading, not above the grid.
    expect(root.querySelector('#board .room-head .semester-select')).not.toBeNull();
    expect(root.querySelector('#board .room-head h2').textContent).toBe(PAGE_COPY.about.team);
  });

  it('renders Media with the videos and not one photograph', () => {
    // "Remove images from media. Keep only the videos."
    const root = rendered(renderMediaPage);
    expect(sectionIds(root)).toEqual(['media', 'videos']);
    expect(root.querySelectorAll('[data-video]')).toHaveLength(MEDIA.length);
    expect(root.querySelector('picture, img, [data-photo]'), 'a photograph is back on Media')
      .toBeNull();
    expect(root.querySelector('#media .page-lead').textContent).toBe('Our performances and videos');
    // No label: it would repeat the heading word for word.
    expect(root.querySelector('#media .page-label')).toBeNull();
  });

  it('gives the videos a heading for the outline, and keeps it off the screen', () => {
    // h1, then each video's h3, would skip a level; the page header already says what
    // the list is, so the h2 is there for a screen reader's outline and nobody else.
    const heading = rendered(renderMediaPage).querySelector('#videos h2');
    expect(heading).not.toBeNull();
    expect(heading.className).toBe('visually-hidden');
    expect(heading.textContent).toBe(PAGE_COPY.media.videos);
  });

  it('renders Join us: its header, the practices, then every way in', () => {
    const root = rendered(renderJoinPage);
    expect(sectionIds(root)).toEqual(['join', 'practices', 'get-involved']);
    expect(root.querySelector('#join h1').textContent).toBe(PAGE_COPY.join.heading);
    expect(root.querySelectorAll('#practices .schedule-sessions li')).toHaveLength(EVENTS.sessions.length);
  });

  it('puts one h1 on every page, and the club name in the home page\'s', () => {
    for (const [page, render] of Object.entries(RENDERERS)) {
      const h1s = rendered(render).querySelectorAll('h1');
      expect(h1s, `${page} has ${h1s.length} h1s`).toHaveLength(1);
    }
    expect(rendered(renderSections).querySelector('h1').textContent).toContain(SITE.name);
  });

  it('has a renderer for every page the nav links to, and no other', () => {
    // A page file with no renderer boots into the home page (main.js); a renderer with no
    // page file is unreachable. Either way the two lists disagree.
    expect(Object.keys(RENDERERS).sort()).toEqual(Object.keys(PAGES).sort());
  });
});

describe('the footer', () => {
  it('is a real <footer>, on glass, so it is a landmark and its links have a floor', () => {
    const footer = buildFooter();
    expect(footer.tagName).toBe('FOOTER');
    expect(footer.dataset.surface).toBe('glass');
  });

  it('exposes its social links as a labelled nav landmark, Discord among them', () => {
    // Regression guard: this landmark was briefly a <div role="navigation">, which maps
    // to the same accessible role but is a single attribute nothing asserted -- a typo
    // or an edit that dropped it would silently demote the landmark with a green suite.
    // A real <nav> can't be lost that quietly.
    const socials = buildFooter().querySelector('.socials');
    expect(socials.tagName, 'the socials landmark is no longer a real <nav>').toBe('NAV');
    expect(socials.getAttribute('aria-label'), 'socials nav has no accessible name').toBeTruthy();
    const hrefs = [...socials.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(SOCIALS.map((s) => s.href));
    expect(hrefs).toContain(DISCORD);
    // Every icon link keeps its name in text, off screen, for the screen reader.
    for (const a of socials.querySelectorAll('a')) expect(a.textContent.trim().length).toBeGreaterThan(0);
  });

  it('carries the address and the Linktree, and no sentence round them', () => {
    // Contact was a panel with a paragraph ("Reach out to ... — also see our ..."); the
    // client asked for it compacted into a footer, so it is two links now.
    const contact = buildFooter().querySelector('.footer-contact');
    const links = [...contact.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([`mailto:${CONTACT.email}`, CONTACT.linktree]);
    expect(links[0].textContent).toBe(CONTACT.email);
    expect(contact.textContent.replace(/\s+/g, ''), 'there is copy between the links again')
      .toBe(`${CONTACT.email}Linktree`);
  });

  it('signs off with the club name and a computed year, as its last line', () => {
    const footer = buildFooter();
    const line = footer.querySelector('.footer-line');
    expect(line, 'no sign-off').not.toBeNull();
    expect(line.textContent).toBe(`${SITE.name} ${new Date().getFullYear()}`);
    expect(footer.lastElementChild).toBe(line);
  });

  it('is on no page body a renderer builds, because main.js mounts it after <main>', () => {
    // A <footer> nested in <main> is not the page's contentinfo landmark. The renderers
    // build the content; the footer is the boot's to place (tests/main.dom.test.js).
    for (const [page, render] of Object.entries(RENDERERS)) {
      expect(rendered(render).querySelector('footer, .footer-line'), `${page} renders its own footer`)
        .toBeNull();
    }
  });
});

describe('board', () => {
  it('defaults to the newest semester', () => {
    const el = document.getElementById('content');
    mountBoard(el);
    expect(el.querySelector('select').value).toBe(Object.keys(BOARD)[0]);
  });

  it('renders one card per member of the selected semester', () => {
    const el = document.getElementById('content');
    mountBoard(el);
    // The newest semester, read from BOARD rather than named: this was pinned to
    // 'Fall 2025' and broke the moment a newer board was added, which is the one thing
    // a roster is guaranteed to do.
    const newest = BOARD[Object.keys(BOARD)[0]];
    expect(el.querySelectorAll('[data-member]')).toHaveLength(newest.length);
  });

  it('swaps the roster when the semester changes', () => {
    const el = document.getElementById('content');
    mountBoard(el);
    const select = el.querySelector('select');
    select.value = 'Fall 2023';
    select.dispatchEvent(new Event('change'));
    expect(el.querySelectorAll('[data-member]')).toHaveLength(BOARD['Fall 2023'].length);
  });

  it('renders the open slot without an img element', () => {
    const el = document.getElementById('content');
    mountBoard(el);
    // Selected explicitly: the newest board is fully staffed and has no open slot, so
    // this has to go to a semester that does rather than assume the default does.
    const semester = Object.keys(BOARD).find((s) => BOARD[s].some((m) => m.placeholder));
    expect(semester, 'no semester has an open slot to render').toBeDefined();
    const select = el.querySelector('select');
    select.value = semester;
    select.dispatchEvent(new Event('change'));

    const cards = [...el.querySelectorAll('[data-member]')];
    const openSlot = cards.find((c) => c.dataset.placeholder === 'true');
    expect(openSlot).toBeDefined();
    expect(openSlot.querySelector('img')).toBeNull();
  });

  it('stands a 4:5 initials tile in for a seated member with no photograph', () => {
    // Not cosmetic. A card with a picture is ~300px taller than one without, so before
    // this a half-photographed roster dropped three of its six cards to a third the
    // height of their neighbours and read as broken rather than as pending.
    const el = document.getElementById('content');
    mountBoard(el);
    const roster = BOARD[Object.keys(BOARD)[0]];
    const waiting = roster.filter((m) => !m.image && !m.placeholder);
    expect(waiting.length, 'no seated member is waiting on a photograph').toBeGreaterThan(0);

    for (const member of waiting) {
      const card = el.querySelector(`[data-member="${member.name}"]`);
      const tile = card.querySelector('.board-photo-pending');
      expect(tile, `${member.name} has neither a photograph nor a stand-in`).not.toBeNull();
      const initials = member.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      expect(tile.textContent).toBe(initials);
      // The letters are decoration; the label is what a screen reader should hear.
      expect(tile.getAttribute('role')).toBe('img');
      expect(tile.getAttribute('aria-label')).toContain(member.name);
      expect(tile.querySelector('span').getAttribute('aria-hidden')).toBe('true');
    }

    // A member WITH a photograph gets the photograph and no tile.
    for (const member of roster.filter((m) => m.image)) {
      const card = el.querySelector(`[data-member="${member.name}"]`);
      expect(card.querySelector('img'), `${member.name} lost their photograph`).not.toBeNull();
      expect(card.querySelector('.board-photo-pending')).toBeNull();
    }
  });

  it('gives an open slot no tile, because there is nobody to photograph', () => {
    // The distinction the tile turns on: an unfilled SEAT is a different absence from a
    // filled seat with no picture yet, and giving it initials would invent a person.
    const el = document.getElementById('content');
    mountBoard(el);
    const semester = Object.keys(BOARD).find((k) => BOARD[k].some((m) => m.placeholder));
    const select = el.querySelector('select');
    select.value = semester;
    select.dispatchEvent(new Event('change'));

    const slot = [...el.querySelectorAll('[data-member]')].find((c) => c.dataset.placeholder === 'true');
    expect(slot).toBeDefined();
    expect(slot.querySelector('.board-photo-pending')).toBeNull();
    expect(slot.querySelector('img')).toBeNull();
  });

  it('ends the current board with a way in, and no older board', () => {
    // The client's reference ends its team grid with a dashed "+" card. It links to Join
    // us, and it is not a member: every count of [data-member] still counts people.
    const el = document.getElementById('content');
    mountBoard(el);
    const cards = el.querySelector('.board-list').children;
    const last = cards[cards.length - 1];
    expect(last.classList.contains('board-join'), 'the current board does not end on the way in').toBe(true);
    expect(last.getAttribute('href')).toBe(PAGES.join);
    expect(last.textContent).toBe(`+${CTA.label}`);
    expect(last.dataset.member).toBeUndefined();
    // The plus is decoration; the link's name is the label beside it.
    expect(last.querySelector('.board-join-tile').getAttribute('aria-hidden')).toBe('true');

    const select = el.querySelector('select');
    select.value = Object.keys(BOARD).at(-1);
    select.dispatchEvent(new Event('change'));
    expect(el.querySelector('.board-join'), 'an old board invites people to join it').toBeNull();
  });

  it('seats the select wherever it is told to, and the grid where it is mounted', () => {
    const grid = document.createElement('div');
    const controls = document.createElement('div');
    mountBoard(grid, { controls });
    expect(controls.querySelector('.semester-select')).not.toBeNull();
    expect(grid.querySelector('.semester-select')).toBeNull();
    expect(grid.querySelector('.board-list')).not.toBeNull();
  });

  it('renders a seated member whose photograph has not arrived, without an img', () => {
    // A distinct case from the open slot above, and new with the Fall 2026 board: a real
    // person holding a real role whose photo is not in public/images yet. The card must
    // still render -- name and role -- rather than being skipped or given a broken <img>,
    // and it must NOT be marked as a placeholder seat.
    const el = document.getElementById('content');
    mountBoard(el);
    const semester = Object.keys(BOARD)
      .find((s) => BOARD[s].some((m) => !m.image && !m.placeholder));
    expect(semester, 'no roster has a seated member without a photograph').toBeDefined();
    const select = el.querySelector('select');
    select.value = semester;
    select.dispatchEvent(new Event('change'));

    const member = BOARD[semester].find((m) => !m.image && !m.placeholder);
    const card = el.querySelector(`[data-member="${member.name}"]`);
    expect(card).not.toBeNull();
    expect(card.querySelector('img')).toBeNull();
    expect(card.dataset.placeholder).toBeUndefined();
    expect(card.textContent).toContain(member.position);
  });

  it('shows a name and a position on every card, on every board, and nothing under them', () => {
    // "remove the bio from all board members. We will just have position and name for
    // now." Checked on every semester, because the old boards carried the only real bios
    // there were, and a card is the same card whichever board it is on.
    const el = document.getElementById('content');
    mountBoard(el);
    const select = el.querySelector('select');
    for (const semester of Object.keys(BOARD)) {
      select.value = semester;
      select.dispatchEvent(new Event('change'));
      for (const member of BOARD[semester]) {
        const card = el.querySelector(`[data-member="${member.name}"]`);
        const text = [...card.querySelectorAll('h3, p')].map((n) => `${n.tagName}:${n.textContent}`);
        expect(text, `${semester}: ${member.name}`).toEqual([`H3:${member.name}`, `P:${member.position}`]);
      }
    }
  });
});

describe('media facades', () => {
  it('renders one facade per video and loads no iframe up front', () => {
    const el = document.getElementById('content');
    mountMedia(el);
    expect(el.querySelectorAll('[data-video]')).toHaveLength(MEDIA.length);
    expect(el.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('swaps in an iframe only once the facade is activated', () => {
    const el = document.getElementById('content');
    mountMedia(el);
    el.querySelector('[data-video] button').click();
    const frame = el.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame.src).toContain(MEDIA[0].youtubeId);
  });

  it('requests youtube-nocookie so a passive visitor is not tracked', () => {
    const el = document.getElementById('content');
    mountMedia(el);
    el.querySelector('[data-video] button').click();
    expect(el.querySelector('iframe').src).toContain('youtube-nocookie.com');
  });

  it('runs the videos in blocks of five that alternate which side leads', () => {
    // The client's reference: one large video and four small, then the next five with the
    // large one on the right. The lead of a right-led block is its LAST card, which is
    // what keeps reading order and tab order running the same way in both.
    const el = document.getElementById('content');
    mountMedia(el);
    const blocks = [...el.querySelectorAll('.media-block')];
    expect(blocks).toHaveLength(Math.ceil(MEDIA.length / MEDIA_BLOCK));
    expect(blocks.map((b) => b.dataset.lead)).toEqual(['left', 'right']);
    for (const [i, block] of blocks.entries()) {
      const ids = [...block.children].map((c) => c.dataset.video);
      expect(ids).toEqual(MEDIA.slice(i * MEDIA_BLOCK, (i + 1) * MEDIA_BLOCK).map((m) => m.youtubeId));
    }
    // The order across the page is still the content's order, block after block.
    expect([...el.querySelectorAll('[data-video]')].map((c) => c.dataset.video))
      .toEqual(MEDIA.map((m) => m.youtubeId));
  });

  it('keeps focus on the embed rather than dropping it to the body', () => {
    const el = document.getElementById('content');
    mountMedia(el);
    const button = el.querySelector('[data-video] button');
    button.focus();
    button.click();
    expect(document.activeElement.tagName).toBe('IFRAME');
  });
});

describe('form facades', () => {
  it('renders one facade per form on the Join us page and loads no iframe up front', () => {
    const root = rendered(renderJoinPage);
    expect(root.querySelectorAll('.join-card[data-form]')).toHaveLength(FORMS.length);
    expect(root.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('swaps in an iframe only once the facade is activated', () => {
    const el = document.getElementById('content');
    el.append(formButton(formById('interest')));
    el.querySelector('button[data-form]').click();
    const frame = el.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame.src).toBe(formById('interest').url);
    expect(frame.title).toBe(formById('interest').title);
  });

  it('keeps focus on the embed rather than dropping it to the body', () => {
    const el = document.getElementById('content');
    el.append(formButton(formById('request')));
    const button = el.querySelector('button[data-form]');
    button.focus();
    button.click();
    expect(document.activeElement.tagName).toBe('IFRAME');
  });

  it('refuses an id FORMS does not have, rather than rendering a card with nothing in it', () => {
    expect(() => formById('newsletter')).toThrow(/newsletter/);
  });
});

describe('the Join us page', () => {
  it('puts the interest form first and the booking request last, with the Discord between', () => {
    const cards = [...rendered(renderJoinPage).querySelectorAll('.join-ways > .join-card')];
    expect(cards.map((c) => c.dataset.form ?? c.dataset.link)).toEqual(['interest', 'discord', 'request']);
    expect(cards.map((c) => c.querySelector('h3').textContent)).toEqual([
      formById('interest').title, PAGE_COPY.join.discord.title, formById('request').title,
    ]);
  });

  it('links the Discord out, in a new tab and without a referrer', () => {
    const link = rendered(renderJoinPage).querySelector('[data-link="discord"] a');
    expect(link.getAttribute('href')).toBe(DISCORD);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noreferrer');
    expect(link.textContent).toBe(PAGE_COPY.join.discord.action);
  });
});

describe('the practice schedule', () => {
  it('lists each practice as a bullet, with the time in bold and the place marked', () => {
    // The client: "in bullet points and bold/highlight important dates/locations".
    const items = [...schedule().querySelectorAll('.schedule-sessions > li')];
    expect(items).toHaveLength(EVENTS.sessions.length);
    for (const [i, li] of items.entries()) {
      const session = EVENTS.sessions[i];
      expect(li.querySelector('strong').textContent).toBe(`${session.day}, ${session.time}`);
      expect(li.querySelector('mark').textContent).toBe(session.place);
      expect(li.textContent).toBe(`${session.day}, ${session.time} ${session.at} ${session.place}`);
    }
  });

  it('keeps the notes as bullets of their own, under the practices', () => {
    const notes = [...schedule().querySelectorAll('.schedule-notes > li')].map((li) => li.textContent);
    expect(notes).toEqual([...EVENTS.notes]);
  });

  it('states each practice once per page, on both pages that show it', () => {
    // One source (EVENTS) rendered on two pages, and once on each: two copies of the
    // times on one page is how they drifted apart in the first place.
    for (const [render, where] of [[renderSections, '#join'], [renderJoinPage, '#practices']]) {
      const root = rendered(render);
      for (const fact of ['Kimmel', 'Sylvette', '3–5 PM', '5–7 PM']) {
        const holders = [...root.querySelectorAll('*')].filter((el) =>
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(fact)));
        expect(holders.length, `"${fact}" appears in ${holders.length} places, not 1`).toBe(1);
        expect(holders[0].closest(where), `"${fact}" is outside ${where}`).not.toBeNull();
      }
    }
  });

  it('sends the home page on to Join us, where the forms went', () => {
    const link = rendered(renderSections).querySelector('#join a.button');
    expect(link, "the home page's Join us section has no way on to the page").not.toBeNull();
    expect(link.getAttribute('href')).toBe(PAGES.join);
    expect(link.textContent).toBe(HOME_SECTIONS.join.more);
    expect(rendered(renderSections).querySelector('[data-form], iframe'), 'a form is back on the home page')
      .toBeNull();
  });
});

describe('the performed-for marquee', () => {
  const render = () => { const root = document.createElement('main'); renderSections(root); return root; };

  it('sits on the first screen, directly under the wordmark and the photograph', () => {
    // "Move the marquee so that it is immediately visible. So it should be directly under
    // the image and violet diabolo text." It is the hero's last row, not a panel after it.
    const strip = render().querySelector('.marquee');
    expect(strip.closest('[data-section]').dataset.section).toBe('hero');
    const room = strip.closest('.room');
    expect(room.lastElementChild).toBe(strip);
    expect([...room.children].map((c) => c.className)).toEqual(['room-head', 'room-body', 'marquee']);
    // Its own band of glass: the hero under it is bare gradient.
    expect(strip.dataset.surface).toBe('glass');
  });

  it('runs the list twice, and hides the copy from assistive tech', () => {
    // The loop is two identical tracks translated by -50%; the duplicate is what makes
    // the reset seamless and `aria-hidden` is what stops a screen reader hearing the
    // club's whole performance history twice.
    const lists = render().querySelectorAll('.marquee-list');
    expect(lists).toHaveLength(2);
    expect(lists[0].hasAttribute('aria-hidden')).toBe(false);
    expect(lists[1].getAttribute('aria-hidden')).toBe('true');
    expect(lists[0].querySelectorAll('li')).toHaveLength(PERFORMED_FOR.length);
  });

  it('names every organisation in text, whether or not a mark was found', () => {
    const root = render();
    for (const org of PERFORMED_FOR) {
      const li = [...root.querySelectorAll('.marquee-list:not([aria-hidden]) li')]
        .find((x) => x.querySelector('.marquee-name')?.textContent === org.name);
      expect(li, `${org.name} is not in the strip`).toBeDefined();
      // The name is the constant. A mark is an addition beside it, so a chip with no
      // artwork still reads — which is the whole reason eight missing logos did not
      // have to become eight missing credits.
      expect(li.querySelector('.marquee-name').textContent).toBe(org.name);
      if (org.logo) {
        expect(li.querySelector('img'), `${org.name} has a logo configured but renders none`)
          .not.toBeNull();
        expect(li.dataset.logo).toBe(org.logo);
      } else {
        expect(li.querySelector('img'), `${org.name} has no logo but rendered one`).toBeNull();
      }
    }
  });

  it('says each organisation exactly once to a screen reader', () => {
    // The mark is decorative (alt="") precisely BECAUSE the name is beside it in text.
    // Give the image the name as well and every logo chip is read twice — which is what
    // the first version of this did, and what the nav's own logo rule already avoids.
    const root = render();
    for (const img of root.querySelectorAll('.marquee-list img')) {
      expect(img.getAttribute('alt'), 'a marquee mark announces itself as well as its name')
        .toBe('');
    }
    const withLogos = PERFORMED_FOR.filter((o) => o.logo).length;
    expect(withLogos, 'no logo chips left — this guard is checking nothing').toBeGreaterThan(0);
  });

  it('builds a logo chip that still carries the organisation name', () => {
    // Called directly, because every entry is name-only today and the logo branch is
    // therefore unreachable through renderSections. Without this the marquee would ship
    // a path nothing had ever run, to be discovered on the day the first mark arrives.
    const li = marqueeItem({ name: 'Chinatown Beautification Day', logo: 'logo-cyi' });
    const img = li.querySelector('img');
    expect(img, 'a configured logo rendered no image').not.toBeNull();
    expect(img.getAttribute('alt')).toBe('');
    expect(li.dataset.logo).toBe('logo-cyi');
    expect(li.querySelector('.marquee-name').textContent).toBe('Chinatown Beautification Day');
    // And the other branch, from the same entry point, so this test sees both.
    const plain = marqueeItem({ name: 'NYU Welcome', logo: null });
    expect(plain.querySelector('img')).toBeNull();
    expect(plain.querySelector('.marquee-name').textContent).toBe('NYU Welcome');
  });
});

describe('the hero and Join us photographs', () => {
  const render = () => { const root = document.createElement('main'); renderSections(root); return root; };

  it('opens on a photograph, loaded eagerly because it is above the fold', () => {
    const img = render().querySelector('#hero .section-photo img');
    expect(img, 'the hero has no photograph').not.toBeNull();
    // buildPicture defaults to lazy, which is right for every other photograph here and
    // wrong for this one: it is the first screen, and deferring it leaves the hero half
    // empty while the browser decides it was needed after all.
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.alt.length).toBeGreaterThan(0);
  });

  it("gives the home page's Join us section a photograph, lazily", () => {
    const img = render().querySelector('#join .section-photo img');
    expect(img, "the home page's Join us section has no photograph").not.toBeNull();
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders both as real <picture> elements, with AVIF and WebP sources and alt text', () => {
    const root = render();
    for (const id of ['hero', 'join']) {
      const picture = root.querySelector(`#${id} picture`);
      expect(picture, `#${id} has no <picture>`).not.toBeNull();
      expect(picture.querySelectorAll('source[type="image/avif"]').length).toBeGreaterThan(0);
      expect(picture.querySelectorAll('source[type="image/webp"]').length).toBeGreaterThan(0);
      expect(picture.querySelector('img').alt.length).toBeGreaterThan(0);
    }
  });
});

describe('content boundary', () => {
  it('keeps club copy out of ui modules, which must read it from content/', () => {
    // Built from a plain path, not `new URL(..., import.meta.url)`: under this file's
    // jsdom environment, Vitest's global URL shim resolves relative file: URLs against
    // http://localhost:3000 instead of the filesystem, which breaks fs.readdirSync(url).
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/ui/');
    const forbidden = [
      SITE.name, SITE.tagline, CONTACT.email,
      ABOUT.body.slice(0, 60), EVENTS.intro,
      ...EVENTS.sessions.map((s) => s.place), ...EVENTS.notes,
      PAGE_COPY.about.heading, PAGE_COPY.media.lead, PAGE_COPY.join.heading, PAGE_COPY.join.lead,
      PAGE_COPY.join.discord.action,
      ...Object.values(HOME_SECTIONS).map((copy) => copy.more),
      ...MEDIA.map((m) => m.name),
    ];
    for (const file of readdirSync(dir)) {
      // Code only. The comments quote the client's own words to explain a decision --
      // the sentence the schedule used to be, the line Media's lead replaced -- and a
      // quotation in a comment is the opposite of copy baked into the markup.
      const source = readFileSync(path.join(dir, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1');
      for (const literal of forbidden) {
        expect(source, `src/ui/${file} hardcodes club copy: "${literal}"`).not.toContain(literal);
      }
    }
  });
});

/* ---------------------------------------------------------------------------
 * The marquee's pace.
 *
 * Driven with a stub observer rather than grepping the stylesheet for a number, so
 * "measured and published" stays distinguishable from "measured and dropped" — the same
 * distinction observeNavHeight's tests were written for.
 * ------------------------------------------------------------------------- */

describe('observeMarqueeSpeed', () => {
  /** A ResizeObserver stand-in; jsdom has none, which is also the no-support branch. */
  function stubResizeObserver() {
    const instances = [];
    class Stub {
      constructor(callback) { this.callback = callback; this.observed = []; this.disconnected = false; instances.push(this); }
      observe(el) { this.observed.push(el); }
      disconnect() { this.disconnected = true; }
      fire() { this.callback([], this); }
    }
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = Stub;
    return { instances, restore: () => { globalThis.ResizeObserver = previous; } };
  }

  /** A strip whose track measures `width`, mounted so isConnected is true. */
  const strip = (width) => {
    const el = document.createElement('div');
    el.className = 'marquee';
    const track = document.createElement('div');
    track.className = 'marquee-track';
    track.getBoundingClientRect = () => ({ width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 });
    el.append(track);
    document.body.append(el);
    return el;
  };

  it('publishes the duration the measured width implies, at a constant speed', () => {
    const { instances, restore } = stubResizeObserver();
    try {
      const el = strip(9240);
      observeMarqueeSpeed(el);
      const observer = instances.at(-1);
      expect(observer.observed.map((n) => n.className)).toContain('marquee-track');
      // Nothing until it fires: the value is a MEASUREMENT, not a guess at mount time.
      expect(el.style.getPropertyValue('--marquee-duration')).toBe('');

      observer.fire();
      // Half the track, because that is the distance the keyframes travel (-50%).
      expect(el.style.getPropertyValue('--marquee-duration'))
        .toBe(`${(9240 / 2) / MARQUEE_SPEED}s`);
    } finally { restore(); }
  });

  it('gives a longer list more time, so the speed does not change with the content', () => {
    // The whole point. A fixed duration over a fixed distance means the SPEED is whatever
    // the list length makes it, which is how this rotted twice.
    const { instances, restore } = stubResizeObserver();
    try {
      const shortStrip = strip(4739);   // the seven-name track
      observeMarqueeSpeed(shortStrip);
      instances.at(-1).fire();
      const longStrip = strip(9240);    // eighteen names with logos
      observeMarqueeSpeed(longStrip);
      instances.at(-1).fire();

      const secs = (el) => parseFloat(el.style.getPropertyValue('--marquee-duration'));
      expect(secs(longStrip)).toBeGreaterThan(secs(shortStrip));
      // Same pixels per second out of both, which is the invariant.
      expect((4739 / 2) / secs(shortStrip)).toBeCloseTo(MARQUEE_SPEED, 6);
      expect((9240 / 2) / secs(longStrip)).toBeCloseTo(MARQUEE_SPEED, 6);
    } finally { restore(); }
  });

  it('writes nothing without a ResizeObserver, leaving the CSS fallback', () => {
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = undefined;
    try {
      const el = strip(9240);
      const stop = observeMarqueeSpeed(el);
      expect(el.style.getPropertyValue('--marquee-duration')).toBe('');
      expect(typeof stop).toBe('function');
      stop();
    } finally { globalThis.ResizeObserver = previous; }
  });

  it('disconnects and clears once the strip leaves the document', () => {
    const { instances, restore } = stubResizeObserver();
    try {
      const el = strip(9240);
      observeMarqueeSpeed(el);
      const observer = instances.at(-1);
      observer.fire();
      expect(el.style.getPropertyValue('--marquee-duration')).not.toBe('');

      el.querySelector('.marquee-track').remove();
      observer.fire();
      expect(observer.disconnected, 'kept observing a track that is gone').toBe(true);
      expect(el.style.getPropertyValue('--marquee-duration'),
        'left a stale duration behind rather than falling back to the stylesheet').toBe('');
    } finally { restore(); }
  });
});
