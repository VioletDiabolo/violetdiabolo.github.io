// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderSections } from '../src/ui/sections.js';
import { mountBoard } from '../src/ui/board.js';
import { mountMedia } from '../src/ui/media.js';
import { BOARD, MEDIA, SITE } from '../src/content/index.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('sections', () => {
  it('renders every scroll section with a data-section hook', () => {
    renderSections(document.getElementById('content'));
    const found = [...document.querySelectorAll('[data-section]')].map((e) => e.dataset.section);
    expect(found).toEqual(['hero', 'about', 'events', 'media', 'board', 'contact']);
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
});
