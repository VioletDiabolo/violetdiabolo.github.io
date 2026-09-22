// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderSections, renderMediaPage, marqueeItem } from '../src/ui/sections.js';
import { mountBoard } from '../src/ui/board.js';
import { mountMedia } from '../src/ui/media.js';
import { mountGallery } from '../src/ui/gallery.js';
import { mountForms } from '../src/ui/forms.js';
import {
  BOARD, MEDIA, SITE, CONTACT, ABOUT, EVENTS, FORMS, PRACTICE_PHOTOS, PERFORMED_FOR,
} from '../src/content/index.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('sections', () => {
  it('renders every scroll section with a data-section hook', () => {
    // Five panels, not six: media moved to its own page at the client's request.
    renderSections(document.getElementById('content'));
    const found = [...document.querySelectorAll('[data-section]')].map((e) => e.dataset.section);
    // No 'footer' entry: the standalone strip is gone and the sign-off is a line inside
    // the contact panel, which the client asked to be treated as the footer.
    expect(found).toEqual(['hero', 'about', 'events', 'board', 'contact']);
  });

  it('renders the media page, with the videos and the gallery on it', () => {
    // The other half of that move, and the reason it is asserted here rather than left
    // implied: deleting the media panel from renderSections passes its own test whether
    // or not anything renders the videos anywhere else.
    const root = document.getElementById('content');
    renderMediaPage(root);
    const found = [...root.querySelectorAll('[data-section]')].map((e) => e.dataset.section);
    expect(found).toEqual(['media']);
    expect(root.querySelectorAll('[data-video]')).toHaveLength(MEDIA.length);
    expect(root.querySelectorAll('[data-photo]').length).toBeGreaterThan(0);
    // Exactly one h1-less page: the club name belongs to the home page's hero.
    expect(root.querySelectorAll('h1')).toHaveLength(0);
  });

  it('puts the club name in the one and only h1', () => {
    renderSections(document.getElementById('content'));
    const h1s = document.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain(SITE.name);
  });
});

describe('contact', () => {
  it('exposes its social links as a labelled nav landmark', () => {
    // Regression guard: this landmark was briefly a <div role="navigation">, which maps
    // to the same accessible role but is a single attribute nothing asserted -- a typo
    // or an edit that dropped it would silently demote the landmark with a green suite.
    // A real <nav> can't be lost that quietly.
    renderSections(document.getElementById('content'));
    const contact = document.querySelector('[data-section="contact"]');
    const socials = contact.querySelector('.socials');
    expect(socials.tagName, 'the socials landmark is no longer a real <nav>').toBe('NAV');
    expect(socials.getAttribute('aria-label'), 'socials nav has no accessible name').toBeTruthy();
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

  it('renders a seated member whose photograph has not arrived, without an img', () => {
    // A distinct case from the open slot above, and new with the Fall 2026 board: a real
    // person holding a real role whose photo is not in public/images yet. The card must
    // still render -- name, role and bio -- rather than being skipped or given a broken
    // <img>, and it must NOT be marked as a placeholder seat.
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
    expect(card.textContent).toContain(member.description);
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
  it('renders one facade per form and loads no iframe up front', () => {
    const el = document.getElementById('content');
    mountForms(el);
    expect(el.querySelectorAll('[data-form]')).toHaveLength(FORMS.length);
    expect(el.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('swaps in an iframe only once the facade is activated', () => {
    const el = document.getElementById('content');
    mountForms(el);
    el.querySelector('[data-form] button').click();
    const frame = el.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame.src).toContain('docs.google.com/forms');
  });

  it('keeps focus on the embed rather than dropping it to the body', () => {
    const el = document.getElementById('content');
    mountForms(el);
    const button = el.querySelector('[data-form] button');
    button.focus();
    button.click();
    expect(document.activeElement.tagName).toBe('IFRAME');
  });
});

describe('the sign-off', () => {
  it('closes each page inside its LAST panel, with the club name and a computed year', () => {
    // It was a standalone <footer> after the contact panel. Between that panel's own
    // bottom gap and the strip's padding the page ended on most of a screen of gradient,
    // so the line moved inside and the strip went. Asserted per page: the media page has
    // no contact panel, and a sign-off that only ever landed on the home page would
    // leave that one ending on nothing.
    for (const [render, lastPanel] of [[renderSections, 'contact'], [renderMediaPage, 'media']]) {
      const root = document.createElement('main');
      render(root);
      expect(root.querySelector('[data-section="footer"]'),
        'the standalone footer strip is back').toBeNull();

      const line = root.querySelector('.footer-line');
      expect(line, 'no sign-off on this page at all').not.toBeNull();
      expect(line.textContent).toContain(SITE.name);
      expect(line.textContent).toContain(String(new Date().getFullYear()));

      // Inside the last panel, and the last thing in it.
      const panels = [...root.querySelectorAll('[data-section]')];
      expect(panels.at(-1).dataset.section).toBe(lastPanel);
      expect(line.closest('[data-section]')).toBe(panels.at(-1));
      expect(line.parentElement.lastElementChild).toBe(line);
    }
  });
});

describe('section photographs', () => {
  it('renders the about and contact photos as real <picture> elements with avif/webp sources and alt text', () => {
    renderSections(document.getElementById('content'));
    for (const id of ['about', 'contact']) {
      const el = document.querySelector(`[data-section="${id}"]`);
      const picture = el.querySelector('picture');
      expect(picture, `[data-section="${id}"] has no <picture>`).not.toBeNull();
      expect(picture.querySelectorAll('source[type="image/avif"]').length).toBeGreaterThan(0);
      expect(picture.querySelectorAll('source[type="image/webp"]').length).toBeGreaterThan(0);
      const img = picture.querySelector('img');
      expect(img).not.toBeNull();
      expect(img.alt.length).toBeGreaterThan(0);
    }
  });
});

describe('the performed-for marquee', () => {
  const render = () => { const root = document.createElement('main'); renderSections(root); return root; };

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

  it('renders a name as text and a logo as a picture that still carries the name', () => {
    const root = render();
    for (const org of PERFORMED_FOR) {
      const li = [...root.querySelectorAll('.marquee-list:not([aria-hidden]) li')]
        .find((x) => x.dataset.logo === org.logo || x.textContent === org.name);
      expect(li, `${org.name} is not in the strip`).toBeDefined();
      if (org.logo) {
        const img = li.querySelector('img');
        expect(img, `${org.name} has a logo configured but renders no image`).not.toBeNull();
        // The strip must read as a list of ORGANISATIONS however it looks on screen.
        expect(img.alt).toBe(org.name);
      } else {
        expect(li.textContent).toBe(org.name);
        expect(li.querySelector('img')).toBeNull();
      }
    }
  });

  it('builds a logo chip that still carries the organisation name', () => {
    // Called directly, because every entry is name-only today and the logo branch is
    // therefore unreachable through renderSections. Without this the marquee would ship
    // a path nothing had ever run, to be discovered on the day the first mark arrives.
    const li = marqueeItem({ name: 'Chinatown Beautification Day', logo: 'logo' });
    const img = li.querySelector('img');
    expect(img, 'a configured logo rendered no image').not.toBeNull();
    expect(img.alt).toBe('Chinatown Beautification Day');
    expect(li.dataset.logo).toBe('logo');
    expect(li.textContent.trim()).toBe('');
    // And the other branch, from the same entry point, so this test sees both.
    const plain = marqueeItem({ name: 'NYU Welcome', logo: null });
    expect(plain.querySelector('img')).toBeNull();
    expect(plain.textContent).toBe('NYU Welcome');
  });
});

describe('the hero and events photographs', () => {
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

  it('gives the events panel a photograph, lazily', () => {
    const img = render().querySelector('#events .section-photo img');
    expect(img, 'the events panel has no photograph').not.toBeNull();
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('states the practice times once, in the events panel and nowhere else', () => {
    // The hero used to carry a card restating them, which is why a guard existed to keep
    // the two in step. The card is gone; this is the invariant that replaces it, and it
    // is the stronger one — two places to edit is how they drifted in the first place.
    const root = render();
    for (const fact of ['Kimmel', 'Sylvette', '3-5PM', '5-7PM']) {
      const holders = [...root.querySelectorAll('*')].filter((el) =>
        [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(fact)));
      expect(holders.length, `"${fact}" appears in ${holders.length} places, not 1`).toBe(1);
      expect(holders[0].closest('#events'), `"${fact}" is outside the events panel`).not.toBeNull();
    }
    expect(root.querySelector('.teaser'), 'the hero teaser card is still being rendered').toBeNull();
  });
});

describe('practice gallery', () => {
  it('renders one cell per photograph, each with an AVIF and a WebP source', () => {
    const el = document.getElementById('content');
    mountGallery(el);
    const cells = el.querySelectorAll('[data-photo]');
    expect(cells).toHaveLength(PRACTICE_PHOTOS.photos.length);
    for (const cell of cells) {
      const types = [...cell.querySelectorAll('source')].map((x) => x.type);
      expect(types).toEqual(['image/avif', 'image/webp']);
    }
  });

  it('reserves each cell before the bytes land', () => {
    // The defect this exists for is documented at the top of sections.css: buildPicture
    // sets no intrinsic size by default, so with `height: auto` a cell computes to ZERO
    // height until its picture loads and everything below it jumps. Measured there at
    // 256px of shift on the contact panel. The about and contact photographs are fixed
    // by a per-section aspect-ratio in CSS; these six cannot be, because they are two
    // different shapes, so the size rides on the img's own attributes instead.
    const el = document.getElementById('content');
    mountGallery(el);
    for (const cell of el.querySelectorAll('[data-photo]')) {
      const img = cell.querySelector('img');
      const declared = PRACTICE_PHOTOS.photos.find((p) => p.base === cell.dataset.photo);
      expect(img.getAttribute('width'), `${cell.dataset.photo} has no width attribute`)
        .toBe(String(declared.width));
      expect(img.getAttribute('height')).toBe(String(declared.height));
    }
  });

  it('carries both portrait and landscape cells, which is why no ratio is shared', () => {
    // The non-vacuity control for the rule above. If every photograph were the same
    // shape, a single CSS aspect-ratio would be the simpler answer and the attribute
    // plumbing would be dead weight -- this fails the moment that becomes true.
    const shapes = new Set(PRACTICE_PHOTOS.photos.map((p) => (p.width > p.height ? 'wide' : 'tall')));
    expect([...shapes].sort()).toEqual(['tall', 'wide']);
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
      ABOUT.body.slice(0, 60), EVENTS.body.slice(0, 60),
      ...MEDIA.map((m) => m.name),
    ];
    for (const file of readdirSync(dir)) {
      const source = readFileSync(path.join(dir, file), 'utf8');
      for (const literal of forbidden) {
        expect(source, `src/ui/${file} hardcodes club copy: "${literal}"`).not.toContain(literal);
      }
    }
  });
});
