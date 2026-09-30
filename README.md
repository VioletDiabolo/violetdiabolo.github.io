# Violet Diabolo

Rebuilt website for Violet Diabolo, NYU's diabolo (Chinese yo-yo) performance team. Four pages — Home, About us, Media and Join us — over one animated WebGL gradient: a near-black field with two or three bright violet ribbons drifting through it, fixed behind glass panels that scroll over it. Replaces the React site at github.com/violetdiabolo/violetdiabolo.github.io; deploys to GitHub Pages.

The branch that produced this shape (`build/gradient-panels`) replaced a Three.js diabolo scrubbed by an anime.js scroll timeline. Both libraries are gone, and so is every module that used them: the bundle went from **600,476 B to 38,565 B**, −93.6 %.

## Quick start

```bash
npm install
npm run dev          # Dev server on localhost:5173
npm run build        # Production build (runs `npm run assets` first)
npm run preview      # Serve the built dist/ locally
npm test             # 286 tests across 18 test files
```

`npm run build` regenerates optimized images from masters via `npm run assets` before bundling.

## Deploying to GitHub Pages

`npm run build` produces `dist/`, which is what GitHub Pages serves. The `base: './'` setting in `vite.config.js` makes the site work from a project subpath (necessary for GitHub project sites).

To deploy:
1. Run `npm run build`
2. Publish `dist/` to the `gh-pages` branch, or point your repo's Pages settings at it

Note that `dist/` is listed in `.gitignore`, so it is not committed on this branch — publishing it means `git add -f dist` on the deploy branch, or a Pages workflow that builds and uploads the directory itself.

## Project layout

| Path | Purpose |
|---|---|
| `src/content/index.js` | Club identity, board members, events, videos, forms, socials, photos. No markup. Mutations here flow everywhere. |
| `src/ui/` | DOM rendering: the fixed nav and the four pages' addresses (`nav.js`), the four pages and the footer (`sections.js`), board cards (`board.js`), video facades in alternating blocks (`media.js`), form facades (`forms.js`), social icons (`icons.js`), responsive `<picture>` (`picture.js`), scroll reveal (`reveal.js`). No WebGL. |
| `src/gradient/` | `palette.js` (three stops), `shader.js` (the GLSL), `gradient.js` (the WebGL state), `contrast.js` (contrast arithmetic — **test and probe only, never bundled**). |
| `src/render/` | `lifecycle.js` (when the loop may run), `budget.js` (`TARGET_FPS`, `RENDER_SCALE`, the frame cap). |
| `src/scroll/smooth.js` | Lenis inertia scrolling, and the source of the gradient's scroll boost. |
| `src/fallback/detect.js` | Feature detection: `supportsWebGL()`, `prefersReducedMotion()`. |
| `src/styles/` | `base.css` (tokens, reset, typography, nav, focus, scroll reveal), `sections.css` (the four panel patterns, the glass surface, the footer). Two files, no third. |
| `index.html`, `about.html`, `media.html`, `join.html` | The four page shells — identical but for the title, the description and `<body data-page>`, which is all `main.js` renders from. |
| `src/main.js` | `boot()`: render the page `data-page` names, mount the nav and the footer, mount the reveal, then branch on WebGL and reduced motion. |
| `scripts/build-assets.mjs` | Image pipeline (resize, AVIF/WebP/JPEG). |
| `scripts/check-shader.html` | Dev-time shader bench: compile, frame cost with a zero-render control, luminance histogram. |
| `scripts/check-contrast.html` | Dev-time contrast probe over a real page (`?page=index`, `about`, `media` or `join`). Needs `npm run dev` — it imports `contrast.js`, which the build excludes. |
| `scripts/bench-verdict.mjs` | The pass/fail decision the shader bench calls, as a module so the suite can falsify it. |
| `tests/` | 286 tests across 18 files — see **Testing**. |
| `public/images/` | Generated derivatives (`npm run assets`). Masters live in `assets-src/`. |
| `docs/VERIFICATION.md` | What was measured in a real browser, on a named GPU, and what could not be. |

**Module boundaries (conventions):**
- `src/content/*` holds no markup (literals only).
- `src/ui/*` holds no WebGL.
- `src/gradient/*` and `src/render/*` hold no club copy.

**Boundaries actually enforced by tests:**
- **`src/ui/*` never hardcodes club copy.** `tests/ui.dom.test.js` ("content boundary") greps the code of every file in `src/ui/` — comments excluded, since they quote the client to explain a decision — for the site name, tagline, contact email, the About copy, the schedule's places and notes, the page headings and leads, the home previews' links, and every media title, and fails if one is baked in rather than imported from `src/content/`. This is what guarantees content edits need no code changes.
- **No animation engine, anywhere.** `tests/lifecycle.test.js` ("no animation engine") walks every file under `src/` and fails on any `animejs` import, with **no exception set** — there is no longer an owner to except. A second test fails if `package.json` declares `animejs` or `three` again.
- **`contrast.js` never ships.** `tests/visual-language.test.js` asserts `src/main.js` does not import `gradient/contrast`.
- **Nothing resolves to `position: sticky`.** See **The page** below.
- **`backdrop-filter` appears on exactly one selector.** `tests/visual-language.test.js` fails any rule that blurs without being glass (or the nav bar).
- **The four pages agree with each other.** `tests/pages.test.js` holds the nav's `PAGES`, the build's inputs, the renderers and each file's `data-page` to one list, and the four `<head>`s to one copy.
- **Nothing is built that no page shows.** `tests/assets.test.js` checks content against the pipeline in both directions, and fails on a master nothing reads or a derivative nothing builds.

## The pages: four pages over one gradient

Every section is a self-contained **panel**, described by two attributes rather than a place in a scroll choreography. `src/ui/sections.js` stamps both:

```
<section data-panel="…" data-surface="…">  <div class="room">
                                              <div class="room-head">  reading text
                                              <div class="room-body">  everything else
```

`data-panel` is the **layout**; `data-surface` is the **material**. `src/styles/sections.css` holds the five arrangements, and there is one material: glass, which lets the gradient through. Every page opens on a panel with no surface at all, on the gradient itself, and plates everything after it in glass (`tests/panels.dom.test.js`).

| page | section | `data-panel` | `data-surface` | what it holds |
|---|---|---|---|---|
| Home | `#hero` | `hero` | *(none)* | the wordmark bottom-left, a photograph bottom-right, and the performed-for marquee — its own glass band — across the foot of both, on the first screen |
| | `#about` | `teaser` | `glass` | a simplified About us: the club's story, and "Meet the board →" |
| | `#media` | `teaser` | `glass` | a simplified Media: the three newest videos, one large and two beside it, and "See all videos →" |
| | `#join` | `feature` | `glass` | a simplified Join us: the practice schedule as bullets (times bold, places highlighted) and a "How to join" button; a photograph on the right |
| About us | `#about` | `header` | *(none)* | label, heading and the club's own account of itself, centred |
| | `#board` | `plate` | `glass` | the board, four across — photograph, name and position, no bios — with the semester select beside its heading and a dashed "+" card that links to Join us |
| Media | `#media` | `header` | *(none)* | heading and lead, centred |
| | `#videos` | `plate` | `glass` | the ten videos in two blocks of five: a large one and four small, the large one left in the first block and right in the second |
| Join us | `#join` | `header` | *(none)* | label, heading and lead, centred |
| | `#practices` | `plate` | `glass` | the same schedule the home page shows, from the same data |
| | `#get-involved` | `plate` | `glass` | the Interest Form, the Discord and the Performance / Teaching Request, a card each |

**The footer** is on every page: the socials (Instagram, YouTube, NYU Engage, Discord), the address and the Linktree, and the sign-off under a hairline that runs the full width. It is a real `<footer>`, mounted after `<main>` by `main.js`, so it is the page's `contentinfo` landmark — and glass, because its links are `--accent`, which measures 2.06:1 on the gradient's brightest pixel.

Panels are full-bleed and separated by `--panel-gap` (`clamp(3.5rem, 11vh, 8rem)`), where nothing but the gradient shows. That alternation — plate, light, plate — is the file's only structural device, and on the sub-pages it is the layout. There is no grid overlay and no plate behind the text that opens a page: the gradient's own luminance ceiling keeps `--ink` legible directly on it.

**Nothing on any page sticks to the viewport.** `tests/sections-layout.dom.test.js` renders every page — its panels plus the real nav and footer, as `main.js` assembles them — and resolves the winning `position` declaration with the real selector engine plus explicit specificity arithmetic, for every element, at phone width. A source grep could not answer this safely in either direction. Because that scan is purely negative, a second test asserts `.site-nav` still resolves to `position: fixed` through the same call: without it, a stylesheet rename or a nesting syntax the brace scanner mishandled would empty the candidate set and report green over a page full of sticky.

## How the gradient works

`src/gradient/shader.js` is Ashima's 2D simplex noise, then domain warping, then three soft ribbons combined with `max()` rather than summed. The warping is what turns straight bands into swirls: a low-frequency noise displaces the coordinate the ribbon function reads.

Three stops, dark to light (`src/gradient/palette.js`):

| stop | rgb | WCAG relative luminance |
|---|---|---|
| `deep` | `rgb(8, 6, 13)` | 0.0021 |
| `mid` | `rgb(82, 30, 158)` | 0.0519 |
| `bright` | `rgb(128, 36, 255)` | **0.1307** |

**`bright` is an arithmetic ceiling, not a sampled maximum.** Every colour the shader can emit is a component-wise mix along `deep → mid → bright`, and each stop is component-wise greater than the one below it. So `--ink` (`#f5f2fa`) measures **5.25:1** against the brightest pixel the gradient can *ever* draw. That single fact is the page's whole contrast strategy: body text sits on the bare gradient at AA with margin, and the hero needs no plate, no scrim and no vignette. Retuning the palette means re-deriving every composite in `base.css`.

Measured over twelve time steps at 1440×900, **at least 85.43 % of pixels sit below relative luminance 0.02 in every step** (worst step 5; best 93.24 %), and the median pixel is exactly `deep`. That is the per-step minimum, not the pooled 89.17 % — pooling is exactly what would hide a single bright frame.

**Scrolling accelerates the drift; it does not offset it.** `gradient.js` advances `u_time` at `RESTING_RATE` (3 units/second) multiplied by `1 + boost`, where `boost` is Lenis's reported speed mapped onto `MAX_BOOST` — smoothed toward its target, and decayed away once Lenis stops reporting. The multiplier is never below 1, so the clock only ever moves forward and faster.

There is no velocity uniform. The version this replaces had one, added to the time term (`t = u_time + u_velocity`, clamped to ±4), and it could not work: real scroll velocities are 2–273 px/frame, so the clamp saturated instantly. The picture jumped four seconds forward, froze there for the length of the scroll, and snapped *backwards* on release. Measured as pixel path length over one second: rest 30.9, gentle scroll 35.7, brisk 71.5, fling 85.3.

The shader's warp coefficients (0.055, 0.031) are the **ratio** between its two octaves, not speeds — `RESTING_RATE` is the pace they share.

### What it is allowed to cost

`src/render/budget.js` holds both numbers, and both exist because the background must not lag:

- **`TARGET_FPS = 30`.** The gradient drifts; 30 reads identically to 60 and halves the frames drawn.
- **`RENDER_SCALE = 0.5`.** Fragment work scales with pixel count, so half the linear resolution is a quarter of the work. Clamped at 1× so a non-retina screen still gets one framebuffer pixel per CSS pixel.

`src/render/lifecycle.js` owns *whether the loop runs at all*: only while the observed element intersects the viewport **and** the document is visible. When either fails the pending frame is cancelled outright — a no-op frame that still gets scheduled is not a pause. See **Known limitations 2** for which of those two gates actually fires in production.

`src/main.js`'s `onFrame` is where the three meet, and the ordering is deliberate: **Lenis is stepped every frame, ahead of the cap**, because the cap throttles only the gradient's draw and stepping the scroller at 30 Hz would make the inertia stutter. `tests/main.dom.test.js` ("the animated onFrame composition") drives the real loop in jsdom and pins all three limbs — that draws happen, that the cap both delays and then releases them, that `render()` receives the accumulated elapsed rather than a single frame delta, and that Lenis is stepped on frames that draw nothing.

Measured GPU cost of the shader's own draw, with a zero-render control: **0.01253 ms/frame** against a 4 ms budget. That figure is the shader in a bare canvas and is **not** the background's total per-frame cost — every glass panel puts a `backdrop-filter` over a canvas that repaints every frame. `docs/VERIFICATION.md` §3.1 measures that separately.

## Fallback paths

Both are decided in `boot()` (`src/main.js`), and neither is a degraded version of the other.

- **`prefers-reduced-motion: reduce`** → one frame is rendered and **nothing is installed**: no lifecycle, no Lenis, no rAF, no scroll listeners, and `window.__vd` is never assigned. A resize re-fits *and* repaints, because `gradient.resize()` reassigns `canvas.width/height` and clears the drawing buffer — with no loop running, a bare re-fit would leave the canvas permanently transparent after the first orientation change.
- **No WebGL** → `data-stage="unsupported"`, and a CSS `linear-gradient` of the same three stops is painted on `#gradient` instead. Every panel still renders.

Content is never gated behind the graphics: the page's renderer, `buildNav` and the footer run *before* `supportsWebGL()` is called at all, and `tests/main.dom.test.js` asserts that ordering rather than just the outcome.

**The scroll reveal fails open.** `src/ui/reveal.js` fades each panel in once via `IntersectionObserver`. The class that hides it (`.reveal-pending`, `opacity: 0`, in `base.css`) is added *synchronously by JS*, and only an observer callback ever removes it — so where the constructor does not exist, the class would hide every panel with nothing left to reveal them. `initReveal` therefore checks for `IntersectionObserver` **before** adding the class, and the guard is narrow enough that an injected observer still runs.

## Editing content

Everything lives in `src/content/index.js`:

- **Add a board member:** append to `BOARD` (a name, a position, and an image base name or `null`), creating a semester entry if needed. There are no bios for now; the card has no line for one.
- **Change the home page's previews:** `HOME_SECTIONS` (each heading and its link's label). The About preview reads `ABOUT.body`; the Media preview shows the first `MEDIA_PREVIEW` videos (`src/ui/media.js`).
- **Add a video:** append to `MEDIA` with a YouTube ID.
- **Change practice times:** edit `EVENTS.sessions` (day, time, the words before the place, the place) and `EVENTS.notes`. Both the home page's Join us section and the Join us page read them.
- **Change a page's heading or lead:** `PAGE_COPY`.
- **Add social links:** extend `SOCIALS`; they appear in every page's footer.
- **Add a form:** extend `FORMS` with an `id`, and give it a card in `renderJoinPage`.

**⚠️ Apostrophe warning:** the copy is reproduced verbatim from the club's old site, including a deliberate mix of curly (`U+2019`) and ASCII (`U+0027`) apostrophes. `tests/content.test.js` pins this exact mix. "Fixing" the apostrophes will fail it. Do not normalize them.

## Images

Masters live in `assets-src/`; derivatives (AVIF and WebP, at two widths each) are generated into `public/images/` by `npm run assets`. Every target has to be one content asks for — `public/images/` ships to `dist/` whole, so a picture no page shows is weight every deploy carries.

**No derivative may exceed 400 KB.** The pipeline exits non-zero if one does. The current worst is `hero-group-1600.webp` at **276 KB**, from 88 generated files.

Widths cap at 2000 px, not 2400. Measured on the 4032×3024 master: at 2400 the intended quality yields WebP 406 KB and JPEG 531 KB, both over budget, while 2000 yields AVIF 240 / WebP 307 / JPEG 387. Capping width preserves quality; dropping quality to fit 2400 would not.

## Testing

```bash
npm test
```

**286 tests across 18 files**, all passing, with no stderr noise.

| file | tests | covers |
|---|---|---|
| `visual-language.test.js` | 57 | the deleted design elements' absence, the five panel patterns, glass and accent discipline, the focus ring on every ground, the luminance ceiling, the shader's two fixed defects, the bench and probe wiring, the nav pill row and height, 200 % text zoom |
| `ui.dom.test.js` | 55 | each page's sections and h1, the home page's previews and their order, the footer, board cards (name and position only) and the join tile, the alternating video blocks, the form facades and the Join us cards, the practice schedule, the marquee's place on the first screen, the photographs, and the content boundary |
| `main.dom.test.js` | 23 | boot ordering, which page boots, the footer's mount, both fallback paths, the gradient mount, and the animated `onFrame` composition |
| `lifecycle.test.js` | 17 | pause/resume on visibility and intersection, delta clamping, teardown; the no-animation-engine and no-`animejs`-dependency guards |
| `content.test.js` | 18 | apostrophe preservation, board structure and the absence of bios, the home previews, the practice schedule, the sub-page copy, media list, photograph alt text, contact details and socials |
| `contrast.test.js` | 15 | `relativeLuminance`, `contrastRatio`, `worstCase` (including its non-finite guard), `TIME_STEPS` |
| `gradient.dom.test.js` | 15 | shader compile/link, uniform plumbing, scroll acceleration (rate, direction, cap, decay, monotonicity), failure cleanup, resize |
| `nav.dom.test.js` | 14 | the page buttons, the CTA, `aria-current`, every link resolving on every page, and `--nav-offset`'s `ResizeObserver` |
| `smooth.dom.test.js` | 14 | Lenis construction, anchor interception, modifier-click opt-out, teardown, and installing nothing under reduced motion |
| `assets.test.js` | 12 | the image pipeline in both directions against content, orphaned masters and derivatives, EXIF orientation, each derivative's width against its own srcset descriptor, and the 400 KB budget |
| `sections-layout.dom.test.js` | 11 | the plate's title size, the hero wordmark's size cap and its container on a phone, that nothing on any page resolves to sticky, that the scan proving it is not blind, and that the contrast probe's block list covers every element that paints text on every page |
| `budget.test.js` | 9 | the frame cap's accumulation and `renderSize`'s clamp |
| `reveal.dom.test.js` | 9 | the reveal's pending/visible classes, one-shot unobserve, reduced motion, and the no-`IntersectionObserver` guard |
| `palette.test.js` | 5 | three stops, ordering, range, and that it is violet rather than blue |
| `detect.dom.test.js` | 4 | WebGL and reduced-motion detection |
| `panels.dom.test.js` | 4 | `data-panel` / `data-surface` on every page: bare gradient first, glass after |
| `pages.test.js` | 3 | the four page files, the nav, the renderers and the build inputs agreeing |
| `smoke.test.js` | 1 | module load |

## Known limitations

From **§10 of [`docs/VERIFICATION.md`](docs/VERIFICATION.md)**, which lists eleven. The ones worth knowing before you change anything:

1. **Live scroll input is not verified end to end.** The verification host delivers no `requestAnimationFrame` of its own, so Lenis was stepped by hand with real timestamps and anchor activation was synthesized. Wheel and touch inertia, and the scroll boost under real input, rest on `tests/smooth.dom.test.js` and `tests/gradient.dom.test.js` alone. The sustained frame rate and the 30 fps cap in a live visible tab are likewise unmeasured — the *frame cost* is a real GPU timer query; the *achieved* rate is not.

2. **The `IntersectionObserver` pause is unreachable by design, not merely unverified.** `createLifecycle` gates the loop on intersection **and** visibility, but `main.js` observes `#gradient`, which is `position: fixed; inset: 0` — it covers the viewport at every scroll position and can never stop intersecting. The observer reports `isIntersecting: true` at first delivery and never flips. **`document.hidden` is the only gate that fires live**; the observer half is defensive depth, exercised only through an injected observer in tests. (The previous version of this page made the identical argument about a `position: sticky` stage. The stage is gone, the stickiness is gone, and the conclusion survived both.)

3. **Nothing rests on a screenshot.** The host's screenshot pipeline returns stale frames, so every visual claim in `VERIFICATION.md` is established by `getComputedStyle`, `getBoundingClientRect`, `Range` and `gl.readPixels` instead.

4. **`backdrop-filter`'s cost on a mid-range phone.** Glass panels — up to a screen of them at once on the sub-pages — sit over a canvas that repaints every frame, so the blur cannot be cached. On the measured host the shipped configuration has **at least 33× headroom** and is indistinguishable from `backdrop-filter: none` — but both conditions are pinned at a 60 Hz vsync ceiling there, so the cost is bounded above rather than resolved, and the machine the concern is about was not measured.

5. **Real devices, other browsers, other GPUs.** Chromium on ANGLE / Metal / Apple M4 only. 320 / 375 / 768 were viewport emulation, not real touch devices. Glyph rendering and font fallback were not inspected.

Full details and measurements in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
