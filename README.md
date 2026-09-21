# Violet Diabolo

Rebuilt website for Violet Diabolo, NYU's diabolo (Chinese yo-yo) performance team. A single-page scroll experience: a Three.js diabolo — near-black masses with bright wireframe edges and one red gasket ring — drawn on a near-black workbench and scrubbed by page scroll through an anime.js timeline. Replaces the React site at github.com/violetdiabolo/violetdiabolo.github.io; deploys to GitHub Pages.

## Quick start

```bash
npm install
npm run dev          # Start dev server on localhost:5173
npm run build        # Build production (runs `npm run assets` first)
npm run preview      # Preview built dist/ locally
npm test             # Run 280 tests across 19 test files
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
| `src/ui/` | DOM rendering: the fixed nav (`nav.js`), the six sections (`sections.js`), board cards, media facades, forms, reveal animations, and the `data-side` stamping (`layout.js`). No 3D geometry, no anime.js. |
| `src/diabolo/` | Three.js scene, materials, geometry build, render loop, and the CSS3D label layer (`labels.js`). No club copy. |
| `src/scroll/` | The entrance sequence and the anime.js/ScrollObserver choreography binding scroll position to the four rooms. |
| `src/fallback/` | Feature detection (WebGL support, reduced-motion preference). |
| `src/styles/` | `base.css` (tokens, reset, typography, nav, focus), `sections.css` (the four room patterns), `stage.css` (the sticky canvas, the narrow-screen object band, the CSS3D label rules). |
| `scripts/build-assets.mjs` | Image optimization pipeline (resize, AVIF/WebP/JPEG conversion). |
| `tests/` | 280 unit tests across 19 test files — see **Testing** below. |
| `public/images/` | Generated derivative images (run `npm run assets` to refresh). |
| `docs/VERIFICATION.md` | Real-condition verification record from Chromium; see it for what is/isn't verified. |

**Module boundaries (conventions, not mechanically checked):**
- `src/content/*` holds no markup (literals only).
- `src/ui/*` holds no 3D geometry.
- `src/diabolo/*` and `src/scroll/*` hold no club copy (site name/tagline, contact email, About/Events body text,
  media titles). `labels.js` does build real DOM — the CSS3D label layer's part-annotation
  elements — which is a rendering concern this module owns on purpose, not an exception.

**Two boundaries actually enforced by tests:**
- `src/ui/*` never hardcodes club copy. `tests/ui.dom.test.js` greps every file in `src/ui/` for those literal strings and fails if one is baked in rather than imported from `src/content/`. This is what actually guarantees content edits don't require code changes.
- anime.js is imported by exactly two modules, `src/scroll/choreography.js` and `src/scroll/entrance.js`. `tests/lifecycle.test.js` walks every file under `src/` and fails on any other import, and separately fails on any use of anime.js's **global engine** — pausing it would stop every timeline on the page, not just this one.

## The page: four rooms

Every section is one **room**, and every room is the same two boxes arranged differently:

```
<section data-room data-side> <div class="room"> <div class="room-head">  reading text
                                                 <div class="room-body">  everything else
```

`src/ui/sections.js` builds that structure and stamps `data-room`; `src/ui/layout.js` stamps `data-side` (which half the reading column takes, so the object can hold the other); `src/styles/sections.css` holds the four arrangements:

| room | sections | composition |
|---|---|---|
| `hero` | hero | full-bleed, object cropped large. Head bottom-left, teaser card bottom-right. |
| `panel` | about | a solid violet sheet that slides up and covers the object. Serif, near-black text. |
| `showcase` | events | head top-left, body bottom-left, object right. The explosion plays here. |
| `grid` | media, board, contact | a sticky title column left, cards right. |

The panel's slide-up costs nothing: `#stage` is `position: sticky` and `#content` scrolls over it, so an opaque section simply rises and covers the object — no scroll listener, no second animation engine.

**Section heights are derived, not chosen.** The timeline is bound to `#content` with `enter: 'top top'` / `leave: 'bottom bottom'`, so progress 1 is reached after `document height − one viewport` of scrolling. At a total of 1300vh that scrollable span is 1200vh, and each section is given its room's share of it, which lands all three handovers exactly: about at 144/1200 = 0.1200 against the hero room's `end` of 0.12, events at 360/1200 = 0.3000, media at 660/1200 = 0.5500. `tests/sections-layout.dom.test.js` recomputes both halves — the handovers against `ROOMS`, and each section against the content measured inside it — so the derivation cannot quietly stop holding. Do not retune a `min-height` without reading the comment at the top of `sections.css`.

**Below 768px the composition changes rather than shrinking.** There is no second column on a phone, so `#stage` becomes an opaque 40dvh band at the top of the viewport, *above* `#content`, and the text flows beneath it. That band is not reading space: content there is covered, and it takes the tap too. Content scrolling through it is fine; content *held* there is not, so every sticky offset at this width must be at or below the band's height (the two rooms still pinned sit at exactly 40dvh, the grid rooms' title column is unpinned outright, and jump links use `scroll-margin-top: 40dvh`). `tests/sections-layout.dom.test.js` and `tests/visual-language.test.js` hold all three of those to the band's declared height.

## How the 3D works

Seven parts (two cups, two gaskets, two hub cones, one bearing) are built procedurally using Three.js `LatheGeometry`, revolved from 2D half-profiles defined in `src/diabolo/profiles.js`. No downloaded 3D model files. Materials are unlit (`MeshBasicMaterial` fills, `LineBasicMaterial` edges) — the object is a line drawing, so there is no lighting, no environment map and no PBR path.

The scroll choreography is the **`ROOMS` table** in `src/scroll/choreography.js`: four rows, one per room, each a target state reached at the **end** of that room's `end` fraction. The object arrives face-on and assembled, turns and holds through `hero` and `panel`, **comes apart into an exploded view** across `showcase` while sliding sideways and dollying out, then reassembles, spins up, centres and **fades to nothing** across `grid`. Page scroll (0 → 1) is mapped onto anime.js timeline progress by a ScrollObserver, which seeks the timeline on every scroll tick. Three.js's render loop ticks every frame independent of scroll, reading part positions written by anime and rendering them. A one-time entrance sequence (`src/scroll/entrance.js`) converges every part onto its assembled, face-on rest position before the scroll timeline ever attaches.

One subtlety worth knowing before you retune anything: **each room's tweens run its full duration, so the reassembly out of the explosion spans the whole `grid` room** — `cupTop` leaves its rest position at f = 0.3014 and is still off it at f = 0.99. What keeps that off the screen is opacity, not position. `objectOpacity` rides `OPACITY_SETTLE` (a tenth of the room) rather than the full room and reaches 0 at f = 0.595, where the object is still 97.55% apart. So the object is *gone* before any of its reassembly can be seen. `docs/VERIFICATION.md` reports this as qualified rather than verified, and the section heights depend on it.

## Changing the choreography

The `ROOMS` table in `src/scroll/choreography.js` holds four rows: `hero`, `panel`, `showcase`, `grid`. Each row specifies the target state at the **end** of that room — `end` (progress), `explode` (0 assembled → 1 fully apart), `tiltX`, `x` (lateral offset), `y`, `camZ`, `spin`, `labels`, `opacity`, and `textSide`. To retune a room, edit its row. The timeline tweens from one room's state to the next, so the whole choreography derives from these four lines of data.

Several tests pin the `ROOMS` values, so changes will tell you what they affected:
- `choreography.test.js` validates that each room's state is reachable and the camera stays in frustum.
- `choreography.dom.test.js` samples the object's position relative to the reading column across 400 points of the scrub, and samples inside the fade window rather than only at room boundaries.
- `sections-layout.dom.test.js` ties `end` to the section heights (see **four rooms** above) — change an `end` and a handover assertion will move with it.
- The entrance seeds itself from the `hero` row, so run the full suite after tuning.

`textSide` is not decoration: `src/ui/layout.js` reads it to stamp `data-side`, which is what puts the reading column on the half the object is not holding. That is why no text on this page needs a plate behind it.

## The one rule: one owner per transform

**anime.js owns** all scroll-driven animation: `tilt.rotation.x`, `tilt.position.{x,y}`, every part's `.position`, `camera.position.z`, `state.spinRate`, `state.labelOpacity`, and `state.objectOpacity`. **The render loop owns** `spinner.rotation.y` (the idle spin), the bearing's own `spinMesh.rotation.y` (the spool), and camera aiming (it calls `camera.lookAt()`). The render loop **reads** the scalar state values anime wrote — including writing `state.objectOpacity` onto every material each frame — but **writes** nothing anime reads. `camera.position.x` is never animated at all; there is no orbit room.

Why: two drivers writing the same transform property fight, producing jitter or cancellation. This exact bug shipped twice on this project — once as parts fighting the idle spin, once as a camera aimed at the object which cancelled the lateral offset on screen. Splitting ownership prevents it: `tilt` and `spinner` are two nested groups so rotation never collides; the bearing has its own `spinMesh` for the same reason; camera position and aiming are separate concerns.

The scalar-state bridge (`spinRate`, `labelOpacity`, `objectOpacity`) is how a value crosses from anime to the render loop without a second owner, and it has to be *wired*, not merely declared. `objectOpacity` is the case to learn from: the table said the object fades to 0 in the `grid` room, and the fade was a silent no-op until the materials were given `transparent: true` and the render loop was made to read the scalar. `tests/materials.dom.test.js` and `tests/stage.test.js` guard both halves.

## Fallback paths

Neither path is a degraded version of the main one; both are compositions of their own, and both are decided in `boot()` in `src/main.js`.

- **`prefers-reduced-motion: reduce`** → `data-stage="static"`. The entrance is resolved with `entrance.skip()`, no scroll timeline is attached and no render loop runs, so one frame is painted and nothing moves again. The object is shown in profile with its labels visible.
- **No WebGL** → `data-stage="unsupported"`. The canvas is hidden and `index.html`'s hand-built fallback SVG of the same object is shown instead, pinned centre.

Both paths re-stamp every section with **one** reading side, via `applySectionSides(content, { staticAt: HERO_ID })`. This matters: the per-room sides describe a journey the object never makes on these paths, and without the re-stamp the three `grid` sections keep their centred, full-width card columns and lay them straight across an object that will never move or fade. `tests/main.dom.test.js` covers both.

The fallback SVG's eight colours are a **hand-kept copy** of `PART_COLORS`/`EDGE_COLORS` from `src/diabolo/materials.js` — nothing derives them. `tests/materials.dom.test.js` asserts the two sets match in both directions, which is the only thing keeping them in step when the object's palette is retuned.

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

Runs 280 tests across 19 test files:

| file | tests | covers |
|---|---|---|
| `content.test.js` | 11 | apostrophe preservation, board structure, media list, contact details |
| `profiles.test.js`, `build.test.js` | 14, 20 | geometry dimensions and `LatheGeometry` construction |
| `materials.dom.test.js` | 19 | the flat unlit palette, material disposal, and the fallback SVG's colours against it |
| `stage.test.js` | 28 | renderer setup, camera aiming, overlay disposal, the `objectOpacity` bridge |
| `lifecycle.test.js` | 16 | render-loop pause/resume on visibility; the anime.js import and global-engine boundaries |
| `entrance.test.js` | 13 | the scattered-to-assembled entrance, run before the scroll timeline attaches |
| `choreography.test.js`, `choreography.dom.test.js` | 32, 16 | the four rooms, timeline seek, scroll→timeline binding, sticky-target rejection, simultaneity, tilt, camera dolly, reading-column clearance, containment inside the fade window |
| `labels.dom.test.js` | 16 | the CSS3D part-label layer: sprite placement, side alternation, opacity/accessibility, text selectability |
| `sections-layout.dom.test.js` | 19 | room-to-section mapping, side stamping, the section-height derivation, the media hold-back, and what may be held behind the phone's object band |
| `visual-language.test.js` | 27 | absence of the deleted design elements, the narrow-screen composition, jump-link/band coupling, the focus ring on both grounds |
| `nav.dom.test.js` | 9 | the fixed nav's links, call to action, and markup |
| `ui.dom.test.js` | 17 | DOM structure and the content boundary |
| `main.dom.test.js` | 5 | boot-time wiring, including the reduced-motion and unsupported-WebGL paths |
| `reveal.dom.test.js`, `detect.dom.test.js`, `assets.test.js`, `smoke.test.js` | 6, 4, 7, 1 | scroll reveal, feature detection, image budget, module load |

## Known limitations

See **Outstanding for a human on a real machine** in [`docs/VERIFICATION.md`](docs/VERIFICATION.md):

1. **Live scroll scrub is not verified end to end.** The verification host reports `document.hidden === true`: 0 scroll events were delivered while `scrollY` moved, and 0 rAF callbacks fired in 1500 ms, so every room state on record is a seeked frozen frame rather than an observed one. The ScrollObserver's scroll→timeline binding is structurally correct and unit-tested, but has never been watched running. **This is the single largest gap.**

2. **Scroll-offscreen pause is unreachable by design, not just unverified.** `#stage` is `position: sticky; top: 0`, pinned to the viewport for the entire document height — its `IntersectionObserver` reports `isIntersecting: true` from first paint and can never flip to `false` in any browser. `document.hidden` is the only pause gate that actually runs live. The IntersectionObserver wiring is defensive depth, exercised by unit tests through an injected observer rather than a real one.

3. **Nothing rests on a screenshot.** The verification host's screenshot pipeline returned stale frames that contradicted geometry, so every visual claim in `VERIFICATION.md` is established by `getComputedStyle` / `getBoundingClientRect` / `elementFromPoint` / `readPixels` instead. The panel's coverage of the object, in particular, is established by opacity, geometry and stacking order — not by looking at it.

4. **Real devices, other browsers, real fonts.** Chromium only; 375×812 was viewport emulation, not a real touch device; glyph rendering and font fallback were not inspected.

Full details and measurements in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
