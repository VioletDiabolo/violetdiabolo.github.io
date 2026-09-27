// tests/content.test.js
import { describe, it, expect } from 'vitest';
import {
  SITE, ABOUT, EVENTS, MEDIA, BOARD, CONTACT, FORMS, SOCIALS, PAGE_COPY, PHOTOS,
  PERFORMED_FOR, DISCORD,
} from '../src/content/index.js';

describe('content', () => {
  it('carries the site identity verbatim', () => {
    expect(SITE.name).toBe('VIOLET DIABOLO');
    expect(SITE.tagline).toBe('PREMIER DIABOLO TEAM AT NYU');
  });

  it("keeps the founding year in the about copy, and not the sentence the client cut", () => {
    expect(ABOUT.body).toContain('Spring of 2019');
    // Removed at the client's request: "The club has appeared on Gordon Ramsey's Hell's
    // Kitchen and at hundreds of galas, festivals, schools and fundraisers across the
    // tri-state area." Pinned as absent, because it is exactly the kind of line that
    // comes back with a copy-paste from the old site.
    expect(ABOUT.body).not.toMatch(/Hell.s Kitchen/);
    expect(ABOUT.body).not.toContain('hundreds of galas');
  });

  it('carries both weekly practices, with a day, a time and a place for each', () => {
    // Fall 2026: two practices on two different days, as fields rather than a sentence,
    // because the client asked for the dates and places to stand out and a string can
    // only be bolded by parsing it back apart.
    //
    // Each day is checked TOGETHER WITH its own time and place, as one record: the first
    // draft of this copy had both practices on Sunday, and every assertion that looked
    // for the pieces separately passed on it just as happily.
    expect(EVENTS.sessions.map((s) => `${s.day} ${s.time} ${s.at} ${s.place}`)).toEqual([
      'Sundays 3–5 PM in Kimmel Center, Room 606',
      'Fridays 5–7 PM outdoors at the Bust of Sylvette',
    ]);
    expect(EVENTS.notes).toEqual([
      'Come to either or both.',
      'All equipment is provided.',
      'Anyone is welcome, regardless of experience!',
    ]);
    expect(EVENTS.intro).toBe('Two practices a week');
  });

  it('gives the hero and the events panel a photograph each, with alt text', () => {
    // The hero's practice card is gone -- the times live in the events panel alone now,
    // and the first screen carries a photograph instead. These two entries are what the
    // hero and events panels render in its place, and an alt-less photograph in either
    // is a silent screen for anyone not looking at it.
    for (const key of ['hero', 'events']) {
      const photo = PHOTOS[key];
      expect(photo, `PHOTOS.${key} is missing`).toBeDefined();
      expect(photo.alt.length, `PHOTOS.${key} has no alt text`).toBeGreaterThan(0);
      expect(photo.base).not.toMatch(/[/.]/);
      expect(Number.isFinite(photo.width) && Number.isFinite(photo.height),
        `PHOTOS.${key} has no intrinsic size, so its panel will jump when it loads`).toBe(true);
    }
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

  it('names an organisation for every performance credit, and no half-entries', () => {
    expect(PERFORMED_FOR.length).toBeGreaterThan(10);
    for (const org of PERFORMED_FOR) {
      expect(typeof org.name).toBe('string');
      expect(org.name.trim().length, 'an entry with no name').toBeGreaterThan(0);
      // null or a bare derivative base name — never a path, a filename or ''. An empty
      // string is falsy, so it would render as a name-only chip while LOOKING like a
      // logo was configured, which is the shape of a bug nobody reports.
      expect(org.logo === null || (typeof org.logo === 'string' && !/[/.]/.test(org.logo) && org.logo !== ''),
        `${org.name} has a logo value that is neither null nor a base name`).toBe(true);
    }
    // Duplicates would show twice in a strip whose whole job is a scannable list.
    const names = PERFORMED_FOR.map((o) => o.name);
    expect(new Set(names).size, 'a duplicated organisation').toBe(names.length);
  });

  it('claims nobody the mailbox showed turning the club down', () => {
    // Both of these read as performances from the subject line and were declines in the
    // thread — NYU VSA's 2026 Minh Gala ("We'll miss you guys at the gala") and an NYU
    // I-Hub Lunar New Year slot ("There's always next year!"). Pinned because the danger
    // here is not a wrong pixel, it is the club's site claiming a booking it turned down.
    const names = PERFORMED_FOR.map((o) => o.name);
    expect(names).not.toContain('NYU I-Hub');
    expect(names).not.toContain('Minh Gala');
  });

  it('describes every photograph without naming anyone', () => {
    // The practice gallery this used to cover went with the Media page's photographs, at
    // the client's request; the rule it enforced did not, and the two photographs that
    // are left were taken at the same session. Nobody has said which face belongs to
    // which name, so no alt text may claim one.
    const boardNames = [...new Set(Object.values(BOARD).flat().map((m) => m.name))];
    for (const [key, photo] of Object.entries(PHOTOS)) {
      for (const name of boardNames) {
        expect(photo.alt, `PHOTOS.${key}'s alt text names "${name}"`).not.toContain(name);
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
    // The Join us page places each form by id, so the ids have to exist and be distinct.
    expect(FORMS.map((f) => f.id).sort()).toEqual(['interest', 'request']);
    // GitHub is gone at the client's request, and Discord is in, also at the client's
    // request. Kept as an exact list rather than a length: the ORDER is the reading
    // order of the icon row.
    expect(SOCIALS.map((s) => s.label)).toEqual(['Instagram', 'YouTube', 'NYU Engage', 'Discord']);
    expect(SOCIALS.some((s) => /github/i.test(s.href)), 'a GitHub link came back').toBe(false);
    // The client's invite, verbatim, and read from the socials rather than restated.
    expect(DISCORD).toBe('https://discord.gg/7Kn3udMrrf');
    expect(SOCIALS.find((s) => s.label === 'Discord').href).toBe(DISCORD);
  });

  it("preserves the source apostrophes exactly, curly and ASCII alike", () => {
    const aaron = BOARD['Fall 2025'].find((m) => m.name === 'Aaron Hui');
    const aaronSecretary = BOARD['Spring 2024'].find((m) => m.name === 'Aaron Hui');
    const jon = BOARD['Fall 2025'].find((m) => m.name === 'Jonathan Sun');

    // U+2019 curly
    expect(ABOUT.body).toContain("NYU’s award-winning");
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

  it('gives every sub-page a heading, and the copy the client asked for', () => {
    expect(Object.keys(PAGE_COPY).sort()).toEqual(['about', 'join', 'media']);
    for (const [page, copy] of Object.entries(PAGE_COPY)) {
      expect(typeof copy.heading, `${page} has no heading`).toBe('string');
      expect(copy.heading.length).toBeGreaterThan(0);
    }
    // The About page leads with the club's own account of itself -- the same string, not
    // a copy of it that could drift.
    expect(PAGE_COPY.about.lead).toBe(ABOUT.body);
    // The client's rewording, verbatim: "something more human like 'Our performances and
    // videos'", replacing "Performances, competitions and a Friday on the lawn -- the
    // club's own record of itself."
    expect(PAGE_COPY.media.lead).toBe('Our performances and videos');
    // No label on Media, because it would say "Media" directly over "Media".
    expect(PAGE_COPY.media.label).toBeUndefined();
  });
});
