# Violet Diabolo Scroll-Explosion Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild violetdiabolo.github.io as one continuous scroll page whose spine is a scroll-scrubbed exploded-view diagram of a purple diabolo, rendered as real 3D geometry.

**Architecture:** Three.js renders seven procedurally-lathed parts under a single `root` object; anime.js v4 owns every timeline and scrubs the master explosion timeline from scroll position. A canvas-signal-driven quality tier and an IntersectionObserver lifecycle keep the realtime system honest. Content is plain static HTML enhanced progressively — fully readable with the canvas absent.

**Tech Stack:** Vite 8 (static build, no framework runtime) · Three.js 0.186 (rendering only) · anime.js 4.5 (all timelines + scroll scrub) · Vitest 5 (tests) · sharp (build-time image pipeline)

**Spec:** `docs/superpowers/specs/2026-09-10-violet-diabolo-scroll-explosion-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Versions (verified installed, not assumed):** `three@0.186.0`, `animejs@4.5.0`, `vite@^8.2`. Pin with `^`.
- **One owner per transform.** The render loop owns `root.rotation.y` and the bearing mesh's local spin. anime.js owns each part `Group`'s `.position` and `.rotation`. No `Object3D` transform is written by both. No scalar is written by the render loop.
- **No second animation engine.** GSAP and Motion are excluded by one-owner-per-concern. Do not add them.
- **Never pause anime.js's global engine.** `engine.pauseOnDocumentHidden` is already `true` by default and the engine self-idles (`engine.paused === true`, `engine.reqId === 0`) when it has no active children. Pausing it by hand would freeze visible content animations. Pause only the 3D timeline and the 3D rAF.
- **Verify behaviour under the real condition.** Scroll the stage genuinely offscreen; genuinely background the tab. Never verify "pauses when hidden" by dispatching `visibilitychange`. Label any synthetic stand-in as synthetic. Never report a mitigation you have not observed working.
- **Content is never gated behind the 3D system.** Every section must be readable with WebGL disabled.
- **Copy is verbatim** from `content/` modules. Do not paraphrase club copy, dates, or names.
- **No image over 400 KB ships.** Source masters live in `assets-src/`, generated derivatives in `public/images/`.
- **Module boundaries:** `content/*` holds no markup. `ui/*` holds no 3D. `diabolo/*` holds no copy.

## File Structure

| Path | Responsibility |
|---|---|
| `index.html` | Static content column + stage container. Renders before JS. |
| `vite.config.js` | Build config, base path for GitHub Pages, Vitest config |
| `scripts/build-assets.mjs` | sharp pipeline: masters → responsive AVIF/WebP |
| `src/main.js` | Composition root. Wires stage + lifecycle + choreography + UI. |
| `src/content/index.js` | All site copy and data as plain objects. No markup. |
| `src/diabolo/profiles.js` | 2-D lathe profile point arrays per part. Pure math. |
| `src/diabolo/materials.js` | Gradient map, env map, material factory |
| `src/diabolo/build.js` | Assembles the 7 part groups into `root` |
| `src/diabolo/stage.js` | Renderer, camera, resize, quality tier |
| `src/diabolo/lifecycle.js` | IntersectionObserver + visibility → start/stop |
| `src/scroll/choreography.js` | The master scrubbed explosion timeline |
| `src/ui/*.js` | Section rendering, semester switcher, video/form facades |
| `src/fallback/detect.js` | WebGL + reduced-motion detection |
| `src/styles/*.css` | base / stage / sections |
| `tests/*.test.js` | Vitest unit tests |

---
### Task 1: Toolchain scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/styles/base.css`
- Create: `tests/smoke.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `npm run dev`, `npm run build`, `npm test`. Vite `base: './'` so the build works from a GitHub Pages project path.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "violet-diabolo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "npm run assets && vite build",
    "preview": "vite preview",
    "assets": "node scripts/build-assets.mjs",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "animejs": "^4.5.0",
    "three": "^0.186.0"
  },
  "devDependencies": {
    "jsdom": "^25.0.1",
    "sharp": "^0.34.0",
    "vite": "^8.2.2",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

`base: './'` is required — GitHub Pages serves this from a subpath in some configurations and absolute asset URLs would 404.

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/**/*.dom.test.js', 'jsdom']],
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Write the failing smoke test**

```js
// tests/smoke.test.js
import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../src/main.js';

describe('toolchain', () => {
  it('resolves the app entry module', () => {
    expect(APP_NAME).toBe('violet-diabolo');
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `npm install && npm test`
Expected: FAIL — `Failed to resolve import "../src/main.js"`.

- [ ] **Step 5: Create the minimal entry and HTML shell**

The content column is real HTML so it paints before Three.js parses. `#stage` reserves its box in CSS, so mounting the canvas causes no layout shift.

```js
// src/main.js
export const APP_NAME = 'violet-diabolo';
```

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Violet Diabolo</title>
  <meta name="description" content="Premier Diabolo Team at NYU" />
  <link rel="icon" href="./favicon.ico" />
  <link rel="stylesheet" href="./src/styles/base.css" />
</head>
<body>
  <div id="stage" aria-hidden="true"><canvas id="renderer"></canvas></div>
  <main id="content"></main>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

```css
/* src/styles/base.css */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: #0a0710; color: #f4f0f8; }
#stage { position: sticky; top: 0; height: 100dvh; width: 100%; }
#stage > canvas { display: block; width: 100%; height: 100%; }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add package.json vite.config.js index.html src tests
git commit -m "chore: scaffold Vite + Vitest toolchain"
```

---

### Task 2: Content data modules

Copy is recovered verbatim from `github.com/violetdiabolo/violetdiabolo.github.io`. This task holds **no markup** — it is the single source of truth every UI module reads.

**Files:**
- Create: `src/content/index.js`
- Test: `tests/content.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: named exports `SITE`, `ABOUT`, `EVENTS`, `MEDIA`, `BOARD`, `CONTACT`, `FORMS`, `SOCIALS`.
  - `SITE: { name: string, tagline: string }`
  - `ABOUT: { heading: string, body: string }`
  - `EVENTS: { heading: string, body: string }`
  - `MEDIA: Array<{ name: string, youtubeId: string }>`
  - `BOARD: Record<string, Array<{ name, position, description, image: string|null }>>` — insertion order is display order, newest semester first
  - `CONTACT: { email: string, linktree: string }`
  - `FORMS: Array<{ title: string, url: string }>`
  - `SOCIALS: Array<{ label: string, href: string, icon: string }>`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/content.test.js`
Expected: FAIL — cannot resolve `../src/content/index.js`.

- [ ] **Step 3: Create `src/content/index.js`**

Copy the `body` strings **character for character** from the source repo, including the curly apostrophes in `NYU’s` and `Hell’s`.

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/content.test.js`
Expected: PASS, 8 tests. The Fall 2023 roster legitimately has 2 entries, not 3 — the placeholder assertion counts exactly one per roster, which holds.

- [ ] **Step 5: Commit**

```bash
git add src/content tests/content.test.js
git commit -m "feat: extract site content from legacy React app"
```

---
### Task 3: Image pipeline

Measured on the real masters: `vdgroupphotousadc.png` is **11.3 MB**; at 1600 px wide it becomes **147 KB AVIF / 210 KB WebP** in under a second. Shipping the PNG is not acceptable at any register.

**Files:**
- Create: `scripts/build-assets.mjs`
- Create: `assets-src/` (masters, copied from the legacy repo and committed — they are the only reproducible source)
- Test: `tests/assets.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `public/images/<name>-<width>.{avif,webp}` and a `<name>-<width>.jpg` fallback for the two hero images. Content modules reference `./images/aaron-800.avif` and `./images/jon-800.avif` (Task 2).

- [ ] **Step 1: Copy the masters into the repo**

```bash
mkdir -p assets-src public
git clone --depth 1 https://github.com/violetdiabolo/violetdiabolo.github.io.git /tmp/vd-src
cp /tmp/vd-src/src/assets/vdgroupphotousadc.png assets-src/group-usadc.png
cp /tmp/vd-src/src/assets/usadcphoto.png        assets-src/usadc-wide.png
cp /tmp/vd-src/public/aaron_boardphoto.jpg      assets-src/aaron.jpg
cp /tmp/vd-src/public/jon_boardphoto.jpg        assets-src/jon.jpg
cp /tmp/vd-src/src/assets/engage.svg            public/engage.svg
cp /tmp/vd-src/src/assets/logo.png              public/logo.png
cp /tmp/vd-src/public/favicon.ico               public/favicon.ico
```

- [ ] **Step 2: Write the failing test**

```js
// tests/assets.test.js
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { TARGETS } from '../scripts/build-assets.mjs';

describe('image pipeline', () => {
  it('declares every master that content references', () => {
    const names = TARGETS.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['group-usadc', 'usadc-wide', 'aaron', 'jon']));
  });

  it('emits an 800px derivative for each board portrait', () => {
    for (const name of ['aaron', 'jon']) {
      const t = TARGETS.find((x) => x.name === name);
      expect(t.widths).toContain(800);
    }
  });

  it.runIf(existsSync('public/images'))('ships no image over 400 KB', () => {
    const files = readdirSync('public/images');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const kb = statSync(`public/images/${f}`).size / 1024;
      expect(kb, `${f} is ${kb.toFixed(0)} KB`).toBeLessThan(400);
    }
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run tests/assets.test.js`
Expected: FAIL — cannot resolve `../scripts/build-assets.mjs`.

- [ ] **Step 4: Write the pipeline**

```js
// scripts/build-assets.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public', 'images');

export const TARGETS = [
  { name: 'group-usadc', file: 'group-usadc.png', widths: [900, 1600, 2400], jpg: true },
  { name: 'usadc-wide',  file: 'usadc-wide.png',  widths: [900, 1600, 2400], jpg: true },
  { name: 'aaron',       file: 'aaron.jpg',       widths: [400, 800],        jpg: false },
  { name: 'jon',         file: 'jon.jpg',         widths: [400, 800],        jpg: false },
];

export async function buildAssets() {
  await mkdir(OUT, { recursive: true });
  const written = [];
  for (const t of TARGETS) {
    for (const w of t.widths) {
      const base = sharp(path.join(SRC, t.file)).resize(w, null, { withoutEnlargement: true });
      const jobs = [
        base.clone().avif({ quality: 55 }).toFile(path.join(OUT, `${t.name}-${w}.avif`)),
        base.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${t.name}-${w}.webp`)),
      ];
      if (t.jpg) jobs.push(base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${t.name}-${w}.jpg`)));
      const results = await Promise.all(jobs);
      results.forEach((r, i) => written.push({ file: `${t.name}-${w}`, kb: Math.round(r.size / 1024), i }));
    }
  }
  return written;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const written = await buildAssets();
  const worst = Math.max(...written.map((w) => w.kb));
  console.log(`wrote ${written.length} files, largest ${worst} KB`);
  if (worst >= 400) {
    console.error(`FAIL: ${worst} KB exceeds the 400 KB budget`);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Run the pipeline, then the test**

Run: `npm run assets && npx vitest run tests/assets.test.js`
Expected: pipeline prints `wrote 20 files, largest <N> KB` with N under 400; test PASSes, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts assets-src public tests/assets.test.js
git commit -m "feat: add sharp image pipeline, 11MB PNG -> ~150KB AVIF"
```

---

### Task 4: Diabolo profiles

The crux of the whole page. A diabolo is a surface of revolution, so every part is a 2-D profile revolved about +Y — **no `.glb` assets, no Draco decoder**. Keep all silhouette constants in this one module so the shape can be tuned against the reference photo without touching scene code.

**Files:**
- Create: `src/diabolo/profiles.js`
- Test: `tests/profiles.test.js`

**Interfaces:**
- Consumes: `three` (`Vector2`)
- Produces:
  - `PART_IDS: readonly string[]` — `['cupTop','gasketTop','hubConeTop','axleBearing','hubConeBottom','gasketBottom','cupBottom']`, ordered top to bottom
  - `DIMS: { neckRadius, rimRadius, cupHeight, gasketRadius, gasketThickness, hubHeight, bearingRadius, bearingHeight }`
  - `cupProfile(segments: number): Vector2[]` — neck (y=0) to rim (y=cupHeight)
  - `gasketProfile(): Vector2[]`
  - `hubConeProfile(): Vector2[]`
  - `bearingProfile(): Vector2[]`

- [ ] **Step 1: Write the failing test**

Test the *invariants* of the silhouette, not exact coordinates — exact numbers will be tuned against the photo and the test must survive that.

```js
// tests/profiles.test.js
import { describe, it, expect } from 'vitest';
import { PART_IDS, DIMS, cupProfile, gasketProfile, hubConeProfile, bearingProfile } from '../src/diabolo/profiles.js';

describe('part inventory', () => {
  it('names seven parts ordered top to bottom', () => {
    expect(PART_IDS).toEqual([
      'cupTop', 'gasketTop', 'hubConeTop', 'axleBearing', 'hubConeBottom', 'gasketBottom', 'cupBottom',
    ]);
  });

  it('is vertically symmetric about the bearing', () => {
    // Chained .replace(/Top$/...).replace(/Bottom$/...) would undo itself. Swap in one step.
    const swap = (id) =>
      id.endsWith('Top') ? id.slice(0, -3) + 'Bottom'
      : id.endsWith('Bottom') ? id.slice(0, -6) + 'Top'
      : id;
    expect(PART_IDS.map(swap).reverse()).toEqual([...PART_IDS]);
  });
});

describe('cupProfile', () => {
  it('returns the requested segment count plus the closing point', () => {
    expect(cupProfile(64)).toHaveLength(65);
  });

  it('runs from the axle neck up to the outer rim', () => {
    const p = cupProfile(64);
    expect(p[0].y).toBeCloseTo(0, 5);
    expect(p.at(-1).y).toBeCloseTo(DIMS.cupHeight, 5);
    expect(p[0].x).toBeCloseTo(DIMS.neckRadius, 5);
    expect(p.at(-1).x).toBeCloseTo(DIMS.rimRadius, 5);
  });

  it('widens monotonically — a diabolo cup never pinches back in', () => {
    const p = cupProfile(64);
    for (let i = 1; i < p.length; i++) {
      expect(p[i].x).toBeGreaterThanOrEqual(p[i - 1].x - 1e-9);
      expect(p[i].y).toBeGreaterThan(p[i - 1].y - 1e-9);
    }
  });

  it('flares like a bowl, not a cone: radius opens fastest at the neck, height climbs fastest at the rim', () => {
    const p = cupProfile(64);
    // Decelerating flare — near the rim the wall is close to vertical.
    expect(p[16].x - p[0].x).toBeGreaterThan(p[64].x - p[48].x);
    // Accelerating rise — the same fact seen on the other axis.
    expect(p[64].y - p[48].y).toBeGreaterThan(p[16].y - p[0].y);
  });

  it('never produces a negative radius at any segment count', () => {
    for (const n of [8, 16, 64, 128]) {
      for (const pt of cupProfile(n)) expect(pt.x).toBeGreaterThan(0);
    }
  });
});

describe('small parts', () => {
  it('keeps the gasket wider than the neck but far narrower than the rim', () => {
    expect(DIMS.gasketRadius).toBeGreaterThan(DIMS.neckRadius);
    expect(DIMS.gasketRadius).toBeLessThan(DIMS.rimRadius * 0.5);
    expect(gasketProfile().length).toBeGreaterThan(2);
  });

  it('tapers the hub cone inward toward the bearing', () => {
    const p = hubConeProfile();
    expect(p[0].x).toBeGreaterThan(p.at(-1).x);
  });

  it('keeps the bearing the narrowest part of the assembly', () => {
    expect(DIMS.bearingRadius).toBeLessThan(DIMS.neckRadius);
    expect(bearingProfile().length).toBeGreaterThan(2);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/profiles.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/profiles.js`.

- [ ] **Step 3: Write the profiles**

```js
// src/diabolo/profiles.js
import { Vector2 } from 'three';

/** Ordered top to bottom. The scroll choreography relies on this order. */
export const PART_IDS = Object.freeze([
  'cupTop', 'gasketTop', 'hubConeTop', 'axleBearing', 'hubConeBottom', 'gasketBottom', 'cupBottom',
]);

/**
 * Silhouette constants, in scene units. Tune these against the reference photo —
 * nothing outside this module encodes the shape.
 */
export const DIMS = Object.freeze({
  neckRadius: 0.14,
  rimRadius: 1.0,
  cupHeight: 0.86,
  gasketRadius: 0.19,
  gasketThickness: 0.045,
  hubHeight: 0.3,
  bearingRadius: 0.075,
  bearingHeight: 0.26,
});

/** Shape exponents: <1 flares late (concave), >1 flares early (convex/cone-like). */
const RADIUS_EASE = 0.62;
const HEIGHT_EASE = 1.28;

/**
 * Half-profile of one cup, revolved about +Y.
 * Index 0 is the axle neck (y = 0); the last index is the outer rim (y = cupHeight).
 */
export function cupProfile(segments = 96) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = DIMS.neckRadius + (DIMS.rimRadius - DIMS.neckRadius) * Math.pow(t, RADIUS_EASE);
    const y = DIMS.cupHeight * Math.pow(t, HEIGHT_EASE);
    pts.push(new Vector2(radius, y));
  }
  return pts;
}

/** Thin ring seated on the cup's neck — the cyan gasket in the reference photo. */
export function gasketProfile() {
  const r = DIMS.gasketRadius;
  const h = DIMS.gasketThickness;
  const inner = DIMS.neckRadius * 0.92;
  return [
    new Vector2(inner, 0),
    new Vector2(r, 0),
    new Vector2(r, h),
    new Vector2(inner, h),
    new Vector2(inner, 0),
  ];
}

/** Black cone tapering from the cup neck down to the bearing. */
export function hubConeProfile() {
  const pts = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = DIMS.neckRadius * (1 - t) + DIMS.bearingRadius * t;
    pts.push(new Vector2(radius, DIMS.hubHeight * t));
  }
  return pts;
}

/** Chrome spool at the centre — the narrowest part of the assembly. */
export function bearingProfile() {
  const r = DIMS.bearingRadius;
  const h = DIMS.bearingHeight;
  const lip = r * 1.18;
  return [
    new Vector2(0, 0),
    new Vector2(lip, 0),
    new Vector2(lip, h * 0.08),
    new Vector2(r, h * 0.16),
    new Vector2(r, h * 0.84),
    new Vector2(lip, h * 0.92),
    new Vector2(lip, h),
    new Vector2(0, h),
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/profiles.test.js`
Expected: PASS, 10 tests.

Reference values for the shipped constants (`RADIUS_EASE = 0.62`, `HEIGHT_EASE = 1.28`), so a tuning
pass can tell a deliberate change from a broken one:

| Span | Δradius | Δheight |
|---|---|---|
| neck → t=0.25 | 0.3641 | 0.1458 |
| t=0.75 → rim | 0.1405 | 0.2649 |

If the bowl test fails, the eases have crossed 1: `RADIUS_EASE` must stay **below** 1 and
`HEIGHT_EASE` **above** 1. Swapping them yields a cone, which is the classic wrong silhouette here.

- [ ] **Step 5: Commit**

```bash
git add src/diabolo/profiles.js tests/profiles.test.js
git commit -m "feat: add procedural diabolo lathe profiles"
```

---
### Task 5: Materials

Flat lights make moulded plastic read as clay. `RoomEnvironment` + `PMREMGenerator` gives real image-based lighting **procedurally — no HDR file to download**.

**Files:**
- Create: `src/diabolo/materials.js`
- Test: `tests/materials.dom.test.js`

**Interfaces:**
- Consumes: `three`, `three/examples/jsm/environments/RoomEnvironment.js`
- Produces:
  - `GRADIENT_STOPS: Array<{ offset: number, color: string }>`
  - `createGradientTexture(): CanvasTexture` — violet at the neck fading to milky white at the rim
  - `createEnvironment(renderer): Texture` — PMREM-prefiltered `RoomEnvironment`
  - `createMaterials({ renderer, tier }): { cup, gasket, hub, bearing }`
  - `disposeMaterials(materials): void`
- Note: `createMaterials` needs a real WebGL context, so it is **not** unit-tested here — it is covered by the browser verification in Task 12. Only the pure gradient data is unit-tested, in jsdom.

- [ ] **Step 1: Write the failing test**

```js
// tests/materials.dom.test.js
import { describe, it, expect } from 'vitest';
import { GRADIENT_STOPS } from '../src/diabolo/materials.js';

describe('cup gradient', () => {
  it('runs neck to rim across the full range', () => {
    expect(GRADIENT_STOPS[0].offset).toBe(0);
    expect(GRADIENT_STOPS.at(-1).offset).toBe(1);
  });

  it('keeps stops in ascending order', () => {
    const offsets = GRADIENT_STOPS.map((s) => s.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('uses valid hex colours throughout', () => {
    for (const s of GRADIENT_STOPS) expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lightens monotonically toward the rim', () => {
    const lum = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722;
    };
    const values = GRADIENT_STOPS.map((s) => lum(s.color));
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/materials.dom.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/materials.js`.

- [ ] **Step 3: Write the materials module**

```js
// src/diabolo/materials.js
import {
  CanvasTexture, Color, MeshPhysicalMaterial, MeshStandardMaterial,
  PMREMGenerator, SRGBColorSpace, DoubleSide,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Neck (0) to rim (1). Matches the translucent violet-to-milky cup in the reference photo. */
export const GRADIENT_STOPS = [
  { offset: 0.00, color: '#7b3fd4' },
  { offset: 0.42, color: '#a86ef0' },
  { offset: 0.78, color: '#ddc9f7' },
  { offset: 1.00, color: '#f6f1fb' },
];

export function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
  for (const { offset, color } of GRADIENT_STOPS) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function createEnvironment(renderer) {
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

/**
 * `transmission` is gated to the `high` tier: it forces an extra render pass per
 * frame and is the most expensive single feature on the page.
 */
export function createMaterials({ renderer, tier }) {
  const map = createGradientTexture();
  const env = createEnvironment(renderer);
  const high = tier === 'high';

  const cup = new MeshPhysicalMaterial({
    map,
    envMap: env,
    envMapIntensity: 1.15,
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: high ? 1.0 : 0.88,
    transmission: high ? 0.55 : 0.0,
    thickness: high ? 0.6 : 0.0,
    ior: 1.46,
    side: DoubleSide,
  });

  const gasket = new MeshStandardMaterial({
    color: new Color('#5fd7e8'), envMap: env, roughness: 0.3, metalness: 0.1,
  });

  const hub = new MeshStandardMaterial({
    color: new Color('#131017'), envMap: env, roughness: 0.42, metalness: 0.05,
  });

  const bearing = new MeshStandardMaterial({
    color: new Color('#cfd2d8'), envMap: env, roughness: 0.18, metalness: 1.0,
  });

  return { cup, gasket, hub, bearing, _map: map, _env: env };
}

export function disposeMaterials(materials) {
  for (const value of Object.values(materials)) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/materials.dom.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/diabolo/materials.js tests/materials.dom.test.js
git commit -m "feat: add diabolo materials with procedural IBL"
```

---

### Task 6: Assemble the diabolo

**Files:**
- Create: `src/diabolo/build.js`
- Test: `tests/build.test.js`

**Interfaces:**
- Consumes: `PART_IDS`, `DIMS`, `cupProfile`, `gasketProfile`, `hubConeProfile`, `bearingProfile` (Task 4)
- Produces:
  - `HOME: Record<string, { y: number, flip: boolean }>` — assembled rest positions; the timeline's origin
  - `buildDiabolo({ materials, segments }): { root: Group, parts: Record<string, Group> }`
  - Every part `Group` carries `group.userData.partId`. The `axleBearing` group additionally carries `group.userData.spinMesh` — the render loop writes that mesh, anime.js writes the group. Two objects, two owners.

Geometry is pure math, so this runs headless in Node with no WebGL context. Pass a stub for `materials`.

- [ ] **Step 1: Write the failing test**

```js
// tests/build.test.js
import { describe, it, expect } from 'vitest';
import { Group } from 'three';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { PART_IDS, DIMS } from '../src/diabolo/profiles.js';

const stubMaterials = { cup: {}, gasket: {}, hub: {}, bearing: {} };
const build = () => buildDiabolo({ materials: stubMaterials, segments: 32 });

describe('buildDiabolo', () => {
  it('creates exactly one group per declared part', () => {
    const { parts } = build();
    expect(Object.keys(parts).sort()).toEqual([...PART_IDS].sort());
    for (const id of PART_IDS) expect(parts[id]).toBeInstanceOf(Group);
  });

  it('parents every part to root', () => {
    const { root, parts } = build();
    expect(root.children).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) expect(parts[id].parent).toBe(root);
  });

  it('tags each group with its part id', () => {
    const { parts } = build();
    for (const id of PART_IDS) expect(parts[id].userData.partId).toBe(id);
  });

  it('exposes the bearing spin mesh as a distinct object from its group', () => {
    const { parts } = build();
    const spinMesh = parts.axleBearing.userData.spinMesh;
    expect(spinMesh).toBeDefined();
    expect(spinMesh === parts.axleBearing).toBe(false);
    expect(spinMesh.parent).toBe(parts.axleBearing);
  });

  it('stacks assembled parts in strictly descending height', () => {
    const ys = PART_IDS.map((id) => HOME[id].y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it('is vertically symmetric at rest', () => {
    expect(HOME.cupTop.y).toBeCloseTo(-HOME.cupBottom.y, 6);
    expect(HOME.gasketTop.y).toBeCloseTo(-HOME.gasketBottom.y, 6);
    expect(HOME.hubConeTop.y).toBeCloseTo(-HOME.hubConeBottom.y, 6);
    expect(HOME.axleBearing.y).toBeCloseTo(0, 6);
  });

  it('flips exactly the bottom half', () => {
    const flipped = PART_IDS.filter((id) => HOME[id].flip);
    expect(flipped).toEqual(['hubConeBottom', 'gasketBottom', 'cupBottom']);
  });

  it('places every part group at its home position', () => {
    const { parts } = build();
    for (const id of PART_IDS) expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 6);
  });

  it('builds real geometry with vertex positions', () => {
    const { parts } = build();
    for (const id of PART_IDS) {
      const mesh = parts[id].children.find((c) => c.geometry);
      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
    }
  });

  it('keeps the assembly within a sane bounding height', () => {
    const total = HOME.cupTop.y - HOME.cupBottom.y + 2 * DIMS.cupHeight;
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(6);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/build.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/build.js`.

- [ ] **Step 3: Write the builder**

Note the hub cones sit *above and below* the bearing, not at `y: 0` alongside it. That is physically right and it is what makes the strictly-descending-height test pass.

```js
// src/diabolo/build.js
import { Group, LatheGeometry, Mesh } from 'three';
import { PART_IDS, DIMS, cupProfile, gasketProfile, hubConeProfile, bearingProfile } from './profiles.js';

const halfBearing = DIMS.bearingHeight / 2;
const gasketY = halfBearing + DIMS.hubHeight;
const neckY = gasketY + DIMS.gasketThickness;

/**
 * Assembled rest positions. `flip: true` mirrors the part through the XZ plane,
 * which is how the bottom half is built from the same profiles as the top.
 */
export const HOME = Object.freeze({
  cupTop: { y: neckY, flip: false },
  gasketTop: { y: gasketY, flip: false },
  hubConeTop: { y: halfBearing, flip: false },
  axleBearing: { y: 0, flip: false },
  hubConeBottom: { y: -halfBearing, flip: true },
  gasketBottom: { y: -gasketY, flip: true },
  cupBottom: { y: -neckY, flip: true },
});

const PROFILE_FOR = {
  cupTop: (seg) => cupProfile(seg),
  cupBottom: (seg) => cupProfile(seg),
  gasketTop: () => gasketProfile(),
  gasketBottom: () => gasketProfile(),
  hubConeTop: () => hubConeProfile(),
  hubConeBottom: () => hubConeProfile(),
  axleBearing: () => bearingProfile(),
};

const MATERIAL_FOR = {
  cupTop: 'cup', cupBottom: 'cup',
  gasketTop: 'gasket', gasketBottom: 'gasket',
  hubConeTop: 'hub', hubConeBottom: 'hub',
  axleBearing: 'bearing',
};

export function buildDiabolo({ materials, segments = 96 }) {
  const root = new Group();
  root.name = 'diaboloRoot';
  const parts = {};

  for (const id of PART_IDS) {
    const group = new Group();
    group.name = id;
    group.userData.partId = id;

    const radialSegments = Math.max(24, Math.round(segments * 0.75));
    const geometry = new LatheGeometry(PROFILE_FOR[id](segments), radialSegments);
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, materials[MATERIAL_FOR[id]]);

    if (HOME[id].flip) mesh.scale.y = -1;

    // The bearing spins on its own axis. anime.js writes `group`; the render loop
    // writes `spinMesh`. Separate objects keeps one owner per transform.
    if (id === 'axleBearing') {
      mesh.position.y = -halfBearing;
      group.userData.spinMesh = mesh;
    }

    group.add(mesh);
    group.position.y = HOME[id].y;
    root.add(group);
    parts[id] = group;
  }

  return { root, parts };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/build.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/diabolo/build.js tests/build.test.js
git commit -m "feat: assemble seven-part diabolo from lathe profiles"
```

---
### Task 7: Stage and quality tier

**Files:**
- Create: `src/diabolo/stage.js`
- Test: `tests/stage.test.js`

**Interfaces:**
- Consumes: `buildDiabolo` (Task 6), `createMaterials`, `disposeMaterials` (Task 5)
- Produces:
  - `resolveQualityTier(signals): 'high' | 'base'` — pure, fully unit-testable
  - `readSignals(): { pointerFine, viewportWidth, deviceMemory }`
  - `TIER_SETTINGS: Record<'high'|'base', { dpr: number, segments: number, transmission: boolean }>`
  - `createStage({ canvas, tier }): { renderer, scene, camera, root, parts, state, render, resize, dispose }`
  - `state: { spinRate: number }` — anime.js writes this scalar; the render loop reads it

`resolveQualityTier` takes an explicit signals object rather than reading globals, which is what makes it testable in Node. `createStage` needs WebGL and is covered by the browser verification in Task 12.

- [ ] **Step 1: Write the failing test**

```js
// tests/stage.test.js
import { describe, it, expect } from 'vitest';
import { resolveQualityTier, TIER_SETTINGS } from '../src/diabolo/stage.js';

const HIGH_END = { pointerFine: true, viewportWidth: 1440, deviceMemory: 16 };

describe('resolveQualityTier', () => {
  it('selects high for a wide fine-pointer device with ample memory', () => {
    expect(resolveQualityTier(HIGH_END)).toBe('high');
  });

  it('selects high when deviceMemory is unreported, since many browsers omit it', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: undefined })).toBe('high');
  });

  it('drops to base for a coarse pointer regardless of width', () => {
    expect(resolveQualityTier({ ...HIGH_END, pointerFine: false })).toBe('base');
  });

  it('drops to base below 1024px', () => {
    expect(resolveQualityTier({ ...HIGH_END, viewportWidth: 1023 })).toBe('base');
  });

  it('drops to base on low reported memory', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: 4 })).toBe('base');
  });

  it('defaults to base when signals are missing entirely', () => {
    expect(resolveQualityTier({})).toBe('base');
    expect(resolveQualityTier(undefined)).toBe('base');
  });

  it('enables transmission only on the high tier', () => {
    expect(TIER_SETTINGS.high.transmission).toBe(true);
    expect(TIER_SETTINGS.base.transmission).toBe(false);
  });

  it('caps device pixel ratio lower on the base tier', () => {
    expect(TIER_SETTINGS.base.dpr).toBeLessThan(TIER_SETTINGS.high.dpr);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/stage.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/stage.js`.

- [ ] **Step 3: Write the stage**

```js
// src/diabolo/stage.js
import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { buildDiabolo } from './build.js';
import { createMaterials, disposeMaterials } from './materials.js';

export const TIER_SETTINGS = Object.freeze({
  high: { dpr: 2.0, segments: 128, transmission: true },
  base: { dpr: 1.5, segments: 64, transmission: false },
});

/**
 * Capability signals only — never user-agent sniffing. `base` is the safe default
 * whenever a signal is missing.
 */
export function resolveQualityTier(signals) {
  if (!signals) return 'base';
  const { pointerFine, viewportWidth, deviceMemory } = signals;
  if (pointerFine !== true) return 'base';
  if (!(viewportWidth >= 1024)) return 'base';
  if (deviceMemory !== undefined && deviceMemory < 8) return 'base';
  return 'high';
}

export function readSignals() {
  return {
    pointerFine: window.matchMedia('(pointer: fine)').matches,
    viewportWidth: window.innerWidth,
    deviceMemory: navigator.deviceMemory,
  };
}

const IDLE_SPIN = 0.22; // radians/sec for the whole assembly

export function createStage({ canvas, tier }) {
  const settings = TIER_SETTINGS[tier];

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.dpr));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.4);
  camera.lookAt(0, 0, 0);

  const materials = createMaterials({ renderer, tier });
  const { root, parts } = buildDiabolo({ materials, segments: settings.segments });
  scene.add(root);
  scene.environment = materials._env;

  /** anime.js writes this scalar; the render loop reads it. Never the reverse. */
  const state = { spinRate: 1 };
  const spinMesh = parts.axleBearing.userData.spinMesh;

  function render(deltaSeconds) {
    root.rotation.y += IDLE_SPIN * deltaSeconds;
    spinMesh.rotation.y += IDLE_SPIN * 6 * state.spinRate * deltaSeconds;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    root.traverse((o) => o.geometry?.dispose());
    disposeMaterials(materials);
    renderer.dispose();
  }

  resize();
  return { renderer, scene, camera, root, parts, state, render, resize, dispose };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/stage.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/diabolo/stage.js tests/stage.test.js
git commit -m "feat: add stage with capability-based quality tier"
```

---

### Task 8: Lifecycle

This task carries the skill's first non-negotiable. Read the constraints before writing code:

- Skipping work *inside* a still-scheduled rAF is **not** pausing. The frame must not be scheduled at all.
- **Never** pause anime.js's global engine. `engine.pauseOnDocumentHidden` already defaults to `true` and the engine self-idles when it has no active children. Content-section timelines share that engine and would freeze with it.
- Pause on **both** conditions: stage offscreen (IntersectionObserver) and document hidden (`visibilitychange`).

The state machine is pure and injectable, so it is fully testable without a browser. The *real-condition* verification is Task 12 and is not satisfied by these unit tests.

**Files:**
- Create: `src/diabolo/lifecycle.js`
- Test: `tests/lifecycle.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `createLifecycle({ element, onFrame, observerFactory, doc, raf, caf }): { start, stop, isRunning, frameCount, dispose }`
- Injectables default to the real `IntersectionObserver`, `document`, `requestAnimationFrame`, `cancelAnimationFrame`.

- [ ] **Step 1: Write the failing test**

```js
// tests/lifecycle.test.js
import { describe, it, expect, vi } from 'vitest';
import { createLifecycle } from '../src/diabolo/lifecycle.js';

function harness({ hidden = false } = {}) {
  let ioCallback;
  const scheduled = new Map();
  let nextId = 1;

  const raf = vi.fn((cb) => { const id = nextId++; scheduled.set(id, cb); return id; });
  const caf = vi.fn((id) => { scheduled.delete(id); });

  const listeners = {};
  const doc = {
    hidden,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
  };

  const observerFactory = (cb) => { ioCallback = cb; return { observe: vi.fn(), disconnect: vi.fn() }; };

  const onFrame = vi.fn();
  const lifecycle = createLifecycle({ element: {}, onFrame, observerFactory, doc, raf, caf });

  return {
    lifecycle, raf, caf, onFrame, scheduled,
    intersect: (isIntersecting) => ioCallback([{ isIntersecting }]),
    setHidden: (v) => { doc.hidden = v; listeners.visibilitychange?.(); },
    // Drain exactly one scheduled frame, mimicking the browser.
    tick: (at = performance.now()) => {
      const entry = [...scheduled.entries()][0];
      if (!entry) return false;
      scheduled.delete(entry[0]);
      entry[1](at);
      return true;
    },
  };
}

describe('lifecycle', () => {
  it('schedules no frame before the stage is ever visible', () => {
    const h = harness();
    expect(h.raf.mock.calls.length).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('starts running once the stage intersects', () => {
    const h = harness();
    h.intersect(true);
    expect(h.lifecycle.isRunning()).toBe(true);
    expect(h.raf.mock.calls.length).toBe(1);
  });

  it('keeps scheduling successive frames while visible', () => {
    const h = harness();
    h.intersect(true);
    h.tick(); h.tick(); h.tick();
    expect(h.onFrame.mock.calls.length).toBe(3);
    expect(h.scheduled.size).toBe(1);
  });

  it('cancels the pending frame when the stage leaves the viewport', () => {
    const h = harness();
    h.intersect(true);
    h.intersect(false);
    expect(h.caf.mock.calls.length).toBe(1);
    expect(h.scheduled.size).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('schedules nothing further after leaving, rather than running a no-op frame', () => {
    const h = harness();
    h.intersect(true);
    h.tick();
    h.intersect(false);
    const framesBefore = h.onFrame.mock.calls.length;
    expect(h.tick()).toBe(false);
    expect(h.onFrame.mock.calls.length).toBe(framesBefore);
  });

  it('stops when the document hides even though the stage is still onscreen', () => {
    const h = harness();
    h.intersect(true);
    h.setHidden(true);
    expect(h.lifecycle.isRunning()).toBe(false);
    expect(h.scheduled.size).toBe(0);
  });

  it('resumes when the document is shown again', () => {
    const h = harness();
    h.intersect(true);
    h.setHidden(true);
    h.setHidden(false);
    expect(h.lifecycle.isRunning()).toBe(true);
    expect(h.scheduled.size).toBe(1);
  });

  it('stays stopped if the document returns while the stage is offscreen', () => {
    const h = harness();
    h.intersect(true);
    h.intersect(false);
    h.setHidden(true);
    h.setHidden(false);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('never starts when the document is already hidden at first intersection', () => {
    const h = harness({ hidden: true });
    h.intersect(true);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('is idempotent: repeated intersect events schedule only one frame', () => {
    const h = harness();
    h.intersect(true);
    h.intersect(true);
    h.intersect(true);
    expect(h.scheduled.size).toBe(1);
    expect(h.raf.mock.calls.length).toBe(1);
  });

  it('passes a delta in seconds to onFrame', () => {
    const h = harness();
    h.intersect(true);
    h.tick(1000);
    h.tick(1016);
    const [delta] = h.onFrame.mock.calls[1];
    expect(delta).toBeCloseTo(0.016, 3);
  });

  it('clamps the delta across a long gap so nothing jumps on resume', () => {
    const h = harness();
    h.intersect(true);
    h.tick(1000);
    h.tick(6000);
    const [delta] = h.onFrame.mock.calls.at(-1);
    expect(delta).toBeLessThanOrEqual(0.1);
  });

  it('releases the observer and pending frame on dispose', () => {
    const h = harness();
    h.intersect(true);
    h.lifecycle.dispose();
    expect(h.scheduled.size).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/lifecycle.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/lifecycle.js`.

- [ ] **Step 3: Write the lifecycle**

```js
// src/diabolo/lifecycle.js

/** Longest delta handed to onFrame, so a resume after a long pause does not jump. */
const MAX_DELTA = 0.1;

/**
 * Owns the 3D render loop's existence.
 *
 * Runs only while the stage intersects the viewport AND the document is visible.
 * When either fails, the pending frame is CANCELLED and no further frame is
 * scheduled — a no-op frame that still gets scheduled is not a pause.
 *
 * Deliberately does not touch anime.js's global engine: `engine.pauseOnDocumentHidden`
 * already defaults to true, the engine self-idles with no active children, and other
 * visible content timelines share it.
 */
export function createLifecycle({
  element,
  onFrame,
  observerFactory = (cb) => new IntersectionObserver(cb, { threshold: 0 }),
  doc = document,
  raf = requestAnimationFrame,
  caf = cancelAnimationFrame,
}) {
  let rafId = null;
  let visible = false;
  let lastTime = null;
  let frames = 0;

  const active = () => visible && !doc.hidden;

  function frame(now) {
    rafId = null;
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, MAX_DELTA);
    lastTime = now;
    frames += 1;
    onFrame(delta);
    if (active()) rafId = raf(frame);
  }

  function start() {
    if (rafId !== null || !active()) return;
    lastTime = null;
    rafId = raf(frame);
  }

  function stop() {
    if (rafId === null) return;
    caf(rafId);
    rafId = null;
    lastTime = null;
  }

  const sync = () => (active() ? start() : stop());

  const observer = observerFactory((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  });
  observer.observe(element);

  doc.addEventListener('visibilitychange', sync);

  return {
    start,
    stop,
    isRunning: () => rafId !== null,
    frameCount: () => frames,
    dispose() {
      stop();
      observer.disconnect();
      doc.removeEventListener('visibilitychange', sync);
    },
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/lifecycle.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/diabolo/lifecycle.js tests/lifecycle.test.js
git commit -m "feat: add render-loop lifecycle that cancels frames when inactive"
```

---
### Task 9: Scroll choreography

The master scrubbed timeline. anime.js writes each part group's `position`/`rotation` and the `state.spinRate` scalar; it writes nothing the render loop owns.

`onScroll` accepts `{ sync, container, target, axis, enter, leave, repeat, debug, onUpdate }` — verified against the installed `animejs@4.5.0` type definitions, not assumed.

**Files:**
- Create: `src/scroll/choreography.js`
- Test: `tests/choreography.test.js`

**Interfaces:**
- Consumes: `PART_IDS` (Task 4), `HOME` (Task 6), `parts` and `state` (Task 7)
- Produces:
  - `SCROLL_BEATS: Array<{ section: string, part: string, offset: [x, y, z], spinRate: number }>` — pure data, unit-tested
  - `createChoreography({ parts, state, stageEl }): { timeline, dispose }`

- [ ] **Step 1: Write the failing test**

```js
// tests/choreography.test.js
import { describe, it, expect } from 'vitest';
import { SCROLL_BEATS } from '../src/scroll/choreography.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

describe('SCROLL_BEATS', () => {
  it('assigns every part exactly one beat', () => {
    const parts = SCROLL_BEATS.map((b) => b.part);
    expect(new Set(parts).size).toBe(parts.length);
    expect(parts.slice().sort()).toEqual([...PART_IDS].sort());
  });

  it('walks the documented section order', () => {
    expect(SCROLL_BEATS.map((b) => b.section)).toEqual([
      'about', 'events', 'events', 'media', 'board', 'board', 'contact',
    ]);
  });

  it('moves every part away from the origin', () => {
    for (const b of SCROLL_BEATS) {
      const distance = Math.hypot(b.offset[0], b.offset[1], b.offset[2]);
      expect(distance, `${b.part} never leaves home`).toBeGreaterThan(0.4);
    }
  });

  it('sends the top half up and the bottom half down', () => {
    const y = (part) => SCROLL_BEATS.find((b) => b.part === part).offset[1];
    expect(y('cupTop')).toBeGreaterThan(0);
    expect(y('gasketTop')).toBeGreaterThan(0);
    expect(y('hubConeTop')).toBeGreaterThan(0);
    expect(y('cupBottom')).toBeLessThan(0);
    expect(y('gasketBottom')).toBeLessThan(0);
    expect(y('hubConeBottom')).toBeLessThan(0);
  });

  it('spins the bearing up hardest at the media beat', () => {
    const bearing = SCROLL_BEATS.find((b) => b.part === 'axleBearing');
    expect(bearing.section).toBe('media');
    const fastest = Math.max(...SCROLL_BEATS.map((b) => b.spinRate));
    expect(bearing.spinRate).toBe(fastest);
    expect(bearing.spinRate).toBeGreaterThan(1);
  });

  it('separates parts laterally so labels do not collide', () => {
    const xs = SCROLL_BEATS.map((b) => b.offset[0]);
    expect(new Set(xs).size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/choreography.test.js`
Expected: FAIL — cannot resolve `../src/scroll/choreography.js`.

- [ ] **Step 3: Write the choreography**

```js
// src/scroll/choreography.js
import { createTimeline, onScroll } from 'animejs';
import { HOME } from '../diabolo/build.js';

/**
 * One beat per part, in scroll order. `offset` is added to the part's HOME position;
 * `spinRate` scales the bearing's local spin, which the render loop reads from state.
 */
export const SCROLL_BEATS = [
  { section: 'about',   part: 'cupTop',        offset: [-1.55,  1.95, 0.15], spinRate: 1.0 },
  { section: 'events',  part: 'gasketTop',     offset: [ 1.70,  1.30, 0.10], spinRate: 1.0 },
  { section: 'events',  part: 'hubConeTop',    offset: [ 1.35,  0.62, 0.30], spinRate: 1.0 },
  { section: 'media',   part: 'axleBearing',   offset: [-1.80,  0.05, 0.55], spinRate: 4.5 },
  { section: 'board',   part: 'hubConeBottom', offset: [ 1.35, -0.62, 0.30], spinRate: 1.0 },
  { section: 'board',   part: 'gasketBottom',  offset: [ 1.70, -1.30, 0.10], spinRate: 1.0 },
  { section: 'contact', part: 'cupBottom',     offset: [-1.55, -1.95, 0.15], spinRate: 1.0 },
];

const BEAT_DURATION = 100;
const BEAT_STAGGER = 68;

export function createChoreography({ parts, state, stageEl }) {
  const timeline = createTimeline({
    defaults: { ease: 'inOutQuad', duration: BEAT_DURATION },
    autoplay: onScroll({
      target: stageEl,
      sync: 0.15,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  SCROLL_BEATS.forEach((beat, index) => {
    const group = parts[beat.part];
    const home = HOME[beat.part];
    const at = index * BEAT_STAGGER;

    timeline.add(group.position, {
      x: beat.offset[0],
      y: home.y + beat.offset[1],
      z: beat.offset[2],
    }, at);

    timeline.add(group.rotation, {
      x: beat.offset[2] * 0.35,
      z: beat.offset[0] * 0.18,
    }, at);

    if (beat.spinRate !== 1) {
      timeline
        .add(state, { spinRate: beat.spinRate }, at)
        .add(state, { spinRate: 1 }, at + BEAT_DURATION);
    }
  });

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/choreography.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/scroll/choreography.js tests/choreography.test.js
git commit -m "feat: add scroll-scrubbed explosion choreography"
```

---

### Task 10: Content sections and facades

`ui/*` holds no 3D and `content/*` holds no markup — this task is the seam between them.

**Files:**
- Create: `src/ui/sections.js`, `src/ui/board.js`, `src/ui/media.js`, `src/ui/forms.js`
- Modify: `src/main.js`
- Test: `tests/ui.dom.test.js`

**Interfaces:**
- Consumes: everything exported from `src/content/index.js` (Task 2); `createStage`, `resolveQualityTier`, `readSignals` (Task 7); `createLifecycle` (Task 8); `createChoreography` (Task 9); `supportsWebGL`, `prefersReducedMotion` (Task 11)
- Produces:
  - `renderSections(root): void` — builds all six sections into `#content`
  - `mountBoard(el): void` — semester `<select>` + roster, defaulting to the newest semester
  - `mountMedia(el): void` — click-to-load YouTube facades
  - `mountForms(el): void` — click-to-load Google Form facades
  - Each section element carries `data-section` matching the `section` values in `SCROLL_BEATS`.

- [ ] **Step 1: Write the failing test**

```js
// tests/ui.dom.test.js
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/ui.dom.test.js`
Expected: FAIL — cannot resolve `../src/ui/sections.js`.

- [ ] **Step 3: Write `src/ui/media.js`**

```js
// src/ui/media.js
import { MEDIA } from '../content/index.js';

export function mountMedia(el) {
  const list = document.createElement('div');
  list.className = 'media-list';

  for (const item of MEDIA) {
    const card = document.createElement('article');
    card.dataset.video = item.youtubeId;
    card.className = 'media-card';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-facade';
    button.setAttribute('aria-label', `Play ${item.name}`);
    button.style.backgroundImage = `url(https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg)`;

    const title = document.createElement('h3');
    title.textContent = item.name;

    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1`;
      frame.title = item.name;
      frame.loading = 'lazy';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      button.replaceWith(frame);
    });

    card.append(button, title);
    list.append(card);
  }

  el.append(list);
}
```

- [ ] **Step 4: Write `src/ui/board.js`**

```js
// src/ui/board.js
import { BOARD } from '../content/index.js';

function card(member) {
  const article = document.createElement('article');
  article.dataset.member = member.name;
  article.className = 'board-card';
  if (member.placeholder) article.dataset.placeholder = 'true';

  if (member.image) {
    const img = document.createElement('img');
    img.src = member.image;
    img.alt = `${member.name}, ${member.position}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 800;
    img.height = 800;
    article.append(img);
  }

  const name = document.createElement('h3');
  name.textContent = member.name;
  const position = document.createElement('p');
  position.className = 'board-position';
  position.textContent = member.position;
  const bio = document.createElement('p');
  bio.textContent = member.description;

  article.append(name, position, bio);
  return article;
}

export function mountBoard(el) {
  const semesters = Object.keys(BOARD);

  const select = document.createElement('select');
  select.className = 'semester-select';
  select.setAttribute('aria-label', 'Select semester');
  for (const s of semesters) {
    const option = document.createElement('option');
    option.value = s;
    option.textContent = s;
    select.append(option);
  }
  select.value = semesters[0];

  const list = document.createElement('div');
  list.className = 'board-list';

  const paint = () => {
    list.replaceChildren(...BOARD[select.value].map(card));
  };

  select.addEventListener('change', paint);
  paint();

  el.append(select, list);
}
```

- [ ] **Step 5: Write `src/ui/forms.js`**

```js
// src/ui/forms.js
import { FORMS } from '../content/index.js';

export function mountForms(el) {
  const wrap = document.createElement('div');
  wrap.className = 'form-list';

  for (const form of FORMS) {
    const card = document.createElement('div');
    card.className = 'form-card';
    card.dataset.form = form.title;

    const heading = document.createElement('h3');
    heading.textContent = form.title;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Open ${form.title}`;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = form.url;
      frame.title = form.title;
      frame.loading = 'lazy';
      frame.width = '100%';
      frame.height = '1000';
      button.replaceWith(frame);
    });

    card.append(heading, button);
    wrap.append(card);
  }

  el.append(wrap);
}
```

- [ ] **Step 6: Write `src/ui/sections.js`**

```js
// src/ui/sections.js
import { SITE, ABOUT, EVENTS, CONTACT, SOCIALS } from '../content/index.js';
import { mountBoard } from './board.js';
import { mountMedia } from './media.js';
import { mountForms } from './forms.js';

function section(id, headingText, level = 'h2') {
  const el = document.createElement('section');
  el.dataset.section = id;
  el.className = `section section-${id}`;
  if (headingText) {
    const heading = document.createElement(level);
    heading.textContent = headingText;
    el.append(heading);
  }
  return el;
}

function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

export function renderSections(root) {
  const hero = section('hero', SITE.name, 'h1');
  hero.append(paragraph(SITE.tagline));

  const about = section('about', ABOUT.heading);
  about.append(paragraph(ABOUT.body));

  const events = section('events', EVENTS.heading);
  events.append(paragraph(EVENTS.body));
  mountForms(events);

  const media = section('media', 'MEDIA');
  mountMedia(media);

  const board = section('board', 'BOARD');
  mountBoard(board);

  const contact = section('contact', 'CONTACT US');
  const mail = document.createElement('a');
  mail.href = `mailto:${CONTACT.email}`;
  mail.textContent = CONTACT.email;
  const linktree = document.createElement('a');
  linktree.href = CONTACT.linktree;
  linktree.textContent = 'Linktree';
  linktree.rel = 'noreferrer';
  linktree.target = '_blank';

  const contactLine = document.createElement('p');
  contactLine.append('Reach out to ', mail, ' — also see our ', linktree, '.');
  contact.append(contactLine);

  const socials = document.createElement('nav');
  socials.className = 'socials';
  socials.setAttribute('aria-label', 'Social links');
  for (const s of SOCIALS) {
    const a = document.createElement('a');
    a.href = s.href;
    a.textContent = s.label;
    a.rel = 'noreferrer';
    a.target = '_blank';
    socials.append(a);
  }
  contact.append(socials);

  root.replaceChildren(hero, about, events, media, board, contact);
}
```

- [ ] **Step 7: Run the test and confirm it passes**

Run: `npx vitest run tests/ui.dom.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 8: Wire `src/main.js`**

`supportsWebGL` and `prefersReducedMotion` arrive in Task 11. Implement Task 11 Steps 1–4 first if you are executing strictly in order, or stub them locally and delete the stub when Task 11 lands.

```js
// src/main.js
import { renderSections } from './ui/sections.js';
import { createStage, resolveQualityTier, readSignals } from './diabolo/stage.js';
import { createLifecycle } from './diabolo/lifecycle.js';
import { createChoreography } from './scroll/choreography.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';

export const APP_NAME = 'violet-diabolo';

function boot() {
  const content = document.getElementById('content');
  renderSections(content);

  const stageEl = document.getElementById('stage');
  const canvas = document.getElementById('renderer');

  if (!supportsWebGL()) {
    document.documentElement.dataset.stage = 'unsupported';
    return;
  }

  const tier = resolveQualityTier(readSignals());
  const stage = createStage({ canvas, tier });
  window.addEventListener('resize', stage.resize);

  if (prefersReducedMotion()) {
    document.documentElement.dataset.stage = 'static';
    stage.render(0);
    return;
  }

  document.documentElement.dataset.stage = 'live';
  const choreography = createChoreography({ parts: stage.parts, state: stage.state, stageEl });
  const lifecycle = createLifecycle({ element: stageEl, onFrame: stage.render });

  // Exposed for the Task 12 verification probe.
  window.__vd = { stage, lifecycle, choreography };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
```

- [ ] **Step 9: Commit**

```bash
git add src/ui src/main.js tests/ui.dom.test.js
git commit -m "feat: render content sections with lazy video and form facades"
```

---

### Task 11: Fallbacks and art direction

Two things land together because the design director's pass needs the fallback states styled too.

**Files:**
- Create: `src/fallback/detect.js`, `src/styles/stage.css`, `src/styles/sections.css`
- Modify: `src/styles/base.css`, `index.html`
- Test: `tests/detect.dom.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `supportsWebGL(): boolean`, `prefersReducedMotion(): boolean`

- [ ] **Step 1: Write the failing test**

```js
// tests/detect.dom.test.js
import { describe, it, expect, vi } from 'vitest';
import { supportsWebGL, prefersReducedMotion } from '../src/fallback/detect.js';

describe('detect', () => {
  it('reports no WebGL when context creation returns null', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(supportsWebGL()).toBe(false);
    vi.restoreAllMocks();
  });

  it('reports no WebGL when context creation throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('blocked'); });
    expect(supportsWebGL()).toBe(false);
    vi.restoreAllMocks();
  });

  it('reads the reduced-motion media query', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('treats a missing matchMedia as no preference rather than crashing', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/detect.dom.test.js`
Expected: FAIL — cannot resolve `../src/fallback/detect.js`.

- [ ] **Step 3: Write the detector**

```js
// src/fallback/detect.js

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/detect.dom.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Invoke the design director**

**REQUIRED SUB-SKILL:** invoke the `frontend-design` skill now and let it own the visual thesis, typography, palette, spacing and final critique. This plan deliberately does not specify them — a second director produces incoherent work.

Give the director these architectural constraints, which are not negotiable:
- One saturated element (the diabolo) against a near-black stage.
- NYU violet as the palette anchor; the reference photo's cyan gasket is the only accent.
- Technical-diagram annotation language — thin strokes, monospace labels — connecting the 3D spine to the content column.
- The content column must stay legible over the canvas at every breakpoint.
- `[data-stage="unsupported"]` presents a styled static diabolo, not an empty box.
- `[data-stage="static"]` (reduced motion) looks deliberate, not broken.

- [ ] **Step 6: Commit**

```bash
git add src/fallback src/styles index.html tests/detect.dom.test.js
git commit -m "feat: add WebGL and reduced-motion fallbacks with art direction"
```

---

### Task 12: Real-condition verification

The skill's second non-negotiable. Nothing here may be verified by proxy.

- "Pauses when scrolled away" is verified by **actually scrolling it away**.
- "Pauses when hidden" is verified by **actually backgrounding the tab**, never by dispatching `visibilitychange`.
- A global rAF wrapper **discovers** activity; it does not deliver the verdict. Attribute every surviving callback to a named source before concluding anything.
- If the environment cannot produce a condition, say so and label the stand-in synthetic. Report only mitigations actually observed working.

**Files:**
- Create: `scripts/verify-lifecycle.md` (probe script + recorded results), `README.md`

- [ ] **Step 1: Build and serve**

```bash
npm run build && npx vite preview --port 4173
```

- [ ] **Step 2: Install the attribution probe**

Paste into the page console **before** scrolling. It wraps rAF to record which source scheduled each frame, so a nonzero global count can be explained rather than guessed at.

```js
window.__probe = { bySource: new Map(), total: 0 };
const rawRAF = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (cb) => {
  const source = (new Error().stack || '').split('\n')[2]?.trim() ?? 'unknown';
  return rawRAF((t) => {
    window.__probe.total += 1;
    window.__probe.bySource.set(source, (window.__probe.bySource.get(source) ?? 0) + 1);
    cb(t);
  });
};
window.__snapshot = () => ({
  totalFrames: window.__probe.total,
  vdFrames: window.__vd.lifecycle.frameCount(),
  vdRunning: window.__vd.lifecycle.isRunning(),
  bySource: [...window.__probe.bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
});
```

- [ ] **Step 3: Verify the scrolled-away condition — really scroll**

1. `window.__snapshot()` at the hero; note `vdFrames`.
2. Scroll to the very bottom so `#stage` is genuinely out of the viewport. Do not fake it.
3. Wait 3 seconds, then `window.__snapshot()` again.

Expected: `vdRunning === false`, and `vdFrames` **identical** across the two readings.
`totalFrames` may still climb — that is unrelated visible animation and must be **attributed** via `bySource`, not hand-waved. Record the actual numbers.

- [ ] **Step 4: Verify the hidden-document condition — really background the tab**

1. Scroll back so the stage is onscreen; confirm `vdRunning === true`.
2. Switch to a different application or browser tab for 5 seconds. Do not dispatch the event.
3. Return and run `window.__snapshot()`.

Expected: `vdFrames` grew by at most a couple of frames across the switch, not ~300.

If the harness cannot truly background the tab, **say so explicitly**, label the stand-in synthetic, and report the condition as unverified rather than as passing.

- [ ] **Step 5: Confirm anime.js's engine idles on its own**

```js
import('animejs').then(({ engine }) =>
  console.log({ paused: engine.paused, reqId: engine.reqId, pauseOnDocumentHidden: engine.pauseOnDocumentHidden }));
```

Measured in Node during planning: `paused: true`, `reqId: 0` at rest, `pauseOnDocumentHidden: true`. **Re-confirm in the browser** — Node was not the real condition. This is what justifies never touching the shared ticker.

- [ ] **Step 6: Verify the fallbacks**

- Disable WebGL (a `--disable-3d-apis` browser profile, or `chrome://flags`). Reload. Confirm `data-stage="unsupported"`, a styled static diabolo, and every section readable.
- Enable OS reduced-motion. Reload. Confirm `data-stage="static"` and no scrubbing.

- [ ] **Step 7: Verify responsiveness and content**

- 375 / 768 / 1440 px: no horizontal body scroll; the stage never obscures text.
- Every outbound link and both form URLs resolve.
- Record `du -sh dist` and the largest file in `dist/images`.

- [ ] **Step 8: Record results and commit**

Write `scripts/verify-lifecycle.md` with the **actual observed numbers** from every step, including anything that could not be verified and why. Do not write a result you did not observe.

```bash
git add scripts/verify-lifecycle.md README.md
git commit -m "test: record real-condition lifecycle verification"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §2 Register decision | Plan header + Task 11 constraints; no code artifact |
| §3 Adopt-vs-build | Settled at design time; Task 4 builds custom as decided |
| §4.1 Stack | Task 1 |
| §4.2 Transform ownership | Tasks 6, 7, 9, with tests asserting the split |
| §4.3 Procedural geometry | Task 4 |
| §4.4 Materials and IBL | Task 5 |
| §4.4 Quality tiers | Task 7 |
| §5 Scroll choreography | Task 9 |
| §6.1 Pausing | Task 8 |
| §6.2 Shared-ticker trap | Task 8 constraint + Task 12 Step 5 |
| §6.3 Real-condition verification | Task 12 |
| §7 Fallbacks | Task 11 |
| §7 First paint / no layout shift | Task 1 (static HTML + CSS-reserved stage box) |
| §8 Content inventory | Task 2 |
| §8.1 Content judgment calls | Task 2 (`OPEN_SLOT`), Task 10 (facades) |
| §8.2 Asset pipeline | Task 3 |
| §9 Design direction | Task 11 Step 5 — delegated to `frontend-design` |
| §10 Module boundaries | File Structure table; enforced per task |
| §11 Verification plan | Task 12 |

No spec requirement is left without a task.

**Placeholder scan:** no TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries complete code.

**Type consistency:** `PART_IDS`, `DIMS`, `HOME`, `parts`, `state.spinRate`, `createLifecycle`, `createStage`, `createChoreography`, `resolveQualityTier`, `readSignals`, `TIER_SETTINGS`, `SCROLL_BEATS`, `supportsWebGL`, `prefersReducedMotion`, `renderSections`, `mountBoard`, `mountMedia`, `mountForms` are spelled identically at every definition and use site. `HOME` is defined in `build.js` (Task 6) and imported by `choreography.js` (Task 9).

**Known ordering note:** Task 10 Step 8 imports `src/fallback/detect.js`, which Task 11 creates. Executing 11 before 10's final step, or stubbing briefly, is called out inline in Task 10 Step 8.

**Verified during planning rather than assumed:**
- `animejs@4.5.0` exports `createTimeline`, `onScroll`, `engine`; `ScrollObserverParams` accepts `sync/container/target/axis/enter/leave/repeat/debug/onUpdate`.
- `engine.pauseOnDocumentHidden === true`; `engine.paused === true` and `engine.reqId === 0` at rest.
- `three@0.186.0` ships `LatheGeometry`, `RoomEnvironment`, and `MeshPhysicalMaterial.transmission`.
- Task 4, 6 and 8 code was extracted from this plan and executed: **33 tests pass** (10 profiles, 10 build, 13 lifecycle).
- `sharp` converts the 11.3 MB master to **147 KB AVIF** at 1600 px in under a second.
