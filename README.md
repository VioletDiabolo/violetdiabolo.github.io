# Violet Diabolo

Rebuilt website for Violet Diabolo, NYU's diabolo (Chinese yo-yo) performance team. A single-page scroll experience featuring a Three.js-rendered purple diabolo in exploded view, scrubbed by page scroll through an anime.js timeline. Replaces the React site at github.com/violetdiabolo/violetdiabolo.github.io; deploys to GitHub Pages.

## Quick start

```bash
npm install
npm run dev          # Start dev server on localhost:5173
npm run build        # Build production (runs `npm run assets` first)
npm run preview      # Preview built dist/ locally
npm test             # Run 119 tests across 13 test files
```

`npm run build` regenerates optimized images from masters via `npm run assets` before bundling.

## Deploying to GitHub Pages

`npm run build` produces `dist/`, which is what GitHub Pages serves. The `base: './'` setting in `vite.config.js` makes the site work from a project subpath (necessary for GitHub project sites).

To deploy:
1. Run `npm run build`
2. Commit and push `dist/` to the `gh-pages` branch (or configure your repo's Pages settings to deploy from `dist/` on `main`)

## Project layout

| Directory | Purpose |
|-----------|---------|
| `src/content/` | Club identity, board members, events, videos, contact info. No markup. Mutations here flow everywhere. |
| `src/ui/` | DOM rendering: sections, board cards, media facades, forms, reveal animations. No 3D geometry. |
| `src/diabolo/` | Three.js scene, materials, geometry build, render loop. No HTML, no club copy. |
| `src/scroll/` | ScrollObserver and anime.js choreography binding scroll position to the explosion timeline. |
| `src/fallback/` | Feature detection (WebGL support, reduced-motion preference). |
| `src/styles/` | Base typography/layout, section styles, stage canvas styles. |
| `scripts/build-assets.mjs` | Image optimization pipeline (resize, AVIF/WebP/JPEG conversion). |
| `tests/` | 119 unit tests. 13 test files verify content, geometry, lifecycle, scroll binding, DOM structure, feature detection. |
| `public/images/` | Generated derivative images (run `npm run assets` to refresh). |
| `docs/VERIFICATION.md` | Real-condition verification record from Chromium; see it for what is/isn't verified. |

**Boundaries enforced by tests:**
- `src/content/*` holds no markup (literals only).
- `src/ui/*` holds no 3D geometry or anime.js imports.
- `src/diabolo/*` holds no copy or DOM rendering.

The test suite fails if club copy is hardcoded into a `ui/` module, ensuring content edits don't require code changes.

## How the 3D works

Seven parts (two cups, two gaskets, two hub cones, one bearing) are built procedurally using Three.js `LatheGeometry`, revolved from 2D half-profiles defined in `src/diabolo/profiles.js`. No downloaded 3D model files.

The explosion is driven by an anime.js timeline (508 ms duration) that animates each part's position and rotation. Page scroll (0 to 1) is mapped onto timeline progress (0 to 508) by a ScrollObserver in `src/scroll/choreography.js`, which calls `timeline.seek()` on every scroll tick. Three.js's render loop ticks every frame independent of scroll, reading part positions written by anime and rendering them.

## The one rule: one owner per transform

**The render loop owns `root.rotation.y` (idle spin) and `bearing.spinMesh.rotation.y` (bearing spool spin).** 
**anime.js owns every part group's `.position` and `.rotation` (X/Z only, never Y).**

Why: Two drivers writing to the same transform cause the explosion to fight the idle spin. The bearing must spin on its own axis while its container group explodes outward—hence separate meshes. anime.js self-idles when it has no children to animate, so the global engine never pauses; pausing it would freeze reveal animations and other content animations that share it.

## Editing content

Everything lives in `src/content/index.js`. To edit:

- **Add a board member:** append to the `BOARD` object, create a semester entry if needed.
- **Add a video:** append to `MEDIA` array with a YouTube ID.
- **Change practice times:** edit `EVENTS.body`.
- **Add social links:** extend `SOCIALS` array.

**⚠️ Apostrophe warning:** The copy is reproduced verbatim from the club's old site, including a deliberate mix of curly (`U+2019`) and ASCII (`U+0027`) apostrophes. The test suite pins this exact mix. "Fixing" the apostrophes will fail `tests/content.test.js`. Do not normalize them.

## Images

Masters live in `assets-src/`; derivatives (AVIF, WebP, JPEG at multiple widths) are generated into `public/images/` by `npm run assets`.

**No image may exceed 400 KB.** The pipeline exits with non-zero status if any derivative overshoots. For reference: an 11.3 MB master photo becomes 240 KB as AVIF at 2000 px width (quality 55).

Widths are capped at 2000 px (not 2400) to stay under budget while preserving quality. JPEGs (last-resort fallback) are generated only for certain widths.

## Testing

```bash
npm test
```

Runs 119 tests across 13 test files:
- `content.test.js` — apostrophe preservation, board structure, media list, contact details
- `lifecycle.test.js` — render loop pause/resume on visibility changes; guards against anime.js global engine import
- `choreography.test.js`, `choreography.dom.test.js` — timeline seek, scroll→timeline binding, sticky target rejection
- `profiles.test.js`, `build.test.js` — geometry dimensions and LatheGeometry construction
- `stage.test.js`, `materials.test.js`, `detect.dom.test.js`, `ui.dom.test.js`, `reveal.dom.test.js`, `assets.test.js`, `smoke.test.js` — rendering, materials, feature detection, DOM structure, image budget

## Known limitations

See **Outstanding for a human on a real machine** in [`docs/VERIFICATION.md`](docs/VERIFICATION.md):

1. **Scroll pause not verified.** Environment cannot deliver scroll events or `requestAnimationFrame` ticks. An IntersectionObserver watches for the stage scrolling offscreen to pause rendering. This is covered by unit tests but not verified in a real browser. To test on your machine: open the built site in a focused tab, scroll the stage fully out of view, wait 3 s, and confirm `__vd.lifecycle.frameCount()` stops changing.

2. **Live scroll scrub not verified.** The ScrollObserver's scroll→timeline binding is structurally correct but was not exercised end-to-end with live scroll events.

3. **Reduced-motion and unsupported-WebGL states not visually verified.** Confirmed structurally via the DOM.

Full details and measurements in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
