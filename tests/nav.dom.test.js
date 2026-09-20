// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { NAV_LINKS, CTA, buildNav } from '../src/ui/nav.js';
import { renderSections } from '../src/ui/sections.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('NAV_LINKS', () => {
  it('jumps to the sections a visitor most wants', () => {
    expect(NAV_LINKS.map((l) => l.target)).toEqual(['about', 'events', 'media', 'board']);
  });

  it('gives every link a label', () => {
    for (const link of NAV_LINKS) expect(link.label.length).toBeGreaterThan(0);
  });

  it('sends the call to action to contact', () => {
    expect(CTA.target).toBe('contact');
    expect(CTA.label).toBe('Join us');
  });
});

describe('buildNav', () => {
  it('renders one link per entry plus the call to action', () => {
    expect(buildNav().querySelectorAll('a')).toHaveLength(NAV_LINKS.length + 2);
  });

  it('marks the call to action so it can be styled apart', () => {
    expect(buildNav().querySelector('[data-cta]')).not.toBeNull();
  });

  it('is a landmark with an accessible name', () => {
    const nav = buildNav();
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  it('points every link at a section that actually exists', () => {
    // A nav that scrolls nowhere is worse than no nav.
    const content = document.getElementById('content');
    renderSections(content);
    document.body.prepend(buildNav());
    for (const a of document.querySelectorAll('nav a')) {
      const id = a.getAttribute('href').slice(1);
      expect(content.querySelector(`#${id}`), `${id} has no section`).not.toBeNull();
    }
  });
});

describe('room patterns', () => {
  it('assigns every section a room pattern', () => {
    const content = document.getElementById('content');
    renderSections(content);
    for (const el of content.querySelectorAll('[data-section]')) {
      if (el.dataset.section === 'footer') continue;
      expect(['hero', 'panel', 'showcase', 'grid'], `${el.dataset.section}`)
        .toContain(el.dataset.room);
    }
  });

  it('uses each of the four patterns at least once', () => {
    const content = document.getElementById('content');
    renderSections(content);
    const used = new Set([...content.querySelectorAll('[data-room]')].map((e) => e.dataset.room));
    expect([...used].sort()).toEqual(['grid', 'hero', 'panel', 'showcase']);
  });
});
