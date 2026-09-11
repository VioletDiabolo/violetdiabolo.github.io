# Violet Diabolo

Rebuilt website for Violet Diabolo, NYU's diabolo (Chinese yo-yo) performance team. A single-page scroll experience featuring a Three.js-rendered purple diabolo in exploded view, scrubbed by page scroll through an anime.js timeline. Replaces the React site at github.com/violetdiabolo/violetdiabolo.github.io; deploys to GitHub Pages.

## Quick start

```bash
npm install
npm run dev          # Start dev server on localhost:5173
npm run build        # Build production (runs `npm run assets` first)
npm run preview      # Preview built dist/ locally
npm test             # Run 220 tests across 20 test files
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
| `src/diabolo/` | Three.js scene, materials, geometry build, render loop, the CSS3D label layer (`labels.js`), and the light-bloom spill (`spill.js`). No club copy. |
| `src/scroll/` | The entrance sequence and the anime.js/ScrollObserver choreography binding scroll position to the six acts. |
| `src/fallback/` | Feature detection (WebGL support, reduced-motion preference). |
| `src/styles/` | Base typography/layout, section styles, stage canvas styles, and the CSS3D label layer's own rules (`.label-layer`, `.part-label`). |
| `scripts/build-assets.mjs` | Image optimization pipeline (resize, AVIF/WebP/JPEG conversion). |
| `tests/` | 220 unit tests across 20 test files: content, geometry, lifecycle, choreography, entrance sequencing, CSS3D labels, spill tracking, layout binding, DOM structure, feature detection. |
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

The scroll choreography spans six named acts, each mapping a section of the page to a target object state. The object **arrives** face-on and centred, **separates** into an exploded view while sliding sideways, **recombines** while rotating to profile orientation, **spins** hard on its axis, **orbits** the camera around it at constant radius, then **settles** back to face-on at the end. Page scroll (0 to 1) is mapped onto anime.js timeline progress by a ScrollObserver in `src/scroll/choreography.js`, which calls `timeline.seek()` on every scroll tick. Across each act, anime.js animates part positions, the object's tilt, the camera position, spin rate, and label visibility as specified in the `ACTS` table in `choreography.js` — the choreography is pure data, tunable without touching timeline code. Three.js's render loop ticks every frame independent of scroll, reading part positions written by anime and rendering them. A one-time entrance sequence (`src/scroll/entrance.js`) converges every part onto its assembled, face-on rest position before the scroll timeline ever attaches.

## Changing the choreography

The `ACTS` table in `src/scroll/choreography.js` holds six rows, one per act: `arrival`, `apart`, `recombine`, `spin`, `orbit`, `settle`. Each row specifies the target state at the **end** of that act — position, rotation, camera distance, spin rate, and label visibility. To retune an act, edit its row. The timeline tweens from one act's state to the next, so the whole choreography derives from these six lines of data.

Several tests pin the `ACTS` table values, so changes will tell you what they affected:
- `choreography.test.js` validates that each act's state is reachable and the camera stays in frustum.
- `choreography.dom.test.js` tests the object's position relative to the reading column across the acts.
- The entrance sequence and the spill tracking also depend on these values, so run the full suite after tuning.

## The one rule: one owner per transform

**anime.js owns** all scroll-driven animation: `tilt.rotation.{x,z}`, `tilt.position.{x,y}`, every part's `.position`, `camera.position.{x,z}`, `state.spinRate`, and `state.labelOpacity`. **The render loop owns** `spinner.rotation.y` (the idle spin), `bearing.spinMesh.rotation.y` (the bearing spool), and `camera` aiming (it calls `camera.lookAt()` to fix the camera's quaternion and direction). The render loop **reads** the scalar state values anime wrote but **writes** nothing anime reads.

Why: Two drivers writing the same transform property fight, producing jitter or cancellation. This exact bug shipped twice on this project—once as parts fighting the idle spin, once as a camera aimed at the object which cancelled the lateral offset on screen. Splitting ownership prevents it: tilt and spinner are two nested groups so rotation never collides; the bearing has its own spinMesh for the same reason; camera position and aiming are separate concerns so a screen-space spill can track projected position correctly.

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

Runs 220 tests across 20 test files:
- `content.test.js` — apostrophe preservation, board structure, media list, contact details
- `lifecycle.test.js` — render loop pause/resume on visibility changes; guards against anime.js global engine import
- `choreography.test.js`, `choreography.dom.test.js` — six acts, timeline seek, scroll→timeline binding, sticky target rejection, simultaneity, the tilt rotations, the camera dolly, object-to-reading-column clearance
- `entrance.test.js` — the scattered-to-assembled entrance sequence, run before the scroll timeline ever attaches
- `profiles.test.js`, `build.test.js` — geometry dimensions and LatheGeometry construction
- `stage.test.js`, `materials.dom.test.js`, `detect.dom.test.js`, `ui.dom.test.js`, `reveal.dom.test.js`, `assets.test.js`, `smoke.test.js` — rendering, materials, feature detection, DOM structure, image budget
- `labels.dom.test.js` — the CSS3D part-label layer: sprite placement, side alternation, opacity/accessibility, text selectability
- `spill.dom.test.js`, `stage-spill.dom.test.js` — the light-bloom spill: screen-space tracking, clamping, overlay integration
- `sections-layout.dom.test.js` — reading-column placement, act-to-section mapping, side stamping
- `visual-language.test.js` — absence of deleted design elements (grid, hairlines, Space Grotesk)
- `main.dom.test.js` — boot-time wiring, including the reduced-motion path

## Known limitations

See **Outstanding for a human on a real machine** in [`docs/VERIFICATION.md`](docs/VERIFICATION.md):

1. **Scroll-offscreen pause is unreachable by design, not just unverified.** `#stage` is `position: sticky; top: 0; height: 100dvh`, pinned to the viewport for the entire document height — its `IntersectionObserver` reports `isIntersecting: true` from first paint and can never flip to `false` in any browser. `document.hidden` is the only pause gate that actually runs live. The IntersectionObserver wiring is defensive depth, exercised by unit tests through an injected observer rather than a real one.

2. **Live scroll scrub not verified.** The ScrollObserver's scroll→timeline binding is structurally correct but was not exercised end-to-end with live scroll events.

3. **Reduced-motion and unsupported-WebGL states not visually verified.** Confirmed structurally via the DOM.

Full details and measurements in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
