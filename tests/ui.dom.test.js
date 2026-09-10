// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderSections } from '../src/ui/sections.js';
import { mountBoard } from '../src/ui/board.js';
import { mountMedia } from '../src/ui/media.js';
import { mountForms } from '../src/ui/forms.js';
import { BOARD, MEDIA, SITE, CONTACT, ABOUT, EVENTS, FORMS } from '../src/content/index.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('sections', () => {
  it('renders every scroll section with a data-section hook', () => {
    renderSections(document.getElementById('content'));
    const found = [...document.querySelectorAll('[data-section]')].map((e) => e.dataset.section);
    expect(found).toEqual(['hero', 'about', 'events', 'media', 'board', 'contact', 'footer']);
  });

  it('puts the club name in the one and only h1', () => {
    renderSections(document.getElementById('content'));
    const h1s = document.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain(SITE.name);
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
    expect(el.querySelectorAll('[data-member]')).toHaveLength(BOARD['Fall 2025'].length);
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
    const cards = [...el.querySelectorAll('[data-member]')];
    const openSlot = cards.find((c) => c.dataset.placeholder === 'true');
    expect(openSlot).toBeDefined();
    expect(openSlot.querySelector('img')).toBeNull();
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

describe('footer', () => {
  it('renders the reassembly footer with the club name and the current, computed year', () => {
    renderSections(document.getElementById('content'));
    const footer = document.querySelector('[data-section="footer"]');
    expect(footer).not.toBeNull();
    expect(footer.textContent).toContain(SITE.name);
    expect(footer.textContent).toContain(String(new Date().getFullYear()));
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
