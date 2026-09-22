export const SITE = {
  name: 'VIOLET DIABOLO',
  tagline: 'PREMIER DIABOLO TEAM AT NYU',
};

/**
 * Cut roughly in half at the client's note that it ran too long — 100 words to 54. Every
 * fact survives: the founding, the award, the art form, the Hell's Kitchen credit and the
 * range of the work. What went was the restatement (three clauses all saying "we perform
 * a lot, in a lot of places") and the third-person voice, which read like a grant
 * application beside the rest of the page.
 */
/**
 * The club's mark, for the nav bar.
 *
 * `alt: ''` on purpose. It sits inside the wordmark link, which already carries the text
 * "VIOLET DIABOLO" — giving the image a name as well would have a screen reader announce
 * the club twice for one link. Decorative here is the accurate description, not a
 * shortcut.
 */
export const LOGO = Object.freeze({
  base: 'logo', widths: [64, 128], width: 128, height: 149, alt: '',
});

export const ABOUT = {
  heading: 'ABOUT US',
  body:
    'Founded in the Spring of 2019, Violet Diabolo is NYU’s award-winning Chinese Yo-Yo team. ' +
    'We take a traditional pastime, set it to contemporary music, and use it to promote AAPI ' +
    'culture through performance. The club has appeared on Gordon Ramsey’s Hell’s Kitchen and at ' +
    'hundreds of galas, festivals, schools and fundraisers across the tri-state area.',
};

export const EVENTS = {
  heading: 'EVENTS',
  body:
    'Two practices a week: Sundays 3-5PM in Kimmel Center, Room 606, and Fridays 5-7PM ' +
    'outdoors at the Bust of Sylvette. Come to either or both. ' +
    'All equipment will be provided, and anyone is welcome, regardless of experience!',
};

// Headings for the sections that don't otherwise carry a `heading` field (MEDIA is an
// array, BOARD is a semester map, CONTACT is just an email/linktree pair) - kept here so
// ui/sections.js never hardcodes club-facing copy, matching ABOUT.heading/EVENTS.heading.
/** One line under the MEDIA title on its own page, where a bare heading floats. */
export const MEDIA_INTRO =
  'Performances, competitions and a Friday on the lawn — the club’s own record of itself.';

export const SECTION_HEADINGS = {
  media: 'MEDIA',
  board: 'BOARD',
  contact: 'CONTACT US',
};

/**
 * Organisations the club has performed for, for the marquee under the About panel.
 *
 * PROVENANCE. Every entry was read out of violetdiabolo@gmail.com and is backed by one of
 * three things: the club confirming and then sending set music or logistics, the host
 * sending day-of details or a thank-you, or a video of the performance in MEDIA below.
 * Invitations the club DECLINED are not here — NYU VSA's 2026 Minh Gala ("We'll miss you
 * guys at the gala") and an NYU I-Hub Lunar New Year slot ("There's always next year!")
 * both looked like performances from the subject line alone, which is why subject lines
 * were not good enough.
 *
 * `logo` is the base name of a mark in the asset pipeline, or null. The NAME always
 * shows; a logo is an addition beside it, never a replacement for it, so a chip without
 * one still reads and the strip does not depend on how many marks could be found.
 *
 * WHERE THEY CAME FROM: each organisation's own published mark — NYU Engage profiles for
 * the student groups, the organisation's own site for the rest. Two were re-coloured, and
 * only in VALUE: TAP's black wordmark and CYI's black paths are invisible on this page's
 * ground, so both are shown in the opposite polarity. That is the same mark, not a
 * redrawing of it.
 *
 * FOUR ARE null, and each for a reason that was tested rather than assumed:
 *
 *   NYU OGS            its Engage artwork is a pale skyline banner; every crop of the
 *                      NYU lockup inside it came out as a grey rectangle at 28px.
 *   Tisch Talent Guild  publishes only an Instagram, and appears to have folded into
 *                      another Tisch organisation.
 *   PS 124 Yung Wing   no mark found.
 *   PS 184M Shuang Wen their site serves its mark from a session-protected Google URL.
 *
 * NYU VSA was in this list and is not any more. It was dropped as "too pale", which was a
 * judgement made from a 170px render; at the 28px it actually ships at, the crest reads
 * perfectly well. Rendering candidates AT DISPLAY SIZE is the only test that means
 * anything here, and it reversed two calls in both directions.
 */
export const PERFORMED_FOR = Object.freeze([
  // --- NYU ---------------------------------------------------------------
  { name: 'NYU Welcome', logo: 'logo-nyu-welcome' },   // Club Showcase, Kimmel E&L, Sept 2026
  { name: 'NYU Asian Heritage Month', logo: 'logo-nyu-ahm' }, // Fall Fest, 2019 and since
  { name: 'NYU VSA', logo: 'logo-nyu-vsa' },           // Minh 2022; Holiday Night Market 2024
  { name: 'NYU CSS', logo: 'logo-nyu-css' },           // LNY Gala 2024; DynamiCSS 2024
  { name: 'NYU KSA', logo: 'logo-nyu-ksa' },           // Koreating, March 2026
  { name: 'NYU HKSA', logo: 'logo-nyu-hksa' },         // Sensations, April 2025
  { name: 'NYU ACU', logo: 'logo-nyu-acu' },           // ACU Idol, 2022
  { name: 'NYU Kappa Phi Lambda', logo: 'logo-kpl' },  // Kappa Kafe, April 2023
  { name: 'NYU OGS', logo: null },                     // LNY Celebration 2024 (see note below)
  { name: 'Tisch Talent Guild', logo: null },          // Holiday Cabaret, 2022 (no published mark)

  // --- Beyond NYU --------------------------------------------------------
  { name: 'Columbia Wushu', logo: 'logo-cuwushu' },             // Showcase, Feb 2026
  { name: 'Brooklyn Conservatory of Music', logo: 'logo-bkcm' }, // LNY Feb 2026; Open Stages May 2026
  { name: 'NYC Mid-Autumn Festival', logo: 'logo-moonlite' },   // Moonlite, Oct 2025
  { name: 'Chinatown Beautification Day', logo: 'logo-cyi' },   // CYI, 2023 and 2024
  { name: 'PS 124 Yung Wing School', logo: null },           // Lunar New Year
  { name: 'PS 184M Shuang Wen', logo: null },                // Spring Bash, June 2026
  { name: 'TAP New York', logo: 'logo-tap' },                   // Lunar New Year Banquet 2024
  { name: 'USADA Nationals', logo: 'logo-usada' },              // National Diabolo Competition 2024
]);

export const MEDIA = [
  { name: 'VSA Holiday Night Market - 2024', youtubeId: 'OF6nfdBX9OQ' },
  { name: 'Violet Diabolo @ USADA National Diabolo Competition - 2024', youtubeId: 'Om9etqgYLRk' },
  { name: 'OGS Lunar New Year Celebration - 2024', youtubeId: '62mJZe54psU' },
  { name: 'TAP Lunar New Year Banquet - 2024', youtubeId: 'MWa74ZDrFZY' },
  { name: 'AHM Fall Fest - 2023', youtubeId: '9KCt2P2QrOg' },
  { name: 'Chinatown Beautification Day 2023', youtubeId: 'atNfL2mPHqE' },
  { name: 'USADA National Diabolo Competition 18+ Teams -- Violet Diabolo', youtubeId: '__rnjvkXZN8' },
  { name: 'Violet Diabolo AHM Spring Opening 2021 Performance', youtubeId: 'VyogRHOVnpo' },
  { name: "Violet Diabolo - Asian Heritage Month's Fall Fest 2019", youtubeId: 'TXLPqtM1jkc' },
  { name: 'Violet Diabolo Promo', youtubeId: 'u-ECtolBckU' },
];

const AARON = {
  name: 'Aaron Hui',
  position: 'President',
  image: 'aaron',
  description:
    "Heyo, I'm Aaron and I'm the current president of Violet Diabolo! I am a vertax one-trick (which " +
    "means that you should be very careful near me when I'm yoyoing), but I'm currently working on 3D " +
    'and trying to learn more integrals! In my free time I like to play Tetris (modern, not NES) and ' +
    "spin other non yoyo props like poi, whip, staff, or ropedart. Sometimes you'll catch me playing " +
    'with fire :)',
};

const AARON_SECRETARY = {
  ...AARON,
  position: 'Secretary',
  description:
    "This website was created a year after this time period, so I guess I can't really write that I'm " +
    'the current president, but presumably I was sending a lot of practice emails and grinding vertax ' +
    'and 2D around this time haha. Probably destroying my ribs with body hit gens or failing to learn heli...',
};

const JON = {
  name: 'Jonathan Sun',
  position: 'Artistic Director',
  image: 'jon',
  description:
    "Yo. I'm JonaSun. Resident transplant from UMich Revolution. I’m all about carefully crafting " +
    'combos for creative, yet chaotic, choreography. Proud proponent of plasma torch for cutting yo-yo ' +
    "string. I'm currently working on getting DNA into flare (a.k.a. cancer) consistently. When I'm not " +
    'spinning, I am mad scientist. It is so cool!',
};

// The source site filled this slot with a member literally named "N/A" whose photo
// hotlinked Google's image CDN. Rendered as an honest open-slot card instead.
const OPEN_SLOT = {
  name: 'More board members coming soon',
  position: 'Open slot',
  image: null,
  placeholder: true,
  description: 'More board members coming soon — photos and blurbs are still trickling in.',
};

/**
 * Placeholder bios for the Fall 2026 board, at the client's instruction: "you can put
 * gibberish as filler for their descriptions".
 *
 * Lorem ipsum rather than plausible prose, deliberately. These are real, named students.
 * Filler that READS like a bio is one forgotten deploy away from putting invented words
 * in someone's mouth, and nobody skimming the page would spot it — every card would look
 * finished. Nonsense cannot be mistaken for the real thing, and it says at a glance which
 * cards are still waiting on copy. Replace each one as its owner sends theirs in.
 */
const LOREM = (
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud ' +
  'exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute ' +
  'irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.'
).split(' ');

const filler = (words) => `Bio coming soon — ${LOREM.slice(0, words).join(' ')}…`;

/**
 * Fall 2026. No `image` on anyone but Aaron: the club's photographs for this board have
 * not been selected yet, and buildPicture is only given a base name once the derivatives
 * exist (scripts/build-assets.mjs). These are NOT `placeholder: true` — that flag means
 * an unfilled seat on the board, and every seat here is filled.
 */
const FALL_2026 = [
  { name: 'Barry Chen', position: 'Co-President', image: 'board-barry', description: filler(26) },
  { name: 'Evan Yu', position: 'Co-President', image: 'board-evan', description: filler(22) },
  { name: 'Hannah Chen', position: 'Logistics', image: 'board-hannah', description: filler(30) },
  { name: 'Emily Chen', position: 'Media', image: null, description: filler(24) },
  { name: 'Megan Kim', position: 'Media', image: null, description: filler(28) },
  // Aaron's photograph is the one from the previous site -- a different shoot from the
  // three above it, and the client's call to keep it rather than stand a tile in its
  // place. AARON.image rather than the literal, so the two never drift.
  { name: 'Aaron Hui', position: 'Treasurer', image: AARON.image, description: filler(20) },
];

export const BOARD = {
  'Fall 2026': FALL_2026,
  'Fall 2025': [AARON, JON, OPEN_SLOT],
  'Spring 2025': [AARON, JON, OPEN_SLOT],
  'Fall 2024': [AARON, JON, OPEN_SLOT],
  'Spring 2024': [AARON_SECRETARY, JON, OPEN_SLOT],
  'Fall 2023': [JON, OPEN_SLOT],
};

export const CONTACT = {
  email: 'violetdiabolo@gmail.com',
  linktree: 'https://linktr.ee/violetdiabolo',
};

export const FORMS = [
  {
    title: 'Performance / Teaching Request',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdqk-vvGryB5SCO2AM-iL2FXDi_2MNJHLJxnyxeckUNRoRzgw/viewform?embedded=true',
  },
  {
    title: 'Interest Form',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdGVUpii4Viiv3EPtoDtXCyk9l7dxhbi3pINhJiN_KLiIwT4g/viewform?embedded=true',
  },
];

/**
 * `icon` names a mark in src/ui/icons.js. It was carried here from the previous site and
 * nothing read it for the whole of this rebuild — the socials rendered as text labels —
 * which made it exactly the kind of inert data this project keeps finding. It is live now.
 *
 * GitHub is gone at the client's request. The label stays on every entry: it is the
 * accessible name, since an icon on its own says nothing to a screen reader.
 */
export const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/violet_diabolo', icon: 'instagram' },
  { label: 'YouTube', href: 'https://www.youtube.com/@violetdiabolo2213', icon: 'youtube' },
  { label: 'NYU Engage', href: 'https://engage.nyu.edu/organization/violet-diabolo-all-university', icon: 'engage' },
];

/**
 * The practice gallery, shot at one Friday session on the lawn by the Bust of Sylvette.
 *
 * `width`/`height` are the real pixel dimensions of the 1000px derivative, AFTER the
 * pipeline applies each file's EXIF orientation -- four of these six are portraits stored
 * sideways. They are here so the browser can reserve each cell's box before the bytes
 * arrive; the mixed 3:4 and 4:3 shapes are why the grid cannot simply declare one ratio
 * the way the about and contact photographs do.
 *
 * Alt text is deliberately generic about WHO. These are photographs of identifiable
 * students and nobody has told us which name belongs to which face; describing the action
 * is accurate, guessing at a name would not be.
 */
export const PRACTICE_PHOTOS = Object.freeze({
  heading: 'AT PRACTICE',
  photos: Object.freeze([
    { base: 'practice-throw', widths: [500, 1000], width: 1000, height: 1333,
      alt: 'A club member sending a diabolo high into the air on the lawn' },
    { base: 'practice-sylvette', widths: [500, 1000], width: 1000, height: 750,
      alt: "A club member spinning a diabolo in front of Picasso's Bust of Sylvette" },
    { base: 'practice-reach', widths: [500, 1000], width: 1000, height: 1333,
      alt: 'A club member catching a diabolo with both arms spread wide' },
    { base: 'practice-pair', widths: [500, 1000], width: 1000, height: 1333,
      alt: 'A club member running two diabolos at once, one on each end of the string' },
    { base: 'practice-back', widths: [500, 1000], width: 1000, height: 1333,
      alt: 'A club member seen from behind, a diabolo running along the string' },
    { base: 'practice-team', widths: [500, 1000], width: 1000, height: 750,
      alt: 'Four club members posing together with their diabolos after practice' },
  ]),
});

/**
 * The page's standalone photographs: two carried over from the previous site, two from
 * the 2026 practice shoot.
 *
 * `hero` and `events` carry a width/height pair and the older two do not, which is not an
 * oversight: sections.css declares an aspect-ratio for the about and contact photographs
 * per section, and these two take theirs from the img's own attributes instead (see
 * src/ui/picture.js). Both reserve the box; only one of them needs a stylesheet to know
 * the shape.
 */
export const PHOTOS = {
  group: { base: 'group-usadc', widths: [900, 1600, 2000], jpgWidths: [900, 1600], alt: 'Violet Diabolo performing together at the USADA National Diabolo Competition' },
  wide:  { base: 'usadc-wide',  widths: [900, 1600, 2000], jpgWidths: [900, 1600], alt: 'Violet Diabolo on stage at the USADA National Diabolo Competition' },
  hero:  { base: 'hero-group', widths: [800, 1600], width: 1600, height: 1200, alt: 'Five Violet Diabolo members on the lawn after practice, diabolos spinning' },
  events: { base: 'events-practice', widths: [600, 1200], width: 1200, height: 1600, alt: 'Two club members practising together on the lawn, a diabolo on the string between them' },
};
