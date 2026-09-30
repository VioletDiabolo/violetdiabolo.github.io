export const SITE = {
  name: 'VIOLET DIABOLO',
  tagline: 'PREMIER DIABOLO TEAM AT NYU',
};

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

/**
 * The club's own account of itself, now the lead paragraph of the About page.
 *
 * Two sentences. The third — the Hell's Kitchen credit and "hundreds of galas, festivals,
 * schools and fundraisers" — was removed at the client's request. The range of the work
 * is carried by the performed-for marquee on the home page instead, which names eighteen
 * of those places rather than gesturing at hundreds.
 */
export const ABOUT = {
  body:
    'Founded in the Spring of 2019, Violet Diabolo is NYU’s award-winning Chinese Yo-Yo team. ' +
    'We take a traditional pastime, set it to contemporary music, and use it to promote AAPI ' +
    'culture through performance.',
};

/**
 * The practice schedule, as DATA rather than a sentence.
 *
 * It was one paragraph — "Two practices a week: Sundays 3-5PM in Kimmel Center, Room 606,
 * and Fridays 5-7PM outdoors at the Bust of Sylvette..." — and the client asked for it as
 * bullets with the dates and places standing out. A string can only be bolded by parsing
 * it back apart, so the facts are kept as fields and the markup decides what is bold
 * (schedule() in src/ui/sections.js). One source for both places it renders: the home
 * page's Join us section and the Join us page.
 */
export const EVENTS = Object.freeze({
  intro: 'Two practices a week',
  // `at` is the words between the time and the place, kept with the place because they
  // are copy too: the client's own sentence said "in Kimmel Center" and "outdoors at the
  // Bust of Sylvette", and "outdoors" is the one fact about Friday a visitor needs most.
  sessions: Object.freeze([
    Object.freeze({ day: 'Sundays', time: '3–5 PM', at: 'in', place: 'Kimmel Center, Room 606' }),
    Object.freeze({ day: 'Fridays', time: '5–7 PM', at: 'outdoors at the', place: 'Bust of Sylvette' }),
  ]),
  notes: Object.freeze([
    'Come to either or both.',
    'All equipment is provided.',
    'Anyone is welcome, regardless of experience!',
  ]),
});

/**
 * The header of each sub-page: a small label, a heading, a line of lead. Every page but
 * the home page opens on one, centred, on the bare gradient.
 *
 * The About page mirrors the team page the client pointed at — a label, a statement
 * heading, one paragraph, then the people. The Media lead is the client's own rewording
 * ("Our performances and videos"), replacing a line that read like a caption.
 */
export const PAGE_COPY = Object.freeze({
  about: Object.freeze({
    label: 'About us',
    heading: 'The people who make up Violet Diabolo',
    lead: ABOUT.body,
    team: 'BOARD',
  }),
  // No label: it would say "Media" directly above a heading that says "Media". The
  // videos' own heading is for the document outline only (h1, then h2, then each video's
  // h3) and is not shown -- the page header already says what the list is.
  media: Object.freeze({
    heading: 'Media',
    lead: 'Our performances and videos',
    videos: 'Videos',
  }),
  // The lead does not restate the practice notes ("Anyone is welcome...", "All equipment
  // is provided") because the schedule directly under it lists them, word for word.
  join: Object.freeze({
    label: 'Join us',
    heading: 'Join Violet Diabolo',
    lead: 'Here’s how to get started.',
    practices: 'PRACTICES',
    involved: 'GET INVOLVED',
    discord: Object.freeze({ title: 'Discord', action: 'Join our Discord' }),
  }),
});

/**
 * The home page's previews of the other three pages, in the nav's own order: a heading,
 * a taste of the page, and a link to the rest of it. The client asked for "a simplified
 * version of all sections" on the main page, and these are the sections the nav names.
 *
 * The board is not previewed, deliberately. The client moved it to About us so that it
 * "will not appear in the default page", and "Meet the board" is the way to it instead.
 */
export const HOME_SECTIONS = Object.freeze({
  about: Object.freeze({ heading: 'ABOUT US', more: 'Meet the board' }),
  media: Object.freeze({ heading: 'MEDIA', more: 'See all videos' }),
  join: Object.freeze({ heading: 'JOIN US', more: 'How to join' }),
});

/**
 * Organisations the club has performed for, for the marquee on the home page's first screen.
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

/**
 * The board: a name and a position, and a photograph where there is one.
 *
 * No bios, at the client's request: "We will just have position and name for now". That
 * took the Fall 2026 board's lorem-ipsum filler with it, and the two real bios carried
 * over from the previous site -- Aaron's and Jonathan's, on the older boards. Both are in
 * git history for when bios come back. The card (src/ui/board.js) has no bio line to fill
 * any more, so bringing them back is a change there and here together.
 */
const AARON = { name: 'Aaron Hui', position: 'President', image: 'aaron' };

// Spring 2024: the same person in a different seat.
const AARON_SECRETARY = { ...AARON, position: 'Secretary' };

const JON = { name: 'Jonathan Sun', position: 'Artistic Director', image: 'jon' };

// The source site filled this slot with a member literally named "N/A" whose photo
// hotlinked Google's image CDN. Rendered as an honest open-slot card instead.
const OPEN_SLOT = {
  name: 'More board members coming soon',
  position: 'Open slot',
  image: null,
  placeholder: true,
};

/**
 * Fall 2026. Three photographs from the club's Drive folder and Aaron's from the previous
 * site; Emily and Megan are waiting on theirs (`image: null`, for which src/ui/board.js
 * stands in an initials tile). None is `placeholder: true` -- that flag means an unfilled
 * seat on the board, and every seat here is filled.
 */
const FALL_2026 = [
  { name: 'Barry Chen', position: 'Co-President', image: 'board-barry' },
  { name: 'Evan Yu', position: 'Co-President', image: 'board-evan' },
  { name: 'Hannah Chen', position: 'Logistics', image: 'board-hannah' },
  { name: 'Emily Chen', position: 'Media', image: null },
  { name: 'Megan Kim', position: 'Media', image: null },
  // Aaron's photograph is the one from the previous site -- a different shoot from the
  // three above it, and the client's call to keep it rather than stand a tile in its
  // place. AARON.image rather than the literal, so the two never drift.
  { name: 'Aaron Hui', position: 'Treasurer', image: AARON.image },
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

/**
 * `id` is how the Join us page places each form in its own card, in the order it wants
 * them -- the interest form first, the booking request last -- without depending on the
 * order of this array or on a title nobody would think to keep in sync.
 */
export const FORMS = [
  {
    id: 'request',
    title: 'Performance / Teaching Request',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdqk-vvGryB5SCO2AM-iL2FXDi_2MNJHLJxnyxeckUNRoRzgw/viewform?embedded=true',
  },
  {
    id: 'interest',
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
  { label: 'Discord', href: 'https://discord.gg/7Kn3udMrrf', icon: 'discord' },
];

/** The Join us page's Discord step points here too: one URL, read from one place. */
export const DISCORD = SOCIALS.find((s) => s.icon === 'discord').href;

/**
 * The page's two standalone photographs: the team on the home page's first screen, and
 * two members at practice in the events panel. Both carry a width/height pair so the
 * <img>'s own attributes reserve the box before the bytes land (src/ui/picture.js).
 *
 * The two that came over from the previous site — the USADA group shot on the old About
 * panel and the stage strip on the old Contact panel — went with the panels they sat in.
 * The About page follows the client's team-page reference, which has no standalone photo,
 * and Contact is a footer now. Both masters are recoverable from git history.
 */
export const PHOTOS = {
  hero:  { base: 'hero-group', widths: [800, 1600], width: 1600, height: 1200, alt: 'Five Violet Diabolo members on the lawn after practice, diabolos spinning' },
  events: { base: 'events-practice', widths: [600, 1200], width: 1200, height: 1600, alt: 'Two club members practising together on the lawn, a diabolo on the string between them' },
};
