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
    'Practices are on Saturdays from 1-3PM at Kimmel 606! Our first practice will be on September 20. ' +
    'All equipment will be provided, and anyone is welcome, regardless of experience!',
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
  image: './images/aaron-800.avif',
  description:
    "Heyo, I'm Aaron and I'm the current president of Violet Diabolo! I am a vertax one-trick (which " +
    "means that you should be very careful near me when I'm yoyoing), but I'm currently working on 3D " +
    'and trying to learn more integrals! In my free time I like to play Tetris (modern, not NES) and ' +
    'spin other non yoyo props like poi, whip, staff, or ropedart. Sometimes you’ll catch me playing ' +
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
  image: './images/jon-800.avif',
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

export const BOARD = {
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
