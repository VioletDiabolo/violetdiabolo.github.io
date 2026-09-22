# Violet Diabolo

Rebuilt website for Violet Diabolo, NYU's diabolo (Chinese yo-yo) performance team. A single page: an animated WebGL gradient — a near-black field with two or three bright violet ribbons drifting through it — fixed behind six content panels that scroll over it. Replaces the React site at github.com/violetdiabolo/violetdiabolo.github.io; deploys to GitHub Pages.

The branch that produced this shape (`build/gradient-panels`) replaced a Three.js diabolo scrubbed by an anime.js scroll timeline. Both libraries are gone, and so is every module that used them: the bundle went from **600,476 B to 38,565 B**, −93.6 %.

## Quick start

```bash
npm install
npm run dev          # Dev server on localhost:5173
npm run build        # Production build (runs `npm run assets` first)
npm run preview      # Serve the built dist/ locally
npm test             # 216 tests across 17 test files
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
| `src/ui/` | DOM rendering: the fixed nav (`nav.js`), the six panels (`sections.js`), board cards (`board.js`), video facades (`media.js`), form facades (`forms.js`), responsive `<picture>` (`picture.js`), scroll reveal (`reveal.js`). No WebGL. |
| `src/gradient/` | `palette.js` (three stops), `shader.js` (the GLSL), `gradient.js` (the WebGL state), `contrast.js` (contrast arithmetic — **test and probe only, never bundled**). |
| `src/render/` | `lifecycle.js` (when the loop may run), `budget.js` (`TARGET_FPS`, `RENDER_SCALE`, the frame cap). |
| `src/scroll/smooth.js` | Lenis inertia scrolling, and the source of the gradient's velocity uniform. |
| `src/fallback/detect.js` | Feature detection: `supportsWebGL()`, `prefersReducedMotion()`. |
| `src/styles/` | `base.css` (tokens, reset, typography, nav, focus, scroll reveal), `sections.css` (the four panel patterns and the two surfaces). Two files, no third. |
| `src/main.js` | `boot()`: render content, mount the nav, mount the reveal, then branch on WebGL and reduced motion. |
| `scripts/build-assets.mjs` | Image pipeline (resize, AVIF/WebP/JPEG). |
| `scripts/check-shader.html` | Dev-time shader bench: compile, frame cost with a zero-render control, luminance histogram. |
| `scripts/check-contrast.html` | Dev-time contrast probe over the real page. Needs `npm run dev` — it imports `contrast.js`, which the build excludes. |
| `scripts/bench-verdict.mjs` | The pass/fail decision the shader bench calls, as a module so the suite can falsify it. |
| `tests/` | 216 tests across 17 files — see **Testing**. |
| `public/images/` | Generated derivatives (`npm run assets`). Masters live in `assets-src/`. |
| `docs/VERIFICATION.md` | What was measured in a real browser, on a named GPU, and what could not be. |

**Module boundaries (conventions):**
- `src/content/*` holds no markup (literals only).
- `src/ui/*` holds no WebGL.
- `src/gradient/*` and `src/render/*` hold no club copy.

**Boundaries actually enforced by tests:**
- **`src/ui/*` never hardcodes club copy.** `tests/ui.dom.test.js` ("content boundary") greps every file in `src/ui/` for the site name, tagline, contact email, the first 60 characters of the About and Events body, and every media title, and fails if one is baked in rather than imported from `src/content/`. This is what guarantees content edits need no code changes.
- **No animation engine, anywhere.** `tests/lifecycle.test.js` ("no animation engine") walks every file under `src/` and fails on any `animejs` import, with **no exception set** — there is no longer an owner to except. A second test fails if `package.json` declares `animejs` or `three` again.
- **`contrast.js` never ships.** `tests/visual-language.test.js` asserts `src/main.js` does not import `gradient/contrast`.
- **Nothing resolves to `position: sticky`.** See **The page** below.
- **`backdrop-filter` appears on exactly one selector.** `tests/visual-language.test.js` fails any rule that blurs without being glass.

## The page: six panels over one gradient

Every section is a self-contained **panel**, described by two attributes rather than a place in a scroll choreography. `src/ui/sections.js` stamps both:

```
<section data-panel="…" data-surface="…">  <div class="room">
                                              <div class="room-head">  reading text
                                              <div class="room-body">  everything else
```

`data-panel` is the **layout**; `data-surface` is the **material** — whether the gradient shows through. `src/styles/sections.css` holds the four arrangements:

| section | `data-panel` | `data-surface` | composition |
|---|---|---|---|
| `#hero` | `hero` | *(none)* | full-bleed. Head bottom-left, teaser card bottom-right. The gradient itself is the hero, so there is nothing to plate it against. |
| `#about` | `story` | `glass` | violet-tinted glass. Serif, the club's own account of itself, and a photo. |
| `#events` | `feature` | `glass` | title across the top, practice details dropped bottom-right. |
| `#media` | `grid` | `solid` | video facades beside a title column. |
| `#board` | `grid` | `solid` | roster cards beside a title column. |
| `#contact` | `grid` | `solid` | address, socials and a photograph. |
| `footer` | *(none)* | *(none)* | one line, released back to bare gradient. |

Three solid to two glass, deliberately — a page where most sections are translucent reads as one continuous wash rather than as panels. The reasoning per entry is at the top of `sections.css`.

Panels are full-bleed and separated by `--panel-gap` (`clamp(3rem, 9vh, 7rem)`), where nothing but the gradient shows. That alternation — plate, light, plate — is the file's only structural device. There is no grid overlay, no hairline rule, and no plate behind running text: the gradient's own luminance ceiling keeps `--ink` legible directly on it.

**Nothing on this page sticks to the viewport.** `tests/sections-layout.dom.test.js` renders the real page — every panel plus the real nav, as `main.js` assembles them — and resolves the winning `position` declaration with the real selector engine plus explicit specificity arithmetic, for every element, at phone width. A source grep could not answer this safely in either direction. Because that scan is purely negative, a second test asserts `.site-nav` still resolves to `position: fixed` through the same call: without it, a stylesheet rename or a nesting syntax the brace scanner mishandled would empty the candidate set and report green over a page full of sticky.

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

`u_velocity` is *added* to the time term rather than multiplied into it, so a fast scroll pushes the animation forward instead of changing its speed permanently. Lenis supplies it (`src/scroll/smooth.js`), clamped to `MAX_VELOCITY`.

### What it is allowed to cost

`src/render/budget.js` holds both numbers, and both exist because the background must not lag:

- **`TARGET_FPS = 30`.** The gradient drifts; 30 reads identically to 60 and halves the frames drawn.
- **`RENDER_SCALE = 0.5`.** Fragment work scales with pixel count, so half the linear resolution is a quarter of the work. Clamped at 1× so a non-retina screen still gets one framebuffer pixel per CSS pixel.

`src/render/lifecycle.js` owns *whether the loop runs at all*: only while the observed element intersects the viewport **and** the document is visible. When either fails the pending frame is cancelled outright — a no-op frame that still gets scheduled is not a pause. See **Known limitations 2** for which of those two gates actually fires in production.

`src/main.js`'s `onFrame` is where the three meet, and the ordering is deliberate: **Lenis is stepped every frame, ahead of the cap**, because the cap throttles only the gradient's draw and stepping the scroller at 30 Hz would make the inertia stutter. `tests/main.dom.test.js` ("the animated onFrame composition") drives the real loop in jsdom and pins all three limbs — that draws happen, that the cap both delays and then releases them, that `render()` receives the accumulated elapsed rather than a single frame delta, and that Lenis is stepped on frames that draw nothing.

Measured GPU cost of the shader's own draw, with a zero-render control: **0.01253 ms/frame** against a 4 ms budget. That figure is the shader in a bare canvas and is **not** the background's total per-frame cost — the two glass panels put a full-viewport `backdrop-filter` over a canvas that repaints every frame. `docs/VERIFICATION.md` §3.1 measures that separately.

## Fallback paths

Both are decided in `boot()` (`src/main.js`), and neither is a degraded version of the other.

- **`prefers-reduced-motion: reduce`** → one frame is rendered and **nothing is installed**: no lifecycle, no Lenis, no rAF, no scroll listeners, and `window.__vd` is never assigned. A resize re-fits *and* repaints, because `gradient.resize()` reassigns `canvas.width/height` and clears the drawing buffer — with no loop running, a bare re-fit would leave the canvas permanently transparent after the first orientation change.
- **No WebGL** → `data-stage="unsupported"`, and a CSS `linear-gradient` of the same three stops is painted on `#gradient` instead. Every panel still renders.

Content is never gated behind the graphics: `renderSections` and `buildNav` run *before* `supportsWebGL()` is called at all, and `tests/main.dom.test.js` asserts that ordering rather than just the outcome.

**The scroll reveal fails open.** `src/ui/reveal.js` fades each panel in once via `IntersectionObserver`. The class that hides it (`.reveal-pending`, `opacity: 0`, in `base.css`) is added *synchronously by JS*, and only an observer callback ever removes it — so where the constructor does not exist, the class would hide all six panels with nothing left to reveal them. `initReveal` therefore checks for `IntersectionObserver` **before** adding the class, and the guard is narrow enough that an injected observer still runs.

## Editing content

Everything lives in `src/content/index.js`:

- **Add a board member:** append to `BOARD`, creating a semester entry if needed.
- **Add a video:** append to `MEDIA` with a YouTube ID.
- **Change practice times:** edit `EVENTS.body`.
- **Add social links:** extend `SOCIALS`.
- **Add a form:** extend `FORMS`.

**⚠️ Apostrophe warning:** the copy is reproduced verbatim from the club's old site, including a deliberate mix of curly (`U+2019`) and ASCII (`U+0027`) apostrophes. `tests/content.test.js` pins this exact mix. "Fixing" the apostrophes will fail it. Do not normalize them.

## Images

Masters live in `assets-src/`; derivatives (AVIF, WebP and — for the two large photos only — JPEG, at several widths) are generated into `public/images/` by `npm run assets`.

**No derivative may exceed 400 KB.** The pipeline exits non-zero if one does. The current worst is `group-usadc-2000.webp` at **307 KB**, from 24 generated files.

Widths cap at 2000 px, not 2400. Measured on the 4032×3024 master: at 2400 the intended quality yields WebP 406 KB and JPEG 531 KB, both over budget, while 2000 yields AVIF 240 / WebP 307 / JPEG 387. Capping width preserves quality; dropping quality to fit 2400 would not.

## Testing

```bash
npm test
```

**216 tests across 17 files**, all passing, with no stderr noise.

| file | tests | covers |
|---|---|---|
| `visual-language.test.js` | 57 | the deleted design elements' absence, the four panel patterns, glass and accent discipline, the focus ring on both grounds, the luminance ceiling, the shader's two fixed defects, the bench and probe wiring, the nav pill row and height, 200 % text zoom |
| `ui.dom.test.js` | 17 | DOM structure for every panel, media and form facades, the footer, and the content boundary |
| `lifecycle.test.js` | 17 | pause/resume on visibility and intersection, delta clamping, teardown; the no-animation-engine and no-`animejs`-dependency guards |
| `contrast.test.js` | 15 | `relativeLuminance`, `contrastRatio`, `worstCase` (including its non-finite guard), `TIME_STEPS` |
| `smooth.dom.test.js` | 14 | Lenis construction, anchor interception, modifier-click opt-out, teardown, and installing nothing under reduced motion |
| `main.dom.test.js` | 17 | boot ordering, both fallback paths, the gradient mount, and the animated `onFrame` composition |
| `gradient.dom.test.js` | 12 | shader compile/link, uniform plumbing, failure cleanup, resize |
| `nav.dom.test.js` | 12 | the links, the CTA, the markup, and `--nav-offset`'s `ResizeObserver` |
| `content.test.js` | 11 | apostrophe preservation, board structure, media list, contact details |
| `budget.test.js` | 9 | the frame cap's accumulation and `renderSize`'s clamp |
| `reveal.dom.test.js` | 9 | the reveal's pending/visible classes, one-shot unobserve, reduced motion, and the no-`IntersectionObserver` guard |
| `assets.test.js` | 7 | the image pipeline's derivatives and the 400 KB budget |
| `palette.test.js` | 5 | three stops, ordering, range, and that it is violet rather than blue |
| `panels.dom.test.js` | 5 | `data-panel` / `data-surface` stamping |
| `sections-layout.dom.test.js` | 4 | the grid panel's title size, that nothing resolves to sticky, and that the scan proving it is not blind |
| `detect.dom.test.js` | 4 | WebGL and reduced-motion detection |
| `smoke.test.js` | 1 | module load |

## Known limitations

From **§10 of [`docs/VERIFICATION.md`](docs/VERIFICATION.md)**, which lists eleven. The ones worth knowing before you change anything:

1. **Live scroll input is not verified end to end.** The verification host delivers no `requestAnimationFrame` of its own, so Lenis was stepped by hand with real timestamps and anchor activation was synthesized. Wheel and touch inertia, and the velocity uniform under real input, rest on `tests/smooth.dom.test.js` and `tests/gradient.dom.test.js` alone. The sustained frame rate and the 30 fps cap in a live visible tab are likewise unmeasured — the *frame cost* is a real GPU timer query; the *achieved* rate is not.

2. **The `IntersectionObserver` pause is unreachable by design, not merely unverified.** `createLifecycle` gates the loop on intersection **and** visibility, but `main.js` observes `#gradient`, which is `position: fixed; inset: 0` — it covers the viewport at every scroll position and can never stop intersecting. The observer reports `isIntersecting: true` at first delivery and never flips. **`document.hidden` is the only gate that fires live**; the observer half is defensive depth, exercised only through an injected observer in tests. (The previous version of this page made the identical argument about a `position: sticky` stage. The stage is gone, the stickiness is gone, and the conclusion survived both.)

3. **Nothing rests on a screenshot.** The host's screenshot pipeline returns stale frames, so every visual claim in `VERIFICATION.md` is established by `getComputedStyle`, `getBoundingClientRect`, `Range` and `gl.readPixels` instead.

4. **`backdrop-filter`'s cost on a mid-range phone.** Two full-viewport blurred layers sit over a canvas that repaints every frame, so the blur cannot be cached. On the measured host the shipped configuration has **at least 33× headroom** and is indistinguishable from `backdrop-filter: none` — but both conditions are pinned at a 60 Hz vsync ceiling there, so the cost is bounded above rather than resolved, and the machine the concern is about was not measured.

5. **Real devices, other browsers, other GPUs.** Chromium on ANGLE / Metal / Apple M4 only. 320 / 375 / 768 were viewport emulation, not real touch devices. Glyph rendering and font fallback were not inspected.

Full details and measurements in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
