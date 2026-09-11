# Real-condition verification record — S-register build

Recorded 2026-09-10 against `build/s-register`, `npm run build` → `vite preview`, driven in a
real Chromium instance. **Only observed numbers appear here.** Where the environment could not
produce a condition, that is stated rather than papered over.

## Summary

| Claim | Status |
|---|---|
| Explosion is simultaneous, not sequential | **Verified** |
| Parts separate along the axle axis, evenly spaced | **Verified** |
| Object turns face-on → profile across the scrub | **Verified** |
| Camera pulls back far enough to frame the exploded object | **Verified** |
| Bearing stays fixed as the centre reference | **Verified** |
| Entrance runs before the scroll timeline is attached | **Verified** |
| Transform ownership holds | **Verified** |
| CSS3D labels render, alternate sides, fade with the turn | **Verified at rest only — see §7** |
| Label text is in the accessibility tree | **Verified** |
| Label text is mouse-selectable | **No** — blocked by the content layer, see §7 |
| Black axle proportion corrected | **Verified** |
| Spin is visible rather than drift | **Constant checked, never observed running** |
| Live scroll drives the timeline | **Not verified** — host fires no scroll events |
| Render loop stops when scrolled offscreen | **Unreachable by design** — see §9 |

## 1. Simultaneity — the thing that was wrong before

The previous build detached parts one at a time, one per page section. Measured now at three
points on the timeline (`duration 1000`):

| part | t=0 | t=500 | t=1000 |
|---|---|---|---|
| `cupTop` | 0.235 | **0.943** | 1.650 |
| `gasketTop` | 0.190 | **0.645** | 1.100 |
| `hubConeTop` | 0.070 | **0.310** | 0.550 |
| `axleBearing` | 0.000 | 0.000 | 0.000 |
| `hubConeBottom` | −0.070 | **−0.310** | −0.550 |
| `gasketBottom` | −0.190 | **−0.645** | −1.100 |
| `cupBottom` | −0.235 | **−0.943** | −1.650 |

At the halfway point **every** moving part is strictly between rest and exploded — none still at
rest, none already finished. Programmatic check returned `SIMULTANEOUS: true`, `stillAtRest: []`,
`alreadyDone: []`.

Exploded gaps are exactly **0.550** between each adjacent pair. The bearing does not move; it is
the reference part the diagram is measured from.

## 2. The turn

```
t=0     tilt.rotation.x = -1.5708   (face-on: looking down the axle)
t=1000  tilt.rotation.x =  0.0000   (profile: the hourglass)
```

Framebuffer readback at t=0 shows concentric rings — the cup rim, gasket and bearing seen down
the axis. At t=1000 the silhouette is the familiar hourglass, separated.

## 3. Camera framing

The first attempt at this failed and the failure is worth recording. With the camera fixed at
`z = 5.4` (`fov 34`, visible height **3.30** units) the fully exploded object spans **5.02**
units — a **52% overflow**, with both cups off-screen and only slivers visible.

Now dollied across the same scrub:

```
t=0     camera.position.z = 5.4    visible height 3.30  (frames the 2.00 cup disc)
t=1000  camera.position.z = 10.0   visible height 6.11  (frames the 5.02 exploded extent)
```

`tests/choreography.test.js` pins this as a geometric invariant: the frustum at `CAMERA_FAR_Z`
must contain `explodedY('cupTop') + DIMS.cupHeight` with 10% margin. Raising `SPACING` or
lengthening the cups now fails the suite instead of being discovered by eye.

## 4. Proportions

| | before | after |
|---|---|---|
| `hubHeight` | 0.30 | 0.12 |
| `bearingHeight` | 0.26 | 0.14 |
| total height | 2.670 | 2.190 |
| black axle share | **32.2%** | **17.4%** |

Seam continuity holds after the retune: hub-to-bearing 0.0135, hub-to-gasket-bore 0.0112,
both inside the 0.02 tolerance.

## 5. Ownership

```
anime.js writes tilt.rotation.x, part .position, state.spinRate, state.labelOpacity, camera.position.z
render loop writes spinner.rotation.y and the bearing mesh; reads state.spinRate only
```

Checked directly: seeking the timeline to 70% left `spinner.rotation.y` **bit-identical**.
`tests/lifecycle.test.js` greps all of `src/` and fails on any `engine` import or
`engine.pause(` call — negative-controlled in both directions.

## 6. Entrance ordering

`window.__vd.choreography` is `null` while the entrance runs and becomes non-null only in its
completion callback. The entrance and the scroll timeline both write part positions, so they are
never live at once.

A bug was found and fixed here: under `prefers-reduced-motion` the entrance's `skip()` was still
firing that callback, attaching a scroll timeline while **no render loop existed** — part
positions would mutate against a canvas that never repainted. Reduced motion now attaches no
scrub at all. The regression test was validated by stashing the fix and watching it fail with the
real bug's stack trace.

## 7. CSS3D labels

All seven render, with even ~88 px vertical spacing and alternating sides:

```
01 UPPER CUP    x=479    05 HUB CONE     x=483
02 GASKET       x=116    06 GASKET       x=117
03 HUB CONE     x=483    07 LOWER CUP    x=479
04 AXLE BEARING x= 92
```

Faded via `state.labelOpacity`, 30% → 85% of the scrub. They are hidden face-on deliberately:
at `tilt = -π/2` the parts' local Y collapses into camera depth and all seven would project onto
one point. Labels annotate the exploded diagram, which does not exist yet at that angle.

**A defect these measurements could never have caught.** The x-values above are a single
frozen-state snapshot at `spinner.rotation.y === 0`, which is the only state this host can
produce. The sprites were originally parented into the part groups, which live under the
continuously-spinning `spinner`. `CSS3DSprite` billboards *orientation* but not *position*, so
the side offset orbited:

```
spin   0deg -> label world x  1.150
spin  90deg -> label world x  0.000   all seven collapse onto the axis
spin 180deg -> label world x -1.150   sides inverted
```

A full revolution every 8.98 s and a collapse every **2.24 s** — permanent, in the headline
feature, and invisible to every number in this record. Found by reading the transform chain, not
by measuring. Fixed by attaching the labels to `tilt` instead: they inherit the face-on-to-profile
turn and nothing else. Verified **0 sprites under `spinner`, 7 under `tilt`**, with a
negative-controlled regression test.

**Selectability:** three's `CSS3DObject` constructor sets `element.style.userSelect = 'none'`
inline, which beats any stylesheet rule. Overridden after construction, with a guard test that
fails if the override is removed (negative-controlled).

**But mouse selection still does not work, and claiming otherwise was wrong.** `#content` sits at
`z-index: 1` over `#stage` at `z-index: 0`, so a drag across a label selects section text instead.
The override is necessary but not sufficient. The labels are in the accessibility tree and
screen-readable; they are not selectable with a cursor.

Hidden labels use `opacity: 0` with `pointer-events: none`, never `visibility: hidden` or
`display: none` — per ARIA, `visibility: hidden` removes an element from the accessibility tree
exactly as `display: none` does, so either would have quietly defeated the whole reason this
layer is real DOM. `opacity: 0` is the one hiding mechanism that keeps an element exposed.

## 8. Appearance and content

```
mean lit RGB     (175, 137, 208)      clearly violet: 82.3%
one frame        9 draw calls, 30,624 triangles
idle spin        0.700 rad/s          source constant, raised from 0.22; NOT observed running
sections         hero about events media board contact footer
media            10 facades, 0 live iframes before activation
board            3 cards, 1 placeholder without an <img>
images           4 <picture> elements, 0 <img> missing alt
links            6 outbound, all resolving
horizontal overflow  none
```

Contrast was **measured against live canvas pixels**, not assumed. The hero tagline read
**1.07:1** over the bloom — a real failure — and was fixed to **6.6:1** with a backing plate. The
same check disproved an assumption that the two-column grid protected section headings; it fails
at 768 px specifically, and the plate was extended there.

## 9. What is NOT verified, and why

**Live scroll-driven scrubbing.** This host fires **zero** `scroll` events and **zero** animation
frames — measured directly: a bare scroll listener received 0 events across a real 3000 px
scroll, and a bare `requestAnimationFrame` loop received 0 ticks in 900 ms, with
`document.hidden === true`. Every timeline measurement above was taken by seeking the timeline
directly or by calling the app's own `entrance.skip()`. **That is a synthetic stand-in and is
labelled as such.** The wiring is verified; tick delivery is not.

Note for anyone repeating this: calling `.seek()` on an `onScroll`-autoplay timeline detaches it
from further scroll-driven updates. Reload between a seek-based check and a scroll-based one.

**The scrolled-offscreen render pause is unreachable by design.** `#stage` is
`position: sticky; top: 0; height: 100dvh` and a sibling of `#content`, so it is pinned to the
viewport for the whole document. Its `IntersectionObserver` reports `isIntersecting: true` from
first paint and cannot flip in any browser. `document.hidden` is therefore the only live gate;
the observer is defensive depth. The 13 lifecycle tests exercise that branch through an injected
observer, which is not the real condition.

Confirmed working under the real condition: with `document.hidden === true`, the lifecycle
refused to start — `isRunning() === false`, `frameCount() === 0` after 1200 ms.

## Outstanding for a human on a real machine

1. Watch the entrance play, then the scrub, end to end.
2. Confirm the labels stay legible while the object turns, at a real frame rate.
3. Toggle OS reduced-motion: the object should sit assembled and face-on, with no scrub.
4. Disable WebGL: `data-stage="unsupported"` should show the static SVG diabolo.
5. Select a label's text with the cursor to confirm the `userSelect` override holds in practice.
