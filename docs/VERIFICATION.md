# Real-condition verification record — wireframe object, four rooms

Recorded 2026-09-21 against `build/wireframe-rooms` at `79aee1c`, `npm run build` → `vite preview`
on :4173, driven in a Chromium instance. **Only numbers re-measured in this run appear here.**
Nothing was carried forward from the previous (six-act) record.

Two things must be read before any number below:

1. **The host reports `document.hidden === true`.** Measured this run: **0 `scroll` events** fired
   while `scrollY` moved 0 → 3871, and **0 `requestAnimationFrame` callbacks** in 1500 ms. The
   timeline's `currentTime` stayed at 0 where a live scrub would have put it at 420. So nothing on
   this page animated on its own, and **every room state below is synthetic** — produced by
   `timeline.seek()` plus `stage.render(0)`, then read back. They are frozen frames, not observed
   motion.
2. **The screenshot pipeline returned a demonstrably stale frame.** At a scroll position where the
   panel section's border-box provably filled the viewport with an opaque violet, the screenshot
   came back solid near-black, and its coordinate frame was 800×600 against a real 1024×768
   viewport. Screenshots were therefore not used as evidence anywhere in this record. Geometry,
   `getComputedStyle`, and WebGL `readPixels` were.

## Summary

| Claim | Status |
|---|---|
| Object is unlit: only `MeshBasicMaterial` + `LineBasicMaterial` | **Verified** — 8 materials, no others |
| No `transmission` / `clearcoat` / `roughness` / `metalness` | **Verified** — all `undefined` |
| No environment map in use | **Verified** — `envMap` is `null`; `scene.environment` null; 0 lights |
| Edge lines land in the predicted 48–204 / 780 range | **Verified** — 48–204, total **780** |
| Four rooms, distinct states at every boundary | **Verified** — all five sampled points differ as specified |
| `cupTop` at rest at 0.12, 0.30, 1.0; exploded only at 0.55 | **Verified** — 0.235 / 0.235 / 0.235 / 1.650 |
| Explosion *begins* inside the showcase room | **Verified** — leaves rest at f = 0.3054 (see §below on why the source says 0.3014) |
| Explosion *ends* inside the showcase room | **Qualified** — reassembly tween runs to f = 0.992; object invisible from f = 0.595 |
| `OPACITY_SETTLE` lands well inside `LATERAL_SETTLE` | **Verified** — opacity 0 at f = 0.59498, x = 0 at f = 0.64893 |
| Labels never outlive the object | **Verified** — DOM opacity 0 at f = 0.60 despite `labelOpacity` 0.9698 |
| Labels do not orbit with the spin | **Verified** — parented `labelRoot < diaboloTilt`, not `spinner` |
| Exploded object fits the frustum | **Verified** — NDC y [−0.914, 0.910], 8.6% margin |
| Panel actually covers the object | **Verified** — opaque sheet, full-viewport box, higher stacking order |
| Every nav pill resolves and moves the scroll | **Verified** — 6/6 resolve, 6/6 move |
| No light spill survives | **Verified** — element, CSS, custom props, source and bundle all clean |
| Hero title clear of the object at 375 / 768 / 1440 | **Verified** — 18.20:1, zero object pixels behind it |
| Bundle dropped | **Verified but small** — JS −9,933 B; total shipped −5,486 B |
| PBR machinery left the bundle | **False** — three.js still ships it; see §8 |
| Live scroll drives the timeline | **Not verified** — host fires no scroll events (see above) |
| Reduced-motion path | **Not verified** — no way to toggle the media query here |

## 1. Build and serve

`npm run build` succeeded: 78 modules transformed.

```
dist/index.html                  3.89 kB   gzip  1.73 kB
dist/assets/index-SpxIeYYa.css  14.18 kB   gzip  3.78 kB
dist/assets/index-BFzzgGKp.js  600.45 kB   gzip 158.39 kB
```

`vite preview` on :4173. The first page load served a **stale bundle** (`index-C2Ag_LhL.js`); a
hard reload was required before any measurement, and every figure below was taken against
`index-BFzzgGKp.js`. `dist/` is gitignored, so building leaves the tree clean.

Test suite: **268 tests across 19 files, all passing.**

## 2. The object is unlit and drawn in lines

Traversed `stage.tilt`. **Eight distinct materials, and nothing else:**

| material | type | colour | `transparent` |
|---|---|---|---|
| cup fill | `MeshBasicMaterial` | `#0c0a12` | true (`DoubleSide`) |
| hub fill | `MeshBasicMaterial` | `#08070c` | true |
| bearing fill | `MeshBasicMaterial` | `#14131a` | true |
| gasket fill | `MeshBasicMaterial` | `#cf2f2a` | true |
| cup edge | `LineBasicMaterial` | `#efeaf8` | true |
| hub edge | `LineBasicMaterial` | `#b9b4c6` | true |
| bearing edge | `LineBasicMaterial` | `#f2f4f8` | true |
| gasket edge | `LineBasicMaterial` | `#ff6a62` | true |

`transmission`, `clearcoat`, `roughness` and `metalness` are **`undefined` on every one of the
eight**. `scene.environment` is `null`, `scene.background` is `null`, the scene contains **0
lights**, and `renderer.toneMapping === 0` (`NoToneMapping`).

> **A note on the `envMap` check.** The obvious probe — `['envMap', …].filter(p => m[p] !== undefined)`
> — reports `['envMap']` for all four fills and so appears to fail. It does not: three.js declares
> `envMap` as an own property of `MeshBasicMaterial`, initialised to `null`. The measured **value**
> is `null` on all four. The predicate is wrong, not the object. Recorded because a future run will
> otherwise re-discover this as a false alarm.

### Edge lines, measured

`geometry.attributes.position.count / 2` on each part's `LineSegments`:

| part | edge lines | triangles |
|---|---|---|
| cupTop | **204** | 192 |
| cupBottom | **204** | 192 |
| axleBearing | **132** | 168 |
| gasketTop | **72** | 96 |
| gasketBottom | **72** | 96 |
| hubConeTop | **48** | 48 |
| hubConeBottom | **48** | 48 |
| **total** | **780** | **840** |

Per-part range **48–204**, total **780** — exactly what the plan predicted, now measured rather
than asserted. Seven `LineSegments`, one per part.

## 3. The rooms, and whether the explosion is contained

Sampled by seeking the real timeline (`duration` 1000). **Synthetic — frozen frames.**
Rest height for `cupTop` is 0.235; fully exploded is 1.650.

| f | room boundary | cupTop | tiltX | objX | camZ | spin | labels | opacity |
|---|---|---|---|---|---|---|---|---|
| 0.00 | start | **0.235** | −1.5708 | 0.88 | 6.2 | 1.0 | 0 | 1 |
| 0.12 | hero end | **0.235** | −0.42 | 0.88 | 6.2 | 1.0 | 0 | 1 |
| 0.30 | panel end | **0.235** | −0.42 | 0.88 | 6.2 | 1.0 | 0 | 1 |
| 0.55 | showcase end | **1.650** | 0 | 0.80 | 10 | 0.5 | 1 | 1 |
| 1.00 | grid end | **0.235** | 0 | 0 | 7 | 1.6 | 0 | 0 |

`cupTop` sits at rest at 0.12, 0.30 and 1.0 and at its exploded height only at 0.55.
`camera.position.x` is 0 at every sample — there is no orbit room. Every row differs from its
neighbour.

### Containment, by dense sampling rather than endpoints

502 samples across the whole timeline. `cupTop` departs rest at **f = 0.3054** — the first
sample past rest on this 502-point grid; `src/scroll/choreography.js`, `README.md` and
`tests/choreography.dom.test.js` cite **f = 0.3014** for the same departure, resolved off a
finer grid. Both describe one tween, not two measurements that disagree. It returns at
**f = 0.992**.

So the explosion *starts* inside the showcase room, but the **reassembly tween spans the entire grid
room**, not the showcase. What keeps this from showing is opacity, not position:

- `state.objectOpacity` reaches 0 at **f = 0.59498** (predicted 0.55 + 0.45 × `OPACITY_SETTLE` = 0.595).
- `tilt.position.x` reaches 0 at **f = 0.64893** (predicted 0.55 + 0.45 × `LATERAL_SETTLE` = 0.649).

The fade therefore completes with the object still **42.9% of the way** from x = 0.80 to centre —
it is gone before it arrives under a centred column, which is what `OPACITY_SETTLE` exists to do,
and it is confirmed here rather than assumed.

There is a window, **f ∈ [0.55, 0.595]** — about **54vh of scroll** — in which the object is still
**97.5–100% exploded and visible**, fading 1 → 0 while sliding from x = 0.80 to x = 0.457. After
f = 0.595 the object is invisible for the remaining 40% of the page, so the reassembly that
continues to f = 0.992 is never seen. Reported as **qualified** rather than verified: the exploded
*target state* is confined to the showcase room, the *tween out of it* is not.

### Labels

`labelOpacity` also runs the full grid room (0.9698 at f = 0.60, 0.117 at f = 0.90). The label layer
multiplies it by `objectOpacity`, so the measured DOM opacity is **0 from f = 0.595 onward** —
verified directly on the element, not inferred. `pointerEvents` flips to `none` at the same point.
Annotations cannot outlive the thing they annotate.

Label sprites are parented **`labelRoot < diaboloTilt < Scene`** — under the tilt, never under
`diaboloSpinner`, whose children are exactly the seven part groups. The orbiting-label defect has
not returned.

### Camera

All four rooms' `camZ` ∈ [6.2, 10], the near/far bounds. Frustum fit measured by projecting every
part's bounding-box corners at f = 0.55 (fully exploded, camZ 10, aspect 1.333):

```
NDC x   [-0.055, 0.493]
NDC y   [-0.914, 0.910]      margin 0.0864 (8.6% of half-height)
world span 5.02 units        visible height at camZ 10: 6.115
```

It fits, with real margin, measured by projection rather than by trigonometry on paper.

## 4. The panel actually covers the object

The panel is the `<section id="about">` itself, and the coverage is a CSS-paint-order fact:

- `background-color: rgb(198, 118, 255)` — **fully opaque**, `opacity: 1`, `mix-blend-mode: normal`,
  no `filter`, no `backdrop-filter`, no `transform`. **No ancestor** (`#content`, `body`, `html`)
  has `opacity < 1` or any filter or blend.
- `#content` is `position: relative; z-index: 1`; `#stage` is `position: sticky; z-index: 0`. The
  content column paints above the canvas.
- `#about`'s border-box **covers the entire viewport** from progress 0.12 to ≈ 0.217 (at 1024×768
  it spans document Y 1106 → 2765, i.e. 216vh).
- The object is genuinely *there* to be covered: a framebuffer `readPixels` at the object's
  projected screen point returned **`[20, 19, 26, 255]`** — `#14131a`, the bearing fill, at full
  alpha.

> **Method note, because it nearly produced a tautology.** `#stage` carries `pointer-events: none`
> (stage.css), so `document.elementFromPoint` can **never** return the canvas at desktop widths —
> "the hit is not the canvas" is true by construction and proves nothing. That probe was run,
> recognised as vacuous, and **discarded**. The coverage claim rests on the opacity / geometry /
> stacking facts above.

From progress ≈ 0.217 the panel's bottom edge rises above the viewport bottom and the (transparent)
events section below it progressively re-exposes the stage. That is the designed handover into the
showcase room, not light leaking through the sheet.

## 5. The nav

Six links: the wordmark, four pills, and the CTA. **All six resolve to a real `<section>`**, with
no duplicate targets:

| link | href | target exists | `data-room` | click moved scroll |
|---|---|---|---|---|
| VIOLET DIABOLO | `#hero` | yes | hero | yes (5000 → 0) |
| About | `#about` | yes | panel | yes (0 → 1052) |
| Events | `#events` | yes | showcase | yes (0 → 2711) |
| Media | `#media` | yes | grid | yes (0 → 5015) |
| Board | `#board` | yes | grid | yes (0 → 7780) |
| Join us | `#contact` | yes | grid | yes (0 → 8932) |

The nav is `position: fixed; z-index: 3`, measured 54px tall; every target carries
`scroll-margin-top: 53.76px`, and each click lands its section's top at exactly `y = 54` — clear of
the bar rather than under it.

## 6. No spill survives

- `document.querySelector('.light-spill')` → `null`; **0** elements with any class containing "spill".
- **0 of 117** enumerable CSS rules mention `spill`. (One cross-origin Google Fonts sheet cannot be
  enumerated; it cannot contain application rules.)
- `--spill-x`, `--spill-y`, `--spill`, `--spill-opacity` all resolve to the empty string on `:root`.
- `grep -rni spill` over `src/`, `index.html` and the built `dist/` JS, CSS and HTML: **no matches**.
- Git confirms the deletion in `98f9157`: `src/diabolo/spill.js`, `tests/spill.dom.test.js` and
  `tests/stage-spill.dom.test.js` are all gone.

## 7. Appearance, contrast, responsiveness, links

### What the framebuffer actually contains

`readPixels` over the whole drawing buffer at 1440×900, progress 0 — **249,850 sampled opaque
pixels, 19.28% of the canvas**:

| colour | share of object | is |
|---|---|---|
| `#0c0a12` | 95.55% | cup fill |
| `#14131a` | 0.52% | bearing fill |
| `#cf2f2a` | 0.43% | gasket — the one colour in the object |
| `#08070c` | 0.20% | hub fill |

The remainder is antialiased edge blending. The bright edges do reach the framebuffer at their
exact authored values — `#efeaf8` (144 px) and `#f2f4f8` (20 px) — but only **0.08%** of object
pixels exceed luminance 0.5, because the wireframe is 1px and heavily antialiased at DPR 2. Dark
body, bright edges, one red accent: confirmed against live pixels.

### Contrast, measured against live canvas pixels

The backdrop for each run of text was resolved by paint order: an opaque background on an ancestor
*inside* `#content` covers the canvas; otherwise the canvas pixel, composited over the page ground,
is the backdrop.

| | 375×812 | 768×1024 | 1440×900 |
|---|---|---|---|
| `#hero h1` | **18.20:1** | **18.20:1** | **18.20:1** |
| hero tagline | 8.22:1 | 8.22:1 | 8.22:1 |
| `.teaser-when` | 16.63:1 | 16.63:1 | 16.63:1 |
| `.teaser-where` | 7.51:1 | 7.51:1 | 7.51:1 |

72 samples per element per width. **Zero object pixels fall behind the hero title at any width.**

That "zero" is only meaningful with a negative control, so here it is: the object is
simultaneously occupying **19.28%** of the canvas at 1440, **28.19%** at 768 and **26.70%** of the
band at 375, with a screen bounding box disjoint from the title's — at 1440 the object spans
x 685–1261 while the title spans x 72–552, a 133px gap. The readback is not returning an empty
buffer.

Per-room overlap of the object's pixel bounding box against the reading column, at each room's
midpoint (1440×900): hero **no overlap**, showcase **no overlap**, grid **no object at all**
(opacity 0, 0 pixels). The panel room's boxes do overlap by 25px — but that is underneath an
opaque violet sheet, so it is a canvas-space overlap and not a visible collision.

### Responsiveness

| | 375×812 | 768×1024 | 1440×900 |
|---|---|---|---|
| `#stage` z-index | **2** (above content) | 0 | 0 |
| `#stage` height | 324.8px (40dvh) | full | full |
| `#stage` background | opaque `#08060d` | transparent | transparent |
| `#content` margin-top | **0px** | −100dvh | −100dvh |
| horizontal overflow | none | none | none |

The narrow-screen recipe is live and correct: the object gets a 40dvh band, the reading column
scrolls under it, and the `-100dvh` pull-up is cancelled — measured `0px`, the specific bug
stage.css's comment warns about. Page length is 13.0 screens at desktop widths and 13.4 at 375.

### Links and images

- **7** in-page links, all resolving. **1** mailto. **5** external, every one `target="_blank"`
  with `rel="noreferrer"` — **0** missing `noopener`/`noreferrer`.
- All 4 images fetch **200** and decode at 800×800. Two board portraits appeared unloaded until
  forced: `loading="lazy"`'s IntersectionObserver never fires while `document.hidden`, and setting
  `loading = 'eager'` loaded both immediately. **Environment artifact, not a product defect.**
- **0 console messages** of any level across the session.

## 8. Bundle size

Both builds run from the same `node_modules`. The baseline is `main` (`fc42907`), which is the
branch's merge-base and is a docs-only commit, so it is the true pre-branch code.

| | main `fc42907` | branch `79aee1c` | Δ |
|---|---|---|---|
| JS raw | 610,389 B | **600,456 B** | **−9,933 B (−1.63%)** |
| JS gzip | 158,190 B | **156,170 B** | −2,020 B (−1.28%) |
| CSS raw | 9,733 B | **14,180 B** | **+4,447 B (+45.7%)** |
| CSS gzip | 2,932 B | 3,782 B | +850 B (+29.0%) |
| **total raw** | 620,122 B | **614,636 B** | **−5,486 B (−0.88%)** |
| **total gzip** | 161,122 B | 159,952 B | −1,170 B (−0.73%) |

**The JS bundle did drop — but far less than "deleting the PBR path" suggests, and the PBR
machinery has not left.** Token occurrences in the minified JS, branch vs main:

| token | main | branch |
|---|---|---|
| `RoomEnvironment` | 1 | **0** |
| `MeshPhysicalMaterial` | 5 | 3 |
| `MeshStandardMaterial` | 14 | 12 |
| `envMap` | 154 | 131 |
| `transmission` | 103 | 88 |
| `clearcoat` | 201 | 176 |
| `roughness` | 136 | 126 |

Only `RoomEnvironment` — a separately tree-shakeable addon — actually left. three.js ships
`MeshStandardMaterial`, `MeshPhysicalMaterial` and their shader chunks regardless of which
materials the application instantiates, so the shader cost stays whether or not the object is lit.
`PMREMGenerator` reads 0 in **both** minified bundles because the class name is mangled; that count
is not evidence either way, and the baseline source does import it.

Net: the page ships **5.5 kB less** than before the branch, because a ~10 kB JS saving is partly
spent on 4.4 kB of new CSS for the four room patterns.

## 9. Defects found

Neither is merge-blocking. Both are of the exact species this project keeps shipping — a comment
asserting a number nobody measured.

**D1 — `src/styles/sections.css:102`, false parenthetical.**
The comment reads "the grid room's own beat (reassemble, spin, fade) is over by progress 0.595".
Measured: only the **fade** ends there (0.59498). **Reassembly** runs to f = 1.00 — `cupTop` is
still 11.7% exploded at f = 0.90 — and **`spinRate`** reaches its target 1.6 only at f = 1.00.
The comment's *conclusion* ("everything after that is reading, not object") is nonetheless true,
because `objectOpacity` is 0 from 0.595 on. Impact: documentation only.

**D2 — `src/styles/sections.css:445–447`, wrong measured figures.**
The comment reads "the first card becomes visible at 725vh, 11vh after the fade completes."
Measured **735.3vh at 1440×900** and **735.6vh at 1024×768** — i.e. **21.3–21.6vh** after the
714vh fade, not 11. The 725 figure is `660 + 165 − 100` and omits `.room`'s own `padding-top`
(81px ≈ 9vh at 900). The error is in the **safe** direction: there is roughly twice the documented
clearance. The guarding test, `tests/sections-layout.dom.test.js:172`, explicitly and correctly
states that it ignores the padding "which only ever makes this stricter", so the test is sound —
it is only the prose that overstates its own precision. Impact: documentation only.

## 10. Outstanding for a human on a real machine

What this run could **not** verify, and why:

1. **Live scroll-driven scrubbing.** Measured directly: 0 `scroll` events while `scrollY` moved
   0 → 3871, 0 rAF callbacks in 1500 ms, `timeline.currentTime` frozen at 0 where a live scrub
   would read 420. The binding of the timeline to `#content` is covered only by unit tests. **This
   is the single largest gap, and it is unchanged from the previous record.**
2. **Any motion over time.** The entrance never played; it was completed via `entrance.skip()` —
   the application's own seam, which calls the same `onComplete` that attaches the scroll timeline.
   Every room state in §3 is a seeked frozen frame.
3. **Anything requiring the compositor.** The screenshot pipeline returned a stale frame that
   contradicted geometry, so no claim here rests on a rendered image. In particular, the panel's
   coverage is established by opacity, geometry and stacking order — **not** by looking at it.
4. **The `prefers-reduced-motion` path.** `main.js`'s static branch, `applySectionSides({ staticAt })`,
   and the `labelOpacity = 1` still frame are untested here; the media query cannot be toggled in
   this host.
5. **The unsupported-WebGL path.** Not exercised *in this run* — WebGL was available throughout.
   It has since been exercised separately, at 1440x900, by denying `getContext('webgl'|'webgl2')`
   before the bundle boots and measuring the resulting layout: `html[data-stage="unsupported"]`,
   the canvas hidden, the fallback SVG shown at x 549.3-890.7 with its drawn ink at 583.5-856.5,
   and the reading column at x 72-552 — a 31.5px gap. Geometry only, from the same
   `getBoundingClientRect` / `getBBox` instruments as the rest of this document; still no
   rendered image, and still no real browser without WebGL. See
   `.superpowers/sdd/final-fixes-report.md`, finding I1.
6. **Real mobile devices.** 375×812 was viewport emulation only — no real touch input, no real
   device pixel pipeline.
7. **Lazy-loading in a visible tab.** Confirmed broken *only* by `document.hidden`; normal
   behaviour is inferred from the files fetching 200 and decoding, not observed.
8. **Cross-browser.** Chromium only. No Safari or Firefox.
9. **Font rendering.** Google Fonts stylesheets load, but glyph rendering and fallback behaviour
   were not inspected.
