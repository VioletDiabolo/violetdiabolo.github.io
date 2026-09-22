// tests/content.test.js
import { describe, it, expect } from 'vitest';
import {
  SITE, ABOUT, EVENTS, MEDIA, BOARD, CONTACT, FORMS, SOCIALS, SECTION_HEADINGS, PHOTOS,
  HERO_TEASER,
} from '../src/content/index.js';

describe('content', () => {
  it('carries the site identity verbatim', () => {
    expect(SITE.name).toBe('VIOLET DIABOLO');
    expect(SITE.tagline).toBe('PREMIER DIABOLO TEAM AT NYU');
  });

  it("preserves the founding year and Hell's Kitchen credit in the about copy", () => {
    expect(ABOUT.body).toContain('Spring of 2019');
    expect(ABOUT.body).toContain("Hell’s Kitchen");
  });

  it('carries both weekly practices, with a time and a place for each', () => {
    // Fall 2026: two practices, back to back on Sundays. The "first practice will be on
    // September 20" line that used to be pinned here went with them -- it dated the 2025
    // season, and a past date standing beside a new timetable reads as this year's.
    expect(EVENTS.body).toContain('Sundays');
    expect(EVENTS.body).toContain('3-5PM');
    expect(EVENTS.body).toContain('Kimmel Center, Room 606');
    expect(EVENTS.body).toContain('5-7PM');
    expect(EVENTS.body).toContain('Bust of Sylvette');
  });

  it('claims nothing in the hero teaser that the events copy does not also say', () => {
    // HERO_TEASER's own doc comment promises exactly this — that the card restates
    // EVENTS.body and never adds a fact of its own — and nothing checked it until both
    // were rewritten at once. A teaser that drifts from the section it summarises is a
    // club page telling a visitor two different times to turn up.
    for (const fact of ['Sundays', 'Kimmel 606', 'Bust of Sylvette']) {
      const teaser = `${HERO_TEASER.heading} ${HERO_TEASER.detail}`;
      expect(teaser, `"${fact}" is not in the teaser`).toContain(fact);
    }
    expect(EVENTS.body).toContain('Sundays');
    expect(EVENTS.body).toContain('Room 606');
    expect(EVENTS.body).toContain('Bust of Sylvette');
    // The teaser's span has to bracket both practices, not just the first.
    expect(HERO_TEASER.heading).toContain('3');
    expect(HERO_TEASER.heading).toContain('7');
  });

  it('lists all ten videos with plausible YouTube ids', () => {
    expect(MEDIA).toHaveLength(10);
    for (const m of MEDIA) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.youtubeId).toMatch(/^[\w-]{11}$/);
    }
  });

  it('lists six semesters newest first', () => {
    const semesters = Object.keys(BOARD);
    expect(semesters).toEqual([
      'Fall 2026', 'Fall 2025', 'Spring 2025', 'Fall 2024', 'Spring 2024', 'Fall 2023',
    ]);
  });

  it('gives the current board a filled seat for every role, with no open slot', () => {
    const current = BOARD[Object.keys(BOARD)[0]];
    expect(current.map((m) => `${m.name} — ${m.position}`)).toEqual([
      'Barry Chen — Co-President',
      'Evan Yu — Co-President',
      'Hannah Chen — Logistics',
      'Emily Chen — Media',
      'Megan Kim — Media',
      'Aaron Hui — Treasurer',
    ]);
    // Not `placeholder: true`: that flag means a seat nobody holds, and every seat here
    // is held. A missing PHOTOGRAPH is `image: null`, which is a different absence.
    expect(current.some((m) => m.placeholder)).toBe(false);
  });

  it('represents an unfilled roster slot as a null-image placeholder, not a fake member', () => {
    // At most one, not exactly one: a fully staffed board has no open seat to show. The
    // rosters that DO carry one still have to carry it honestly, which is the part that
    // was worth pinning -- the source site shipped a member literally named "N/A".
    const withPlaceholders = Object.values(BOARD).filter((r) => r.some((m) => m.placeholder));
    expect(withPlaceholders.length, 'no roster has an open slot any more -- if that is ' +
      'deliberate, delete OPEN_SLOT rather than leaving this guard testing nothing')
      .toBeGreaterThan(0);

    for (const roster of Object.values(BOARD)) {
      const placeholders = roster.filter((m) => m.placeholder);
      expect(placeholders.length).toBeLessThanOrEqual(1);
      for (const p of placeholders) {
        expect(p.image).toBeNull();
        expect(p.name).not.toBe('N/A');
      }
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
      // Every member without a photograph carries a literal null, whether the reason is
      // an empty seat or a photo that has not been chosen yet -- never '' or undefined,
      // which buildPicture would happily expand into a srcset of broken URLs.
      for (const member of roster.filter((m) => !m.image)) {
        expect(member.image, `${member.name} has a falsy non-null image`).toBeNull();
      }
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
