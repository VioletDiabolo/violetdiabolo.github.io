# Violet Diabolo

Rebuilt website for Violet Diabolo, NYU's diabolo (Chinese yo-yo) performance team. A single-page scroll experience featuring a Three.js-rendered purple diabolo in exploded view, scrubbed by page scroll through an anime.js timeline. Replaces the React site at github.com/violetdiabolo/violetdiabolo.github.io; deploys to GitHub Pages.

## Quick start

```bash
npm install
npm run dev          # Start dev server on localhost:5173
npm run build        # Build production (runs `npm run assets` first)
npm run preview      # Preview built dist/ locally
npm test             # Run 165 tests across 16 test files
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
| `src/diabolo/` | Three.js scene, materials, geometry build, render loop, and the CSS3D label layer (`labels.js`) that annotates each part with real DOM. No club copy. |
| `src/scroll/` | The entrance sequence and the anime.js/ScrollObserver choreography binding scroll position to the explosion timeline. |
| `src/fallback/` | Feature detection (WebGL support, reduced-motion preference). |
| `src/styles/` | Base typography/layout, section styles, stage canvas styles, and the CSS3D label layer's own rules (`.label-layer`, `.part-label`). |
| `scripts/build-assets.mjs` | Image optimization pipeline (resize, AVIF/WebP/JPEG conversion). |
| `tests/` | 165 unit tests across 16 test files: content, geometry, lifecycle, scroll binding, entrance sequencing, CSS3D labels, DOM structure, feature detection. |
| `public/images/` | Generated derivative images (run `npm run assets` to refresh). |
| `docs/VERIFICATION.md` | Real-condition verification record from Chromium; see it for what is/isn't verified. |

**Module boundaries (conventions, not mechanically checked):**
- `src/content/*` holds no markup (literals only).
- `src/ui/*` holds no 3D geometry or anime.js imports.
- `src/diabolo/*` holds no club copy (site name/tagline, contact email, About/Events body text,
  media titles). `labels.js` does build real DOM — the CSS3D label layer's part-annotation
  elements — which is a rendering concern this module owns on purpose, not an exception.

**One boundary actually enforced by a test:** `src/ui/*` never hardcodes club copy (site name/tagline, contact email, About/Events body text, media titles). `tests/ui.dom.test.js` greps every file in `src/ui/` for those literal strings and fails if one is baked in rather than imported from `src/content/`. This is what actually guarantees content edits don't require code changes; the three boundaries above are followed but not currently checked by any test.

## How the 3D works

Seven parts (two cups, two gaskets, two hub cones, one bearing) are built procedurally using Three.js `LatheGeometry`, revolved from 2D half-profiles defined in `src/diabolo/profiles.js`. No downloaded 3D model files.

The explosion is driven by an anime.js timeline (1000 ms duration: every part starts moving at the same instant and finishes together — no hero hold, no staggered cascade, no reassembly beat) that animates each part's `.position.y` outward from the axle in proportion to its rank. Across that same span the object turns from face-on (looking straight down the axle) to profile (the familiar hourglass silhouette), and the camera dollies back from its near to its far distance so the exploded object stays framed. Page scroll (0 to 1) is mapped onto timeline progress (0 to 1000) by a ScrollObserver in `src/scroll/choreography.js`, which calls `timeline.seek()` on every scroll tick. Three.js's render loop ticks every frame independent of scroll, reading part positions written by anime and rendering them. A one-time entrance sequence (`src/scroll/entrance.js`) converges every part onto its assembled, face-on rest position before the scroll timeline ever attaches.

## The one rule: one owner per transform

Two nested groups hold the ownership boundary: **`tilt` wraps `spinner`, which wraps every
part.** anime.js owns `tilt.rotation.x` (the face-on-to-profile turn) and every part's
`.position.y` (the explosion, purely vertical — never `.rotation`) — never `spinner.rotation.y`.
**The render loop owns `spinner.rotation.y`** (the idle spin) and `bearing.spinMesh.rotation.y`
(the bearing spool spin) — never anything anime.js writes.

Why: Two drivers writing to the same transform cause the explosion (or the turn) to fight the idle spin. The bearing must spin on its own axis while its container group explodes outward—hence separate meshes. Splitting `tilt` from `spinner` is the same reasoning one level up: the scroll-driven turn and the continuous spin must never share a rotation. anime.js self-idles when it has no children to animate, so the global engine never pauses; pausing it would freeze reveal animations and other content animations that share it.

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

Runs 165 tests across 16 test files:
- `content.test.js` — apostrophe preservation, board structure, media list, contact details
- `lifecycle.test.js` — render loop pause/resume on visibility changes; guards against anime.js global engine import
- `choreography.test.js`, `choreography.dom.test.js` — timeline seek, scroll→timeline binding, sticky target rejection, simultaneity, the face-on-to-profile turn, the camera dolly
- `entrance.test.js` — the scattered-to-assembled entrance sequence, run before the scroll timeline ever attaches
- `profiles.test.js`, `build.test.js` — geometry dimensions and LatheGeometry construction
- `stage.test.js`, `materials.dom.test.js`, `detect.dom.test.js`, `ui.dom.test.js`, `reveal.dom.test.js`, `assets.test.js`, `smoke.test.js` — rendering, materials, feature detection, DOM structure, image budget
- `labels.dom.test.js` — the CSS3D part-label layer: sprite placement, side alternation, opacity/accessibility, text selectability
- `main.dom.test.js` — boot-time wiring, including the reduced-motion path

## Known limitations

See **Outstanding for a human on a real machine** in [`docs/VERIFICATION.md`](docs/VERIFICATION.md):

1. **Scroll-offscreen pause is unreachable by design, not just unverified.** `#stage` is `position: sticky; top: 0; height: 100dvh`, pinned to the viewport for the entire document height — its `IntersectionObserver` reports `isIntersecting: true` from first paint and can never flip to `false` in any browser, so this branch never fires for this page as built (there is nothing to scroll to that would trigger it — see `docs/VERIFICATION.md` §9). `document.hidden` is the only pause gate that actually runs live. The IntersectionObserver wiring is defensive depth, exercised by the 16 `tests/lifecycle.test.js` unit tests through an injected observer rather than a real one.

2. **Live scroll scrub not verified.** The ScrollObserver's scroll→timeline binding is structurally correct but was not exercised end-to-end with live scroll events.

3. **Reduced-motion and unsupported-WebGL states not visually verified.** Confirmed structurally via the DOM.

Full details and measurements in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
