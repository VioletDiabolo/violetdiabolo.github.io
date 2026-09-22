export const SITE = {
  name: 'VIOLET DIABOLO',
  tagline: 'PREMIER DIABOLO TEAM AT NYU',
};

export const ABOUT = {
  heading: 'ABOUT US',
  body:
    'Founded in the Spring of 2019, Violet Diabolo is NYU’s award-winning Chinese Yo-Yo team. ' +
    'Adopting this traditional recreational pastime and blending it with energetic contemporary music, ' +
    'Violet Diabolo aims to promote AAPI culture through showcasing their unique performing art. ' +
    'The club has been invited to perform on Gordon Ramsey’s Hell’s Kitchen and has dazzled major ' +
    'crowds at hundreds of other teaching engagements and performances at major galas, festivals, ' +
    'non-profit events, schools, and fundraisers throughout the tri-state area.',
};

export const EVENTS = {
  heading: 'EVENTS',
  body:
    'Two practices a week: Sundays 3-5PM in Kimmel Center, Room 606, and Fridays 5-7PM ' +
    'outdoors at the Bust of Sylvette. Come to either or both. ' +
    'All equipment will be provided, and anyone is welcome, regardless of experience!',
};

/**
 * The hero's teaser card: the one thing a visitor to a club page actually needs before
 * they scroll -- when and where to turn up. Every fact here is already in EVENTS.body
 * above, restated in the short form a card can hold; nothing new is claimed on the
 * club's behalf. Kept as its own export rather than folded into EVENTS so the verbatim
 * practice-logistics prose the tests pin stays exactly as it was.
 */
export const HERO_TEASER = Object.freeze({
  heading: 'Sundays & Fridays',
  detail:
    'Sundays 3–5PM at Kimmel 606, Fridays 5–7PM at the Bust of Sylvette. ' +
    'Equipment provided, and no experience needed.',
  action: Object.freeze({ label: 'See practice details', target: 'events' }),
});

// Headings for the sections that don't otherwise carry a `heading` field (MEDIA is an
// array, BOARD is a semester map, CONTACT is just an email/linktree pair) - kept here so
// ui/sections.js never hardcodes club-facing copy, matching ABOUT.heading/EVENTS.heading.
export const SECTION_HEADINGS = {
  media: 'MEDIA',
  board: 'BOARD',
  contact: 'CONTACT US',
};

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
  { name: 'Barry Chen', position: 'Co-President', image: null, description: filler(26) },
  { name: 'Evan Yu', position: 'Co-President', image: null, description: filler(22) },
  { name: 'Hannah Chen', position: 'Logistics', image: null, description: filler(30) },
  { name: 'Emily Chen', position: 'Media', image: null, description: filler(24) },
  { name: 'Megan Kim', position: 'Media', image: null, description: filler(28) },
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

export const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/violet_diabolo', icon: 'instagram' },
  { label: 'YouTube', href: 'https://www.youtube.com/@violetdiabolo2213', icon: 'youtube' },
  { label: 'NYU Engage', href: 'https://engage.nyu.edu/organization/violet-diabolo-all-university', icon: 'engage' },
  { label: 'GitHub', href: 'https://github.com/VioletDiabolo/violetdiabolo.github.io', icon: 'github' },
];

/** The club's two photographs, carried over from the previous site. */
export const PHOTOS = {
  group: { base: 'group-usadc', widths: [900, 1600, 2000], jpgWidths: [900, 1600], alt: 'Violet Diabolo performing together at the USADA National Diabolo Competition' },
  wide:  { base: 'usadc-wide',  widths: [900, 1600, 2000], jpgWidths: [900, 1600], alt: 'Violet Diabolo on stage at the USADA National Diabolo Competition' },
};
