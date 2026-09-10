// tests/content.test.js
import { describe, it, expect } from 'vitest';
import { SITE, ABOUT, EVENTS, MEDIA, BOARD, CONTACT, FORMS, SOCIALS, SECTION_HEADINGS, PHOTOS } from '../src/content/index.js';

describe('content', () => {
  it('carries the site identity verbatim', () => {
    expect(SITE.name).toBe('VIOLET DIABOLO');
    expect(SITE.tagline).toBe('PREMIER DIABOLO TEAM AT NYU');
  });

  it("preserves the founding year and Hell's Kitchen credit in the about copy", () => {
    expect(ABOUT.body).toContain('Spring of 2019');
    expect(ABOUT.body).toContain("Hell’s Kitchen");
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

  it('stores board images as bare derivative base names, not paths or filenames', () => {
    // buildPicture (src/ui/picture.js) expands a base name into the full AVIF/WebP
    // srcset itself; a path or extension baked into content would double up or drift
    // from what scripts/build-assets.mjs actually emits.
    const images = Object.values(BOARD).flat().map((m) => m.image).filter(Boolean);
    expect(images.length).toBeGreaterThan(0);
    for (const src of images) expect(src).not.toMatch(/[/.]/);

    for (const roster of Object.values(BOARD)) {
      const placeholder = roster.find((m) => m.placeholder);
      expect(placeholder.image).toBeNull();
    }
  });

  it('gives every photograph non-empty alt text', () => {
    // These are real photographs of real people at a real competition, not decoration —
    // shipping them with empty alt would silence them for screen-reader visitors.
    const photos = Object.values(PHOTOS);
    expect(photos.length).toBeGreaterThan(0);
    for (const photo of photos) {
      expect(typeof photo.alt).toBe('string');
      expect(photo.alt.length).toBeGreaterThan(0);
    }
  });

  it('exposes contact and both forms', () => {
    expect(CONTACT.email).toBe('violetdiabolo@gmail.com');
    expect(FORMS).toHaveLength(2);
    for (const f of FORMS) expect(f.url).toContain('docs.google.com/forms');
    expect(SOCIALS.map((s) => s.label)).toEqual(['Instagram', 'YouTube', 'NYU Engage', 'GitHub']);
  });

  it("preserves the source apostrophes exactly, curly and ASCII alike", () => {
    const aaron = BOARD['Fall 2025'].find((m) => m.name === 'Aaron Hui');
    const aaronSecretary = BOARD['Spring 2024'].find((m) => m.name === 'Aaron Hui');
    const jon = BOARD['Fall 2025'].find((m) => m.name === 'Jonathan Sun');

    // U+2019 curly
    expect(ABOUT.body).toContain("NYU’s award-winning");
    expect(ABOUT.body).toContain("Ramsey’s Hell’s Kitchen ");
    expect(jon.description).toContain("I’m all about carefully crafting ");

    // U+0027 ASCII
    expect(aaron.description).toContain("Heyo, I'm Aaron");
    expect(aaron.description).toContain("I'm the current president");
    expect(aaron.description).toContain("I'm currently working on 3D");
    expect(aaron.description).toContain("Sometimes you'll catch me");
    expect(aaronSecretary.description).toContain("can't really write");
    expect(jon.description).toContain("I'm currently working on getting DNA");
    expect(jon.description).toContain("I'm not spinning");
  });

  it('supplies a heading for every section that has no natural heading field', () => {
    expect(Object.keys(SECTION_HEADINGS).sort()).toEqual(['board', 'contact', 'media']);
    for (const heading of Object.values(SECTION_HEADINGS)) {
      expect(typeof heading).toBe('string');
      expect(heading.length).toBeGreaterThan(0);
    }
  });
});
