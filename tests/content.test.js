// tests/content.test.js
import { describe, it, expect } from 'vitest';
import { SITE, ABOUT, EVENTS, MEDIA, BOARD, CONTACT, FORMS, SOCIALS } from '../src/content/index.js';

describe('content', () => {
  it('carries the site identity verbatim', () => {
    expect(SITE.name).toBe('VIOLET DIABOLO');
    expect(SITE.tagline).toBe('PREMIER DIABOLO TEAM AT NYU');
  });

  it('preserves the founding year and Hell’s Kitchen credit in the about copy', () => {
    expect(ABOUT.body).toContain('Spring of 2019');
    expect(ABOUT.body).toContain('Hell’s Kitchen');
  });

  it('preserves practice logistics exactly', () => {
    expect(EVENTS.body).toContain('Saturdays from 1-3PM at Kimmel 606');
    expect(EVENTS.body).toContain('September 20');
  });

  it('lists all ten videos with plausible YouTube ids', () => {
    expect(MEDIA).toHaveLength(10);
    for (const m of MEDIA) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.youtubeId).toMatch(/^[\w-]{11}$/);
    }
  });

  it('lists five semesters newest first', () => {
    const semesters = Object.keys(BOARD);
    expect(semesters).toEqual(['Fall 2025', 'Spring 2025', 'Fall 2024', 'Spring 2024', 'Fall 2023']);
  });

  it('represents the unfilled roster slot as a null-image placeholder, not a fake member', () => {
    for (const roster of Object.values(BOARD)) {
      const placeholders = roster.filter((m) => m.placeholder);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].image).toBeNull();
      expect(placeholders[0].name).not.toBe('N/A');
    }
  });

  it('never hotlinks a third-party CDN for member photos', () => {
    const images = Object.values(BOARD).flat().map((m) => m.image).filter(Boolean);
    for (const src of images) expect(src).toMatch(/^\.\/images\//);
  });

  it('exposes contact and both forms', () => {
    expect(CONTACT.email).toBe('violetdiabolo@gmail.com');
    expect(FORMS).toHaveLength(2);
    for (const f of FORMS) expect(f.url).toContain('docs.google.com/forms');
    expect(SOCIALS.map((s) => s.label)).toEqual(['Instagram', 'YouTube', 'NYU Engage', 'GitHub']);
  });
});
