# Real-condition verification record — animated violet gradient, panels over it

What this is: a record of what was actually **measured** on branch `build/gradient-panels`, in a
real browser against the real built bundle, on a named GPU. It replaces the record for the 3D
diabolo object, which this branch deleted.

Everything here was measured in one run. **No figure is carried forward from an earlier task
without being re-measured**, and where a re-measurement moved a previously published number, both
are printed. Where the environment could not produce a condition, the stand-in is named and
labelled, and §10 lists every claim this run could **not** establish.

Two committed probes did most of the work. Neither is part of the build; neither is a CI gate.
Both need the **dev** server, because `check-contrast.html` imports `src/gradient/contrast.js`,
which the build deliberately excludes.

```
npm run dev
  http://localhost:5173/scripts/check-shader.html      ?draws= ?size= ?steps=
  http://localhost:5173/scripts/check-contrast.html    ?width= ?height= ?steps=
```

## Environment

| | |
|---|---|
| Host | macOS (darwin 25.6.0), Chromium |
| GPU | **`ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`** |
| Vendor | `Google Inc. (Apple)` — unmasked via `WEBGL_debug_renderer_info` |
| Context | `WebGL 2.0 (OpenGL ES 3.0 Chromium)` / `WebGL GLSL ES 3.00` |
| Live page | `vite preview`, port 4173 — the shipped bundle |
| Unit suite | `npx vitest run` → **17 files, 239 tests, all passing**, and with no stderr noise (was 216 at merge; §11–§14 added 23) |

Three properties of this host shaped how the live-page checks were run, and each is restated where
it matters:

1. **`document.hidden` is `true`** here, measured directly. The render loop therefore never starts
   on its own — which is exactly how a "the loop stops when hidden" check passes for the wrong
   reason. See §4.
2. **`requestAnimationFrame` and `IntersectionObserver` deliver nothing until a paint is forced.**
   Measured: 0 rAF callbacks across six 700 ms attempts; 0 IntersectionObserver entries in 4 s.
   Forcing the compositor to produce a frame delivers both.
3. **Screenshots can return stale frames.** No claim below rests on one. Screenshots were used as a
   *paint trigger*; the single place one is cited as evidence (§6) it agrees with the computed style
   and geometry rather than standing in for them.

---

## Summary

| Claim | Status |
|---|---|
| Three.js absent from `package.json` and from the built bundle | **Verified** — the only "three" in the bundle is the English word, in two GLSL comments |
| Bundle shrank from 600 kB | **Verified; baseline rebuilt from the merge base** — 600,476 B → **38,565 B** raw, −93.6 % |
| `contrast.js` never ships | **Verified** — no `worstCase` / `TIME_STEPS` / `0.03928` / `12.92` in `dist/` |
| Nothing uses `position: sticky` | **Verified** — 0 in source, 0 in built CSS, 0 computed across 145 live elements |
| The about panel scrolls immediately; no heading pins | **Verified** — residual **0 px** from pure scroll at 10 sampled offsets |
| Shader compiles and links | **Verified** — vertex, fragment and link OK, empty driver logs |
| Frame cost inside the 4 ms budget | **Verified for the SHADER, with a zero-render control** — **0.01253 ms/frame**, control **0.0000**. The `backdrop-filter` layers over it are a separate cost: measured at §3.1, unresolved below this host's vsync ceiling |
| Most of the frame stays near-black | **Verified** — **85.43 %** of the *worst* frame under L 0.02 |
| The render loop stops when the document hides | **Verified, and proved to have been running first** |
| Reduced motion renders one frame and installs nothing | **Verified against a labelled JS-level stand-in** |
| No-WebGL fallback renders the whole page | **Verified against a labelled `getContext` patch** — `data-stage="unsupported"`, 7/7 sections, static gradient painted |
| 26 text blocks clear WCAG over the moving gradient | **Verified at 375 / 768 / 1440** — **26/26**, tightest margin **1.166×** |
| `scrollWidth === clientWidth` | **Verified at 320 / 375 / 768 / 1440**, and at **320 / 375 / 280 with a 32 px root** |
| Nav pills never overflow; the bar never covers a heading | **Verified** — 0 pills outside the viewport at any width |
| Every nav anchor resolves and moves the scroll | **Verified** — 6/6 resolve, 6/6 move |
| Four `data-panel` values and both `data-surface` values in use | **Verified** |
| Page is 6–8 screens | **Qualified** — 7.37 at 1440×900; **8.31 / 8.64 / 9.05** at 375×812 / 320×812 / 768×1024 |
| Lenis costs ~5.4 kB gzipped | **Corrected** — re-measured at **5,050 B ≈ 4.93 kB** |
| Real reduced-motion, real tab visibility, real WebGL-less browser, real scroll input | **Not verified** — §10 |
| `README.md` describes the shipped site | **Rewritten, and re-checked against the tree** — 73 automated assertions over paths, per-file test counts, byte sizes, palette values and the panel/surface map. See F4. |

---

## 1. Bundle and dependencies

`grep -c three package.json` → **0**.

| | raw | gzip |
|---|---|---|
| `dist/assets/index-CsTE_hkR.js` | **38,565 B** | 13,485 B |
| `dist/assets/index-9lyFq0Rz.css` | 13,174 B | 3,627 B |
| `dist/index.html` | 1,605 B | 876 B |

Re-measured after the review fixes. The JS was **38,522 B** (`index-DTqm9uPc.js`) when the nine
steps below were run; the guard added to `src/ui/reveal.js` and the conditional removed from
`src/main.js` move it by **+43 B**, and the hash with it. The CSS is byte-identical and keeps its
hash: none of the fixes touched a stylesheet.

**The 600 kB baseline was rebuilt, not quoted.** Commit `19e4131` — the merge base with `main`,
where `package.json` still listed `"three": "^0.186.0"` — was checked out into a throwaway worktree
and built with the same Vite.

| | before | after | change |
|---|---|---|---|
| JS raw | 600,476 B | 38,565 B | **−561,911 B (−93.6 %)** |
| JS gzip | 156,758 B | 13,485 B | −143,273 B (−91.4 %) |
| CSS raw | 14,275 B | 13,174 B | −1,101 B |
| `index.html` raw | 4,656 B | 1,605 B | −3,051 B |
| **total shipped, raw** | **619,407 B** | **53,344 B** | **−566,063 B (−91.4 %)** |

The string `three` occurs exactly twice in the shipped JS, both times as the English word inside
GLSL comments carried over from `src/gradient/shader.js`. No `THREE`, no `WebGLRenderer`, no
`PerspectiveCamera`.

**A nuance the old record did not carry.** `three@0.186.0` is still present in `node_modules` and in
`package-lock.json`, but **not** as a dependency of this project: `npm ls three` reports
`violet-diabolo → animejs@4.5.0 → three@0.186.0`, and the lockfile entry is marked
`"optional": true, "peer": true`. animejs declares a `three` adapter as an optional peer and npm
installs optional peers by default. Nothing imports it; nothing ships it.

`contrast.js` is confirmed absent from the bundle — `worstCase`, `TIME_STEPS`, `relativeLuminance`,
`contrastRatio`, `0.03928` and `12.92` all miss on a substring scan of the built JS. The two probe
pages under `scripts/` do not reach `dist/` either.

**Lenis's cost, re-measured.** HEAD was rebuilt in a second throwaway worktree with the `lenis`
import replaced by a no-op class:

| | raw | gzip |
|---|---|---|
| shipped | 38,522 B | 13,464 B |
| Lenis stubbed | 19,982 B | 8,414 B |
| **Lenis's share** | **18,540 B** | **5,050 B ≈ 4.93 kB** |

Previously published as "~5.4 kB gzipped". **The figure moves down to ≈ 4.93 kB.**

---

## 2. Nothing sticks

`grep -rni sticky src dist index.html` finds one hit in the whole tree — prose inside a comment in
`src/ui/sections.js:24`, describing the layout this branch replaced. No `position: sticky` in
`base.css`, `sections.css`, or the built CSS.

On the live page at 1440×900 (145 elements): **0** computed `position: sticky`. Exactly two computed
`position: fixed`, both deliberate — `nav.site-nav` and `canvas#gradient`.

**The about panel scrolls immediately.** `#about` sits at document top 981 px; its viewport top was
read at ten offsets across the whole range where a pinned panel would hold still:

| scrollY | 0 | 200 | 400 | 600 | 800 | 900 | 1000 | 1200 | 1600 | 2000 |
|---|---|---|---|---|---|---|---|---|---|---|
| `#about` top | 981 | 781 | 581 | 381 | 181 | 81 | −19 | −219 | −619 | −1019 |
| `#about h2` top | 1264 | 1064 | 864 | 664 | 464 | 364 | 264 | 64 | −336 | −736 |
| residual | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

`residual = top − (documentTop − scrollY)`. **Max |residual| = 0 px** — the panel and its heading
move one-for-one with the scroll offset at every sample.

---

## 3. Frame cost, and how dark the frame stays

`scripts/check-shader.html?size=1440x900&steps=12`, against the real shader exports.
**Vertex compile OK, fragment compile OK, program link OK**, all three driver logs empty.

### Cost, with its control

| | |
|---|---|
| method | `EXT_disjoint_timer_query_webgl2` |
| size / draws | 1440 × 900, 240 draws per pass, 3 passes |
| busy pass total | **3.0066 ms** |
| **zero-render control total** | **0.000 ms** — identical loop, no `drawArrays` |
| **ms / frame** | **0.01253** |
| control / frame | **0.0000** |
| budget | 4.0 ms → **0.31 % of budget** |

The control exists because an earlier measurement on this branch reported 0.0002 ms/frame, which
was the cost of *queueing* a draw call. `gl.finish()` does not block the JS thread in this browser,
so 200 finishes with zero renders cost the same as 200 renders. The control is the floor of what the
measurement can see, and it is printed beside the result rather than assumed away.

A second check that the number is real: cost scales with pixels and with draws, which queueing
overhead would not.

| size | draws | busy total | ms/frame |
|---|---|---|---|
| 720 × 450 | 240 | 0.652 ms | 0.00272 |
| **1440 × 900** | **240** | **3.007 ms** | **0.01253** |
| 1440 × 900 | 480 | 6.996 ms | 0.01457 |
| 2880 × 1800 | 240 | 4.709 ms | 0.01962 |

Previously published: 0.0122 ms/frame. **Re-measured at 0.01253** — same order, slightly up.

### 3.1 What that figure does NOT include: the `backdrop-filter` over the canvas

The 0.01253 ms above is the **shader's `drawArrays` into a bare canvas**, measured by the bench
page. It was a true figure when it was taken and it is still a true figure about the shader — but it
was taken before the panels existed, and the panels put two full-viewport
`backdrop-filter: blur(22px) saturate(1.15)` layers (`src/styles/sections.css`) directly over that
canvas. The canvas repaints every frame, so the blur behind those panels **cannot be cached between
frames**. Reading "0.31 % of budget" as "the background costs nothing" is therefore a step further
than the measurement goes, and nothing in this record previously said so.

**The geometry, measured live** (`getBoundingClientRect` on every element whose computed
`backdrop-filter` is not `none`; exactly two match, `#about` and `#events`):

| viewport | filtered panels | each | total blurred area | **max on screen at once** |
|---|---|---|---|---|
| 1024 × 768 | `#about`, `#events` | 1024 × 768 each | **2.00 viewports** | **0.996 viewports**, at `scrollY` 840 |
| 375 × 812 | `#about`, `#events` | 375 × 756, 375 × 568 | **1.63 viewports** | **0.932 viewports**, at `scrollY` 600 |

Two corrections to the shape of the concern fall out of that. The **2×** figure is a document total,
not a simultaneous one: the 81 px `--panel-gap` means the two panels can never both be fully on
screen, so the compositor is never asked for more than **one** viewport of blurred backdrop at any
scroll position. And at phone width it is less again — the narrow breakpoint drops
`min-height: 100dvh` to `min-height: 0`, so the panels are 756 px and 568 px tall against an 812 px
viewport.

**The cost, as far as this host can resolve it.** `document.hidden` was redefined to `false` and
`visibilitychange` dispatched (the §4 technique), so the real `createLifecycle` loop ran against the
real shader; the viewport was parked on `#about` with 92 % of the screen blurred; rAF intervals were
sampled for 3 s per condition, A/B/A/B, toggling only `backdrop-filter: none` on
`[data-surface='glass']`:

| condition | frames / 3 s | fps | median | p95 | frames > 20 ms |
|---|---|---|---|---|---|
| `blur(22px) saturate(1.15)` | 179 | 59.67 | 16.7 ms | 18.0 ms | **0** |
| `backdrop-filter: none` | 179 | 59.67 | 16.7 ms | 18.7 ms | **0** |
| `blur(22px) saturate(1.15)` (repeat) | 179 | 59.67 | 16.7 ms | 18.6 ms | **0** |
| `backdrop-filter: none` (repeat) | 179 | 59.67 | 16.7 ms | 18.6 ms | **0** |

**Indistinguishable — and that is a ceiling, not a cost.** The display is vsync-locked at 60 Hz and
both conditions finish inside 16.7 ms with room to spare, so this says the shipped configuration has
headroom on this machine; it cannot say how much.

**So the headroom was measured instead**, by stacking additional full-viewport
`blur(22px) saturate(1.15)` layers over the same live canvas until frames actually dropped:

| extra full-viewport blur layers | 0 | 1 | 2 | 4 | 8 | 16 | 32 | **64** |
|---|---|---|---|---|---|---|---|---|
| fps | 59.5 | 59.5 | 59.5 | 59.5 | 59.5 | 59.5 | 59.5 | **15.5** |
| median frame | 16.7 ms | 16.7 | 16.7 | 16.7 | 16.7 | 16.7 | 16.7 | **66.6 ms** |
| frames > 20 ms (of ~119) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **31** |

**33× the shipped on-screen blurred area still holds a locked 60 fps with zero late frames**; the
first dropped frame is somewhere between 33× and 65×. Two honest caveats on that number: stacked
filters each sample the composite beneath them, so the load does not scale like one larger area, and
the shape of the 32 → 64 result is a cliff rather than a ramp, which looks more like a render-surface
limit than the linear part of the cost curve. It is a headroom figure, not a cost curve.

**What is still not established: a mid-range phone.** Every figure above is Chromium on an Apple M4,
which is the machine the rest of this document was measured on and is not the machine the concern is
about. See §10.11.

### Darkness

15,552,000 pixels over 12 time steps at 1440×900.

| | |
|---|---|
| mean luminance | 0.01005 |
| median | 0.00214 |
| p75 / p90 / p99 | 0.00461 / 0.02320 / 0.11750 |
| max | 0.12930, at `rgb(127, 36, 254)` |
| **under L 0.02, per time step** | **85.43 % … 93.24 %** (worst: step 5) |
| under L 0.02, pooled | 89.17 % |
| under L 0.01, per step | 80.44 % … 88.05 % |
| `--ink` on the brightest pixel in the run | **5.29:1** |

Reported per step, not pooled: a 99 %-dark frame and a 60 %-dark frame pool to a passing 89.5 % with
the 60 % frame invisible. The constraint is about every frame, so the minimum is the number.
Previously published: 89.17 % pooled, worst step 85.43 %. **Both reproduce exactly.**

---

## 4. The loop actually stops — and it was running first

This is the check that passes for the wrong reason if nobody looks.

**The trap, measured.** On the freshly loaded live page: `document.hidden` is **`true`**,
`lifecycle.isRunning()` is **`false`**, `lifecycle.frameCount()` is **`0`**. `createLifecycle`'s
`active()` is `visible && !doc.hidden`, and both halves fail here. Asserting "it stops" against that
state reports a pass on a loop that never started.

**Getting it to run.** Two blockers, both from the host:

- `document.hidden` cannot be switched by any control this host exposes, so it was **redefined to
  `false`** and `visibilitychange` dispatched — the same two inputs the application keys on.
- `visible` comes from an `IntersectionObserver` on the canvas, which delivered **0 entries in 4 s**;
  a free rAF pump got **0 callbacks across six 700 ms attempts**. Both are steps of "update the
  rendering", which this host does not reach unless a paint is forced. Forcing one delivers both,
  at roughly one frame per forced paint.

**Proof it was advancing**, then the assertion:

| phase | `frameCount()` | `isRunning()` | `document.hidden` |
|---|---|---|---|
| visible, start | **75** | true | false |
| visible, after 4 forced paints | **79** | true | false |
| immediately after `visibilitychange`, hidden = true | 79 | **false** | true |
| after 4 more forced paints + 500 ms | **79** | **false** | true |

`isRunning()` flips to `false` **synchronously inside the handler** — the pending frame is cancelled,
not left to fire. `frameCount()` then holds at **79** across four further forced paints, each of
which had just been shown to drive a frame while visible. **`advanced = 0`: no no-op frame is
scheduled.**

**What this does not establish:** `document.hidden` here is a redefined own-property, not the
browser's own visibility state. The application's reaction is genuinely exercised; the browser's own
rAF suppression in a truly hidden tab is not, and is not the application's to guarantee.

---

## 5. Reduced motion

**No control in this host emulates `prefers-reduced-motion`.** The **shipped bundle** was booted
inside a same-origin `srcdoc` iframe behind a pre-script that overrides `window.matchMedia` to
report `matches: true` for `(prefers-reduced-motion: reduce)` and delegates everything else, and
that instruments `drawArrays`, `addEventListener` and `requestAnimationFrame` before boot.

**This is a JS-level stand-in.** The browser's own media state is unchanged, so CSS's
`@media (prefers-reduced-motion: no-preference)` block in `base.css` was **not** switched off by it.
What follows verifies `main.js`'s branch, not the stylesheet's.

| check | result |
|---|---|
| `matchMedia('(prefers-reduced-motion: reduce)').matches` | `true` |
| `drawArrays` calls | **1** — exactly one frame rendered |
| `requestAnimationFrame` requests | **0** — no loop was ever scheduled |
| `window.__vd` | **`undefined`** — no lifecycle, no Lenis, nothing constructed |
| wheel / mousewheel / touchstart / touchmove / scroll listeners | **none, anywhere** |
| every listener type registered (14 registrations) | `change`, `click`, `resize` |
| `[data-section]` rendered | 7 |

`main.js` returns before it assigns `window.__vd` on this path, so `window.__vd.smooth` is
`undefined.smooth` rather than `null` — the outcome is stronger than "a disabled instance": nothing
is constructed at all.

**The reduced-motion resize repaint, verified live.** `gradient.resize()` reassigns
`canvas.width/height`, which clears the WebGL drawing buffer; with no loop to draw a next frame, a
bare re-fit would leave the canvas permanently transparent after the first resize. Dispatching a
`resize` took `drawArrays` from **1 → 2**, re-sized the framebuffer 1440×900 → 900×700, and
`gl.readPixels` at the framebuffer centre returned **`rgba(101, 31, 199, 255)`** — opaque, not the
transparent buffer the bug produced. `requestAnimationFrame` count still **0**.

---

## 6. No WebGL

Same harness, same shipped bundle; the pre-script sets
`HTMLCanvasElement.prototype.getContext = () => null` before the module runs. Confirmed in-frame:
`document.createElement('canvas').getContext('webgl')` returns `null`.

| check | result |
|---|---|
| `document.documentElement.dataset.stage` | **`"unsupported"`** |
| `window.__vd` | `undefined` — no gradient, no lifecycle, no Lenis |
| `[data-section]` rendered | **7** |
| heights (px) | hero 900, about 900, events 900, media 1533, board 1082, contact 453, footer 360 |
| text under `#content` | **2,430 characters** |
| images under `#content` | 4 |
| document height | 6,613 px (vs 6,635 px with WebGL — the same page) |
| nav links | 6: `#hero #about #events #media #board #contact` |

**The static fallback gradient is painted.** `#gradient` computes
`background-image: linear-gradient(126deg, rgb(8,6,13) 0%, rgb(8,6,13) 34%, rgb(41,30,82) 46%,
rgb(128,36,254) 52%, …)` — the `:root[data-stage=unsupported] #gradient` rule — at
`position: fixed`, `z-index: 0`, `display: block`, `opacity: 1`, `visibility: visible`, box
1440 × 900. `#content` sits above it at `z-index: 1` with a fully transparent background, and the
six inter-panel gaps are **81 px** each, so the fallback is genuinely exposed rather than covered.
A screenshot taken at that moment shows the diagonal violet beam behind the hero, agreeing with the
computed style and geometry — the only place in this document a rendered image is cited at all.

---

## 7. Worst-case contrast over a background that moves

`scripts/check-contrast.html`, run at three viewports. It imports the real `worstCase`,
`contrastRatio`, `relativeLuminance` and `TIME_STEPS`, the real `PALETTE`, and the real shader;
every colour, size, weight and surface chain is read with `getComputedStyle` off the live page.
**26 selectors, 0 matched nothing** at any width.

**Two columns, because they answer different questions.**

- **measured** — the brightest gradient pixel inside the block's own viewport band at its resting
  scroll position, per time step, composited through the block's surface chain, minimised by
  `worstCase()`. What the page reaches in this run. A sample, not a guarantee.
- **bound** — the same chain composited over each of the gradient's three arithmetic extremes
  (`deep` `rgb(8,6,13)`, `mid` `rgb(82,30,158)`, `bright` `rgb(128,36,255)`), minimised. Every colour
  the shader emits is a component-wise mix along those stops, so this is a **guarantee over every
  frame and every scroll position**. It is the column pass/fail is taken on.

The bound is not always at the bright end: near-black ink on a translucent *light* pill has `deep` as
its worst ground, which is why all three stops are evaluated.

### Solid versus glass

They go through **the same code path**, which is the point. The probe walks every painted layer
between the text and the canvas and composites source-over in sRGB,
`over(src, α, dst) = round(α·src + (1−α)·dst)`. Because `α = 1` annihilates the ground, a solid
panel's gradient reading drops out of the arithmetic on its own — nothing has to remember to treat
it specially, and nothing can forget.

| handling | blocks | what is behind the text | gradient reading load-bearing? |
|---|---|---|---|
| **bare** (no painted layer) | 3 | the gradient itself | **Yes** — hero h1, hero tagline, footer line read the canvas directly |
| **glass** (one layer, α < 1) | 8 | the gradient, tinted | **Yes** — the composite depends on the sampled ground |
| **solid** (α = 1) | 14 | `--surface` `rgb(22,18,31)`, opaque | **No** — `measured == bound` for all 14 |
| **glass then solid** | 1 | `--glass` α .80, then an opaque `--accent` button | **No** — the button wins |

Translucent surfaces, composited onto each stop:

| token | α | over `deep` | over `mid` | over `bright` | worst `--ink` |
|---|---|---|---|---|---|
| `--glass` `rgba(11,8,18,.80)` | .80 | `rgb(10,8,17)` | `rgb(25,12,46)` | `rgb(34,14,65)` | 15.71:1 |
| `--story-tint` `rgba(37,21,56,.76)` | .76 | `rgb(30,17,46)` | `rgb(48,23,80)` | `rgb(59,25,104)` | 12.44:1 |
| `--chip` `rgba(12,9,20,.82)` | .82 | `rgb(11,8,19)` | `rgb(25,13,45)` | `rgb(33,14,62)` | 15.84:1 |
| `--chip-cta` `rgba(198,118,255,.92)` | .92 | `rgb(183,109,236)` | `rgb(189,111,247)` | `rgb(192,111,255)` | `--accent-ink` **6.08:1** at `deep` |

`backdrop-filter` is deliberately ignored: blurring averages, so the blurred value lies between the
band's minimum and its maximum, and taking the maximum is strictly conservative for light text on a
dark surface. It is *not* conservative for the near-black-on-light pills, which is exactly why those
are bounded at `deep` as well.

**That argument covers `blur(22px)`. It does not cover `saturate(1.15)`**, which is the other half of
the same filter and is not an averaging operation — it pushes a channel away from the mean and can
land a pixel *above* the band maximum this probe takes as its ceiling. `src/styles/sections.css`
(the comment above `[data-surface='glass']`) works it out: saturating the arithmetic ceiling pixel
`rgb(128,36,255)` gives approximately `rgb(137,31,255)`, **L 0.135 against the 0.1307** every glass
composite in `base.css` is derived from. So "a guarantee over every frame" is, strictly, very
slightly stronger than the arithmetic behind it, and this record did not say so until now.

The impact is immaterial and the reason is structural, not a tolerance: **the three tightest-margin
blocks in the table below are `bare`** — hero h1, hero tagline, footer line, at 1.17× — and bare text
has no panel over it, so no filter runs between it and the canvas at all. Every block that *is*
behind the filter sits at 1.58× or better. Folding the saturated ceiling in would mean re-deriving
every glass composite from a filtered ground rather than the plain one `PALETTE` emits — a second,
parallel arithmetic to keep in sync — to move numbers that already clear with margin. Recorded
rather than re-derived, and §10.6 says the same.

### The table, 1440 × 900, tightest margin first

> **Three rows below are retired.** "teaser heading", "teaser detail" and "teaser link"
> measured a card in the hero that §12 replaced with a photograph. The figures were real
> when taken; the elements are gone. §12.3 has the current run.


| block | px | wt | needs | measured | **bound** | at | margin | surface |
|---|---|---|---|---|---|---|---|---|
| hero tagline | 13.1 | 400 | 4.5 | 10.35 | **5.25** | bright | **1.17×** | bare |
| footer line | 12.5 | 400 | 4.5 | 5.45 | **5.25** | bright | **1.17×** | bare |
| nav CTA "Join us" | 12.5 | 600 | 4.5 | 6.08 | 6.08 | deep | 1.35× | glass α .92 |
| teaser link | 12.5 | 500 | 4.5 | 6.52 | 6.52 | deep | 1.45× | solid |
| board position | 12.2 | 500 | 4.5 | 6.52 | 6.52 | deep | 1.45× | solid |
| contact email link | 20.2 | 400 | 4.5 | 6.52 | 6.52 | deep | 1.45× | solid |
| form button label | 14.1 | 600 | 4.5 | 7.05 | 7.05 | deep | 1.57× | glass → solid |
| feature body | 20.2 | 400 | 4.5 | 7.18 | 7.10 | bright | 1.58× | glass α .80 |
| form card label | 11.5 | 500 | 4.5 | 7.24 | 7.10 | bright | 1.58× | glass α .80 |
| teaser detail | 13.8 | 400 | 4.5 | 7.51 | 7.51 | deep | 1.67× | solid |
| media card title | 14.7 | 400 | 4.5 | 7.51 | 7.51 | deep | 1.67× | solid |
| board bio | 14.1 | 400 | 4.5 | 7.51 | 7.51 | deep | 1.67× | solid |
| contact line | 20.2 | 400 | 4.5 | 7.51 | 7.51 | deep | 1.67× | solid |
| socials link | 13.1 | 500 | 4.5 | 7.51 | 7.51 | deep | 1.67× | solid |
| hero h1 | 138.2 | 200 | 3 | **5.29** | 5.25 | bright | 1.75× | bare |
| story body (serif) | 23.0 | 400 | 4.5 | 12.44 | 12.44 | bright | 2.76× | glass α .76 |
| nav wordmark | 12.5 | 600 | 4.5 | 16.51 | 15.84 | bright | 3.52× | glass α .82 |
| nav pill | 12.5 | 500 | 4.5 | 15.84 | 15.84 | bright | 3.52× | glass α .82 |
| teaser heading | 18.4 | 500 | 4.5 | 16.63 | 16.63 | deep | 3.70× | solid |
| semester select | 13.6 | 500 | 4.5 | 16.63 | 16.63 | deep | 3.70× | solid |
| board name | 16.0 | 500 | 4.5 | 16.63 | 16.63 | deep | 3.70× | solid |
| story h2 (ABOUT US) | 62.4 | 400 | 3 | 12.47 | 12.44 | bright | 4.15× | glass α .76 |
| feature h2 (EVENTS) | 68.0 | 300 | 3 | 15.71 | 15.71 | bright | 5.24× | glass α .80 |
| grid h2 (MEDIA) | 34.6 | 300 | 3 | 16.63 | 16.63 | deep | 5.54× | solid |
| grid h2 (BOARD) | 34.6 | 300 | 3 | 16.63 | 16.63 | deep | 5.54× | solid |
| grid h2 (CONTACT US) | 34.6 | 300 | 3 | 16.63 | 16.63 | deep | 5.54× | solid |

**26 of 26 pass on the bound.** `needs` is WCAG 1.4.3 resolved per block: 3:1 for ≥ 24 px, or
≥ 18.66 px bold; 4.5:1 otherwise.

### Across viewports

| | 375 × 812 | 768 × 1024 | 1440 × 900 |
|---|---|---|---|
| resolved | 26 / 26 | 26 / 26 | 26 / 26 |
| **pass on the bound** | **26** | **26** | **26** |
| tightest margin | **1.166×** | **1.166×** | **1.166×** |
| lowest bound | 5.247:1 | 5.247:1 | 5.247:1 |
| lowest measured | 5.307:1 | 5.326:1 | **5.288:1** |

Previously published: "26/26 pass, tightest margin 1.17×, lowest 5.29:1". **All three reproduce** —
1.1660× rounds to 1.17×, and 5.29:1 is the lowest *measured* figure; the lowest **bound**, the
number the design is certified against, is **5.25:1**.

**Re-run after the review fixes**, at all three viewports, against the same probe: **26 / 26 resolved
and 26 / 26 pass on the bound at every width**, tightest margin **1.17×** (hero tagline, 5.25:1
against a 4.5 requirement), lowest measured **5.29 / 5.31 / 5.33** at 1440 / 375 / 768. Every row of
the 1440 table above reproduces value-for-value. None of the fixes touched a stylesheet, a palette
stop or `contrast.js`'s arithmetic, and the figures say so.

---

## 8. Navigation, overflow, panels, height

### Nav anchors, 1440 × 900

Each pill was clicked for real; Lenis was then stepped by hand — `smooth.raf(performance.now())` on
a 16 ms timer, the same call `main.js` makes inside `onFrame` — because this host delivers no rAF.

| link | href | resolves | from → to | moved | target top after |
|---|---|---|---|---|---|
| VIOLET DIABOLO | `#hero` | yes | 5670 → 0 | −5670 | 0 |
| About | `#about` | yes | 0 → 910 | +910 | **71** |
| Events | `#events` | yes | 910 → 1891 | +981 | **71** |
| Media | `#media` | yes | 1891 → 2872 | +981 | **71** |
| Board | `#board` | yes | 2872 → 4507 | +1635 | **71** |
| Join us | `#contact` | yes | 4507 → 5670 | +1163 | **71** |

**6/6 resolve, 6/6 move.** Every target lands its top at **71 px** = `--nav-offset` (63) + 0.5 rem,
i.e. `--nav-clear`. The fixed bar is 63 px tall, so no heading lands underneath it.

### Overflow and the pill row

`--nav-offset` is written by `nav.js`'s `ResizeObserver`, and this host throttles its delivery, so
every row was read **after forcing a paint**. Without that, `--nav-offset` reads its CSS fallback and
the figures mean nothing.

| viewport | root | `clientWidth` | `scrollWidth` | equal | nav height | `--nav-offset` | rows | pills outside | offenders |
|---|---|---|---|---|---|---|---|---|---|
| 1440 × 900 | 16 px | 1440 | 1440 | **yes** | 63.0 | `63px` | 1 | **0/6** | **none** |
| 768 × 1024 | 16 px | 768 | 768 | **yes** | 68.0 | `68px` | 1 | **0/6** | **none** |
| 375 × 812 | 16 px | 375 | 375 | **yes** | 56.8 | `56.84px` | 1 | **0/5** | **none** |
| 320 × 812 | 16 px | 320 | 320 | **yes** | 56.8 | `56.84px` | 1 | **0/5** | **none** |
| 320 × 812 | **32 px** | 320 | 320 | **yes** | **188.8** | **`188.77px`** | **3** | **0/5** | **none** |
| 375 × 812 | **32 px** | 375 | 375 | **yes** | — | — | — | — | **none** |
| 280 × 812 | **32 px** | 280 | 280 | **yes** | — | — | — | — | **none** |

32 px root is this branch's stand-in for 200 % text zoom. The 320 px row is the interesting one: the
bar wraps to **three rows and 188.8 px**, and `--nav-offset` tracks it to **188.77 px** — the exact
failure `nav.js` exists to prevent (a fixed `clamp()` cannot know the bar has wrapped), working live.

"Offenders" is an exhaustive scan of `#content` and `.site-nav` **and those two elements
themselves**, measuring each element's **box** (`getBoundingClientRect`) *and* its **painted ink**
(a `Range` over its own contents), at 0.05 px tolerance — because an overlong word can paint past a
box that never grows, and a fixed bar can be too wide without any descendant being too wide. Zero
offenders at every width.

Previously published: equality at 375, 280 and 1440. **Reproduces, and extends to 320 and 768.**

### Panels

| section | `data-panel` | `data-surface` |
|---|---|---|
| `#hero` | `hero` | *(none — text directly on the gradient)* |
| `#about` | `story` | `glass` |
| `#events` | `feature` | `glass` |
| `#media` | `grid` | `solid` |
| `#board` | `grid` | `solid` |
| `#contact` | `grid` | `solid` |
| `[data-section=footer]` | *(none)* | *(none)* |

All four `data-panel` values in use; both `data-surface` values in use. Gaps between consecutive
panels: **81 px**, uniform. None of the deleted 3D symbols survive anywhere in `src/` or
`index.html` — `createStage`, `createLabels`, `createChoreography`, `createEntrance`,
`applySectionSides`, `SECTION_FOR_ROOM`, `ROOMS`, `data-room`, `data-side`: zero hits.

### Height in screens

| viewport | `scrollHeight` | screens |
|---|---|---|
| **1440 × 900** | 6,635 px | **7.37** |
| 375 × 812 | 6,747 px | **8.31** |
| 320 × 812 | 7,017 px | **8.64** |
| 768 × 1024 | 9,268 px | **9.05** |

Previously published: 7.37 and 8.31. **Both reproduce exactly.** See F2.

---

## 9. Findings

**No correctness defect was found** in the shader, the lifecycle, the fallback, the nav or the
contrast arithmetic — the nine steps above all reproduce. **One was found afterwards, outside them,
and it was the serious one: F5, the reveal gate, which could hand a visitor an entirely blank page.**
F1 and F4 are both now fixed as well. Everything in this section is resolved; nothing here blocks a
merge.

**F1 (fixed) — `three@0.186.0` was still installed, via a dependency nothing imported.** `npm ls
three` showed `violet-diabolo → animejs@4.5.0 → three@0.186.0`, marked `"optional": true,
"peer": true` in the lockfile: animejs declares a `three` adapter as an optional peer and npm
installs optional peers by default. The root cause was `animejs` itself — `grep -rn animejs src/`
returned **zero** hits while `package.json` still declared `"animejs": "^4.5.0"`, because both
modules that ever imported it (`src/scroll/choreography.js`, `src/scroll/entrance.js`) were deleted
at `15901a9`.

**Dropped, and `three` went with it.** After removing the dependency and reinstalling:
`npm ls animejs` → empty, `npm ls three` → empty, `node_modules/animejs` and `node_modules/three`
both absent, **0 references to either in `package-lock.json`** (31 lines deleted). The guard that
was supposed to police this — `tests/lifecycle.test.js`'s "engine independence" — had been excepting
those two deleted files, so its `continue` was unreachable and its exception set an inert constant;
it is now two positive claims with no exception set: nothing under `src/` imports animejs, and
`package.json` declares neither animejs nor three. A source grep alone would never have caught the
original, since no file imported animejs either and the package was still installed.

**F2 — 6–8 screens holds at desktop widths only.** 7.37 at 1440×900 is inside the range; 8.31 at
375×812, 8.64 at 320×812 and 9.05 at 768×1024 are outside it. The 8.31 figure was already published
by an earlier task, so this is a known shape rather than a regression, but the constraint as written
is met at one of the four viewports measured. A decision, not a bug. Relevant:
`src/styles/sections.css` — `--panel-gap`, and the `@media (width<=767px)` block's `min-height: 0`
and `padding-block`.

**F3 (fixed in this commit) — `src/gradient/contrast.js` named an impossible cause.** The docstring
for `worstCase`'s non-finite guard listed "a negative component from a float framebuffer readback".
`channel`'s branch is `s <= 0.03928`, and that bound is positive, so *every* negative `s` takes the
linear `s / 12.92` branch — `**` never sees a negative base. Measured:

| sample vs `--ink` | luminance | ratio | finite | `worstCase` |
|---|---|---|---|---|
| `[-40,-40,-40]` | −0.01214 | 25.045 | **yes** | returns it |
| `[-255,-255,-255]` | −0.07740 | −34.606 | **yes** | returns it |
| `[NaN,0,0]` | NaN | NaN | no | **throws** |
| `[Infinity,0,0]` | ∞ | ∞ | no | **throws** |
| `[10,10]` (short array) | NaN | NaN | no | **throws** |

The reachable causes are a `NaN`/`Infinity` component, or an RGB/RGBA-length mismatch destructuring
`b` to `undefined`. The docstring now says that, and records the negative case as an explicit
non-cause — harmless here because the only producer is `gl.readPixels` with `UNSIGNED_BYTE`, which
cannot emit one. **The arithmetic is untouched:** the bundle keeps its identical content hash
(`index-DTqm9uPc.js`, 38,522 B — the bundle as it stood at that commit; see §1 for the current
figure) across the edit, and the suite is 202/202 both before and after.

**F4 (fixed) — `README.md` documented the deleted 3D system end to end.** Not measured as part of the
nine steps; found while checking which files reference this record. It was not a stale section but
the whole document: the first file a reader opens, with almost every load-bearing sentence false.
The table below is what it claimed at `0853652`.

| `README.md` | says | actual |
|---|---|---|
| line 3 | "a Three.js diabolo … scrubbed by page scroll through an anime.js timeline" | an animated violet gradient behind panels; no Three.js |
| line 31 | `src/diabolo/` — "Three.js scene, materials, geometry build, render loop" | **directory does not exist** |
| line 32 | `src/scroll/` — "entrance sequence and the anime.js/ScrollObserver choreography" | `src/scroll/` holds `smooth.js` (Lenis) only; `choreography.js` and `entrance.js` **do not exist** |
| line 30 | `src/ui/layout.js`, the `data-side` stamping | **does not exist**; `data-side` is gone branch-wide |
| line 34 | `src/styles/stage.css` — "the sticky canvas, the narrow-screen object band" | **does not exist**; `src/styles/` is `base.css` + `sections.css` |
| line 36 | "280 unit tests across 19 test files" | **202 tests across 17 files** |
| line 69 | "`#stage` is `position: sticky`" | `#stage` is gone, and **§2 above measures zero `position: sticky` anywhere** — the README asserts the exact thing this branch removed |
| lines 73, 77, 79, 81, 164 | the 40dvh object band, `LatheGeometry` profiles, the `ROOMS` table, `cupTop` fractions, the sticky-pin IntersectionObserver argument | all describe deleted code |

Beyond that table: line 44 stated that "anime.js is imported by exactly two modules,
`src/scroll/choreography.js` and `src/scroll/entrance.js`" — both deleted, and nothing imported
anime.js at all (see F1). Lines 88–104 ("How the 3D works", "Changing the choreography") and
110–118 ("Fallback paths", describing an `index.html` fallback SVG this branch deleted and a
`tests/materials.dom.test.js` that no longer exists) described only deleted code, and the per-file
test table at 142–158 named eight deleted files. Lines 160–170 summarised the *previous*
`VERIFICATION.md`, which this document replaced.

**Rewritten from the tree.** Every path, count and figure in the new README was checked
programmatically rather than by reading: **73 assertions** covering that each of the 25 files it
names exists, that `src/` contains nothing it omits, that each of the 17 per-file test counts
matches `vitest --reporter=json`, that the bundle byte size and the −93.6 % figure match `dist/`,
that the three palette stops match `palette.js`, that `TARGET_FPS`/`RENDER_SCALE`/`--panel-gap`/
`.site-nav { position: fixed }` match their sources, that the six `data-panel`/`data-surface` pairs
match `sections.js`, and that `contrast.js` is absent from the bundle and from `main.js`'s imports.
All 73 pass.

**One argument was kept on purpose.** The old "Known limitations #2" reasoned that the
`IntersectionObserver` pause can never fire, because the observed element is pinned to the viewport
for the whole document height. The element it was about (`#stage`, `position: sticky`) is gone —
but `main.js` now observes `#gradient`, which is `position: fixed; inset: 0`, so the conclusion is
unchanged and the reasoning is carried into the rewrite with its new subject. `src/render/
lifecycle.js`'s own docstring now says the same thing, which it did not before.

**F5 (fixed) — the reveal gate could hand a visitor a blank page, and its docstring said it could
not.** `src/ui/reveal.js` added `.reveal-pending` — `opacity: 0`, base.css — **synchronously, in JS**,
to every direct child of every section, and the only thing that ever removed it again was an
`IntersectionObserver` callback. Its docstring claimed the rule's placement inside a
`prefers-reduced-motion: no-preference` block meant "a browser with no JS at all — or an observer
that never fires — leaves content fully visible". The first half was true. The second was not: the
class is added by the JS, so an observer that cannot run leaves it on forever.

This branch raised the stakes rather than lowering them: `src/ui/sections.js` makes `.room` the
single reveal unit per section and every panel is `min-height: 100dvh`, so one unrevealed element is
a full viewport of blank page.

**Measured, by booting the shipped modules in a same-origin `srcdoc` iframe with
`window.IntersectionObserver` deleted:**

| | before the guard | after |
|---|---|---|
| `.room` elements at `opacity: 0` | **6 of 6** | **0 of 6** |
| class on each | `room reveal-pending` | `room` |
| `transform` | `matrix(1,0,0,1,0,12)` | `none` |
| footer line | `reveal-pending`, `opacity: 0` | `footer-line`, `opacity: 1` |
| elements carrying `reveal-pending` | 7 | **0** |
| text under `#content` | 2,495 chars, none of it visible | 2,495 chars, visible on `rgb(8,6,13)` |

The fix guards on the constructor's existence before the class is added, and only for the real
factory — an injected observer still runs, which is what the five pre-existing tests depend on.
Three new tests in `tests/reveal.dom.test.js` cover it, falsified three ways: removing the guard,
widening it to ignore the injected factory, and moving it to *after* the class is added all fail it.

The docstring no longer claims what it cannot deliver. An observer that exists but never *delivers*
still leaves the page hidden; in a real browser a visitor cannot reach that state, because
IntersectionObserver delivery is a step of "update the rendering" — a browser that never delivers an
entry never painted the frame the content would have appeared in. It is reachable in automation,
which is why the distinction is now written down instead of assumed. The one thing this left
unestablished — `createLifecycle` still constructing an `IntersectionObserver` unguarded on the
same condition — is closed in **Fix pass 2** (`.superpowers/sdd/final-fixes-report.md`): `main.js`
now renders one frame and returns before either `createLifecycle` or `createSmoothScroll` is
constructed when `IntersectionObserver` is absent.

---

## 10. What this run could NOT verify, and why

1. **A real `prefers-reduced-motion: reduce`.** No emulation surface exists in this host. §5 used a
   **JS-level `window.matchMedia` override**: `main.js`'s branch is verified, the stylesheet's
   `@media (prefers-reduced-motion: no-preference)` block in `base.css` is **not**. Whether the
   reveal transitions are actually suppressed for such a visitor rests on that CSS rule, unexercised.
2. **Real browser tab visibility.** `document.hidden` was redefined in JS, not switched by the
   browser. The application's reaction to `visibilitychange` is verified; the browser's own rAF
   suppression in a genuinely hidden tab is not.
3. **A real browser without WebGL.** `getContext` was patched to return `null`. The unsupported code
   path and its layout are verified; no actual WebGL-less browser was used.
4. **Real scroll input.** This host delivers no `requestAnimationFrame`, so Lenis was stepped by hand
   with `setTimeout` and real timestamps, and anchor activation was synthesized. **Wheel and touch
   inertia, and the scroll boost under real input, are not verified here** — they are covered
   only by `tests/smooth.dom.test.js` and `tests/gradient.dom.test.js`.
5. **Sustained frame rate under a running loop.** The *frame cost* is a real GPU timer-query
   measurement. The *achieved* frame rate and the 30 fps cap in a live visible tab are not measured,
   because a free rAF loop will not run here; `createFrameCap` is covered by `tests/budget.test.js`
   alone.
6. **`backdrop-filter`'s actual blurred composite.** The contrast probe ignores it by design, taking
   the band maximum instead — strictly conservative for light text on a dark surface, and separately
   bounded at `deep` for the near-black-on-light pills. The blurred pixels themselves were never
   sampled. **That reasoning covers `blur(22px)` only**: `saturate(1.15)` on the same filter is not
   an averaging operation and can push a channel past the band maximum — `src/styles/sections.css`
   records the resulting ceiling as **L 0.135 against the certified 0.1307**. Immaterial in practice
   (the three tightest-margin blocks are bare, with no filter between them and the canvas), but it
   means the word "guarantee" in §7 is very slightly stronger than the arithmetic under it. See §7.
7. **Real mobile devices.** 320 / 375 / 768 were viewport emulation. No real touch input, no real
   device pixel pipeline, no real mobile GPU.
8. **Cross-browser and cross-GPU.** Chromium on ANGLE / Metal / Apple M4 only. No Safari, no Firefox,
   no non-Apple GPU — and `EXT_disjoint_timer_query` availability differs across those, so the frame
   cost in §3 is a figure for this machine.
9. **Appearance.** The screenshots in this run were thumbnails taken to force paints, not a design
   review. Nothing here is a judgement about how the page looks.
10. **Font loading and glyph rendering.** The Google Fonts stylesheet is requested; glyph rendering,
    the swap and fallback metrics were not inspected. The contrast figures are computed from
    `getComputedStyle` colours and sizes, which do not depend on which face actually rendered.
11. **`backdrop-filter`'s per-frame compositing cost on anything but this GPU.** §3.1 measures the
    geometry exactly and shows the shipped configuration has at least 33× headroom on Chromium /
    ANGLE / Metal / Apple M4 — but both conditions are pinned at the 60 Hz vsync ceiling there, so
    the *cost* itself is bounded above rather than resolved, and the mid-range phone the concern is
    actually about was not measured. The frame-budget figure in §3 is the shader alone and should
    not be read as the background's total per-frame cost.


---

## 11. Follow-up pass — scroll acceleration and the wordmark

Same host, same GPU, same method. Two defects the client reported from a screenshot, plus a content
change. Re-measured after each.

### 11.1 The gradient "sticks to a certain shape"

Two causes behind one symptom, and both are numbers rather than opinions.

**Resting pace.** `u_time` advanced at 1 unit/second against warp coefficients of 0.055 and 0.031,
so the noise field crossed one feature (~1.25 units of input) every **23 seconds**. `RESTING_RATE`
is now 3, which is ~7.7 seconds — a visible drift instead of a still image.

**Scroll acceleration could not work at all.** The shader read `t = u_time + u_velocity`, an OFFSET,
with `u_velocity` clamped to ±4. Lenis's reported velocity was measured live by hooking
`setVelocity` and pumping `lenis.raf()` by hand over a 2500 px `scrollTo`: **peak 273 px/frame,
median 8.5**. Every one of those saturates a ±4 clamp instantly, so the picture jumped ~4 seconds
forward, held there for the length of the scroll, and ran *backwards* on release. The uniform is
deleted rather than zeroed; scroll now multiplies the rate.

Verified by **pixel path length** — the per-frame change summed over one second of 30 frames, read
back through a 2D canvas. Endpoint difference was tried first and is useless here: it saturates once
the field decorrelates, and reported the post-scroll second (24.1) as *larger* than the scrolling
second (22.2). Path length is monotonic in speed:

| condition | `setVelocity` | path length / second | vs rest |
|---|---|---|---|
| resting | — | 30.88 | 1.00× |
| gentle scroll | 10 | 35.74 | 1.16× |
| brisk scroll | 60 | 71.48 | 2.31× |
| fling | 400 | 85.33 | 2.76× |

Below the theoretical 4× ceiling because the boost ramps from 0 across the measured second
(`BOOST_TAU` 0.35 s); a sustained scroll approaches it.

**The shader's appearance is unchanged**, which §3's figures re-confirm exactly: worst step
**85.428 %** under L 0.02 (step 5), best 93.238 %, pooled 89.175 %, median exactly `deep`, brightest
pixel `rgb(127, 36, 254)`, `--ink` at 5.288:1 against it. Frame cost re-measured at
**0.0155 ms/frame** at 1440×900 with a zero-cost control (`EXT_disjoint_timer_query_webgl2`,
240 draws) — the control is what makes that a measurement rather than a number.

Both probes lose the uniform with it. Their `STEP_SECONDS` constants were shader time units, not
seconds, and are renamed `STEP_UNITS` at the **same values**, so every figure above still refers to
the same sampled `u_time`.

### 11.2 The wordmark broke mid-word

The client's screenshot showed "VIOLET" / "DIABOL" / "O". Reproduced at 1024×768: the hero head is
**350.2 px**, `--type-hero` resolved to **98.3 px**, and "DIABOLO" paints **393.1 px** of ink.
`overflow-wrap: anywhere` (base.css, added for a different heading) did the only thing left to it.

Word widths measured in the live face rather than assumed: **DIABOLO 4.004 em**, VIOLET 3.179 em at
Inter 200 with the hero's −0.045 em tracking — so the comment beside `--type-hero` claiming VIOLET
is the wider of the two is wrong for this weight. The system fallback is narrower still (3.599 em),
so it has more margin, not less.

Fixed by capping the hero at `min(var(--type-hero), calc(100cqi / var(--wordmark-em)))` against a
query container on `.room-head`. Container units because the column is `min(38%, 30rem)` of a box
that already has the gutters removed — no viewport formula reproduces that number.

Verified with a `Range` walked character by character over the h1's text node, grouping by line-box
top — **ink, not boxes**, the same method that caught "EVENTS" escaping its column. A line break is
counted as mid-word when the character before it is not whitespace.

| viewport | root | font-size | head width | lines | clearance |
|---|---|---|---|---|---|
| 1440×900 | 16 px | 115.66 | 480.0 | VIOLET / DIABOLO | 17.5 px |
| 1440×900 | 32 px | 118.67 | 492.5 | VIOLET / DIABOLO | 17.9 px |
| 1024×768 | 16 px | 84.39 | 350.2 | VIOLET / DIABOLO | 12.8 px |
| 1024×768 | 32 px | 84.39 | 350.2 | VIOLET / DIABOLO | 12.8 px |
| 767×900 | 16 px | 72.00 | 690.3 | VIOLET DIABOLO | 156.8 px |
| 767×900 | 32 px | 115.05 | 687.0 | VIOLET / DIABOLO | 226.9 px |
| 375×812 | 16 px | 56.25 | 335.0 | VIOLET / DIABOLO | 110.1 px |
| 375×812 | 32 px | 71.08 | 295.0 | VIOLET / DIABOLO | 10.8 px |
| 280×812 | 16 px | 46.40 | 240.0 | VIOLET / DIABOLO | 54.4 px |
| 280×812 | 32 px | 48.19 | 200.0 | VIOLET / DIABOLO | **7.3 px** |

No mid-word break and `scrollWidth === clientWidth` in all ten. This also closes the
280 px / 200 % zoom four-line break ("VIOL" / "ET" / "DIAB" / "OLO") that base.css carried as an
accepted client-visible cost — both terms of the `min()` are viewport-derived, so the rem floor can
only ever win by being the smaller.

**Containment control.** `container-type: inline-size` applies size containment, so the claim that it
changes nothing was measured both ways rather than reasoned: the head is **240.0 px** with and
without it at 280×812.

### 11.3 Contrast, re-run after the content change

26 of 26 text blocks pass worst-case contrast across 12 time steps at 1440×900, none missing.
Tightest margin **1.17×** (hero tagline and footer line, 5.25:1 against a 4.5 requirement). The
probe's own overflow sweep passes at 375 and 280 with zero offenders.

### 11.4 Still not verified

Everything in §10 stands. Two specific to this pass:

1. **The acceleration has not been felt on a real wheel.** Lenis was driven programmatically, as in
   §10.4. The path-length figures come from `gradient.render()` called by hand at a fixed 30 frames
   per second — the *mapping* from velocity to rate is measured, the feel of it under a real
   trackpad is not.
2. **The container query was not exercised in a browser without `cqi` support.** `min()` with an
   unsupported unit is invalid at parse time and the whole declaration is dropped, so each hero
   rule carries a bare `font-size` ahead of the capped one: such a browser gets the uncapped size
   this shipped with before the fix, not the UA's default h1. That fallback was reasoned from the
   cascade, not tested against a browser that actually lacks `cqi` — none was available. What was
   measured is that adding it changes nothing where `cqi` IS supported: 84.39 px and two lines at
   1024×768, identical to the table above.


### 11.5 The practice gallery

Six photographs from the client's Drive folder, chosen from all 100 by building a contact
sheet out of Drive's own thumbnail endpoint — no originals were downloaded to look at
them. Fifteen were then pulled at full size and six kept.

**The pipeline was rotating nothing.** Nine of those fifteen are PORTRAITS stored as
4608x3456 landscape with EXIF `orientation=8`; `scripts/build-assets.mjs` never called
`sharp.rotate()`, so they built lying on their side. The four masters that predate this
are orientation 1 or none, checked rather than assumed, so the call changes nothing for
them.

The six masters were rewritten upright at 2000px on the long edge before being committed:
**46.2 MB → 3.4 MB**, against a repository whose `.git` is 24 MB, and 2000 is this
document's own derivative ceiling so nothing downstream can want more. That rewrite makes
an orientation assertion about the shipped derivatives vacuous, so the guard runs
`prepare()` against a synthesised 40x20 master with `orientation=8` and requires a 20x40
result — it fails when `.rotate()` is removed.

**A claim that was withdrawn rather than explained.** That test first asserted the rotate
had to happen BEFORE the resize. A mutation moving `.rotate()` after `.resize()` passed
it: sharp applies a no-argument rotate during input decode, so the order does not matter.
The assertion and the comment claiming it both went.

**Contrast, re-run: 27 of 27 blocks pass**, the new "AT PRACTICE" heading at 7.51:1
against a 4.5 requirement, no missing selectors, overflow clean at 375 and 280.

That 27th block exists because of a gap this pass found in the probe itself: nothing
checked that its BLOCKS list covered the page. A heading was added, the probe reported a
clean "26 of 26", and it had never looked at it. Two guards now close it from both sides —
every element with a direct text node must be matched by some BLOCKS selector, and every
BLOCKS selector must match something the page renders. Falsified in both directions.

Cells are sized from the `<img>`'s own `width`/`height` attributes rather than a CSS
`aspect-ratio`, because four of the six are 3:4 and two are 4:3 — one shared ratio would
crop the group photograph's outer two people off. Verified in the browser at 1440: three
columns, portraits 251x334 and landscapes 251x188, correct AVIF derivative served for
each, `scrollWidth == clientWidth`.

Alt text describes the action and never a name. These are identifiable students and
nothing in the brief says which face belongs to which of the six board members; a test
asserts no alt string contains any name from BOARD.


---

## 12. Second follow-up — photographs at the top, and on the board

### 12.1 What moved

The hero's practice card is gone and a photograph of the team stands in its place; the
events panel gained one; three of the six Fall 2026 board members gained portraits.

The practice times are now stated **once**, in the events panel. The card restated them,
which is why a guard existed to hold the two in step; the guard is replaced by a stronger
one that counts how many elements on the whole page paint each fact and requires exactly
one, inside `#events`.

### 12.2 Five masters in, one renamed, one photograph reused nowhere

`P1011197` → `hero-group`, `P1011113` → `events-practice`, `P1011169` → `board-barry`,
`P1011122` → `board-evan`, `P1011134` → `practice-pair`. `P1011184` was already in the
repository as the gallery's `practice-spin`; it is the client's choice for Hannah Chen, so
the master was **renamed** to `board-hannah` and the gallery slot refilled with
`practice-pair` — one picture doing both jobs would have put it on the page twice.

All five went through the same intake as §11.5: rotation applied, EXIF dropped, 2000px on
the long edge. Two of the five carried `orientation=8`.

The 4:5 crops the board cards actually paint were rendered and inspected before wiring,
rather than trusted to a centred `object-fit: cover`: all three keep the subject's face
well inside the frame.

**Aaron Hui keeps his photograph**, the one from the previous site. It was briefly
replaced with a stand-in tile on the grounds that a distant indoor full-body shot reads
oddly beside three close outdoor portraits; the client's answer was to keep it, so the
Fall 2026 roster shows four photographs and two tiles.

### 12.3 Contrast and layout, re-run

**25 of 25 blocks pass** (27 − 3 retired teaser blocks + 1 new). The board's stand-in
tile carries initials at 40px, which measures **7.51:1** against a 3:1 large-text
requirement. No missing selectors; the overflow sweep is clean at 375 and 280.

The stand-in tile exists for a layout reason, not a decorative one: a card with a
photograph stands about 300px taller than one without, so a half-photographed roster
dropped three of its six cards to a third of their neighbours' height. Measured after:
510 / 510 / 532 / 532 / 510 / 510.

Hero and events photographs both render at 520×390 from the 1600px AVIF, `scrollWidth ==
clientWidth`, and the hero's is `loading="eager"` — it is the first screen, and
`buildPicture` defaults to lazy.

### 12.4 A property that was not an attribute

`buildPicture` set `img.loading = loading`. That works in a browser — verified on the live
page, where the about photograph carries `loading="lazy"` — because the IDL property
reflects. jsdom does not implement the reflection, so **no test in this suite could see
the loading behaviour at all**, and the first one written for it failed against correct
code. Changed to `setAttribute`, which is what the HTML spec reads and what both
environments agree on.

### 12.5 What the guards caught

Both halves of §11.5's probe-coverage guard fired on this change before any human looked
at it: the three teaser selectors became dead, and the board's initials painted text
nothing measured. That is the whole reason they exist, and it is the first time in this
project's history that a stale contrast contract was caught by a test rather than by
someone noticing.


---

## 13. Two corrections, and a descriptor that would have lied

### 13.1 The events photograph is `P1011100`

Client's pick, replacing `P1011113`. It is two members practising together, one teaching
the other, which sits better against copy that ends "anyone is welcome, regardless of
experience".

It is also a **portrait** where the last one was landscape, and that mattered more than
the picture. Its master is 1500×2000, and the target was still configured `[800, 1600]`.
`withoutEnlargement: true` would have written the 1600 derivative at **1500px** while
`buildPicture` went on advertising it as `1600w` — a srcset descriptor the browser acts
on, picking a candidate believing it is wider than it is. Caught before the file shipped;
the widths are `[600, 1200]` now, both inside the master.

A guard was added for the general case: every generated derivative's real pixel width must
equal the width in its own filename. Falsified by restoring `[800, 1600]` and rebuilding —
it names `events-practice-1600.avif is 1500px wide, not 1600`.

### 13.2 Aaron Hui keeps his photograph

The §12 judgment call is reversed at the client's instruction. Four photographs, two
tiles.

### 13.3 The stand-in tile was invisible

It shipped with `background: var(--surface)`. Measured on the live page: `--surface` is
`#16121f` and a **solid panel's background is also `#16121f`**, so the tile was exactly
the colour of the thing it sat on — it reserved the right box, which was its main job, but
the initials floated in nothing and it did not read as a slot at all.

Now `var(--stage)` (`#08060d`), the page's own ground, so it reads as a hole punched
through the panel. A fill rather than a border, because `.board-card`'s own rule is "no
fill and no border" and a framed empty box is the card kit that rule rejects.

The initials measure **8.22:1** on the darker ground, up from 7.51:1, against a 3:1
large-text requirement. **25 of 25 blocks pass**, no missing selectors, overflow clean.

This one is worth naming for what it says about the §11.5 coverage guards: they proved the
tile's text was *measured*, and measured correctly. They cannot see that a box is the same
colour as its background, because that is not a contrast failure — it is a design failure
that happens to pass every contrast check. It took looking at the page.


---

## 14. Design pass — caps, weight, a real bar, and a second page

### 14.1 What the client asked for, and what each one cost

| Asked | Done | Caught on the way |
|---|---|---|
| Nav pills in caps | `text-transform` + 0.09em tracking, weight 600 | — |
| Thicker wordmark | Inter 400, up from 200 | **`--wordmark-em` had to be re-measured** — see 14.2 |
| Headings not all one weight | h1/h2 → Inter 700; hero 400; cards 500 | ABOUT US was Instrument Serif, which has no bold |
| An actual nav bar | `--bar` (--stage at 0.82) + 18px blur + hairline | the blur guard's allowlist, widened by one |
| About: less gap, shorter copy | column-gap 80px → 38px; 100 words → 54 | — |
| A performed-for marquee | seven names, duplicated track, −50% loop | **the overflow scan could not see clipping** — 14.3 |
| Events: text left, photo right | copy + forms into the head; figure capped at 24rem | the probe's `#events .room-body > p` went dead |
| Media on its own page | `media.html`, one boot, `data-page` | the probe measured one hardcoded page |
| Social icons | inline SVG, `currentColor`, 44px targets | `icon` had been dead data since the rebuild |
| Footer shorter and centred | `min-height: 40vh` deleted; 395px → 124px | — |
| GitHub gone | removed from SOCIALS | — |

### 14.2 A constant that was coupled to a weight, and said so nowhere

`--wordmark-em` is the divisor that keeps "DIABOLO" on one line. It was **4.15**, measured at
Inter **200** where the word is 4.004em wide.

Going to weight 400 widened the word to **4.086em**. Nothing failed, nothing warned: the
cap still fitted, on 1.6% of margin instead of 3.6%. Re-measured and raised to **4.25**,
and the guard's floor moved from 4.004 to 4.086 so the next weight change cannot pass
silently either. Verified at 1024 / 375 / 280, each at a 16px and a 32px root: two lines,
no mid-word break, smallest clearance 7.7px, no overflow.

### 14.3 The marquee broke the overflow scan, and the fix had to be proved not to gut it

A 4,700px track inside a 375px `overflow: hidden` strip is what a marquee IS. The scan
reported **nineteen offenders out to x 8228** while `scrollWidth === clientWidth` — it had
no idea anything was clipped. Three changes:

1. An element inside a clipping ancestor is skipped. The walk stops at `body`, because
   base.css puts `overflow-x: hidden` there and walking past it would mark the entire page
   as clipped and report green forever.
2. An element that clips its own overflow is measured by its box, not its ink.
3. **Ink is measured from an element's own direct text nodes**, not `selectNodeContents`.
   A Range over a whole subtree reads straight through a clip, which is how `main`,
   `.section-about` and `.room` each reported the track's width as their own. Nothing is
   lost: every element is scanned, so an overflowing text node is still caught on the
   element that holds it — which is where the hero h1's ink defect lived when this check
   first found it.

**Proved not vacuous, in the browser, twice.** With the page at rest: 0 offenders. Inject a
`width: clientWidth + 400` box → caught. Inject a 200-character unbreakable word in a 40px
box → caught. Both shapes the scan exists for still fail it.

A fourth case fell out of the same work: `.visually-hidden` (the social icons' text labels)
measured its *unclipped* `nowrap` string through a `clip-path`, reporting ink at x 320 in a
280px viewport. Anything a clip-path hides is now skipped.

### 14.4 An `about:blank` race I introduced and caught on the first run

Making the probe's page a `?page=` parameter meant setting `frame.src` from script. The
existing wait was `if (readyState === 'complete') resolve(); else wait for load` — correct
while the src sat in the markup, a **race** once script sets it: a frame with no src holds
`about:blank`, whose readyState is `complete` immediately, so the probe measured a page
that had not loaded. It threw on the first run, which was luck; the quiet version is
"0 of 27 blocks resolved" against a page that simply was not there. The listener is now
attached before the src is set and the short-circuit is gone.

### 14.5 Three guards that failed on correct work

All three were reading the file too loosely, and all three are now reading what they claim:

- **The sticky scan** treated `@keyframes marquee-slide` as a media query it had never been
  taught. `@keyframes` blocks hold keyframe selectors, not rules that match elements, and
  `position` is not animatable — skipped. It also learned `(prefers-reduced-motion: reduce)`
  and `(min-width: 900px)`, both false at 375.
- **The card-grid floor guard** matched any rule whose selector *ends* in `.media-list`, so
  the media page's override — which sits earlier in the file and deliberately has no floor —
  was read instead of the base rule. Anchored to the rule whose selector IS `.media-list`.
- **The "no second rollup entry" guard** banned `rollupOptions.input` outright, on the
  premise that Vite's only entry was index.html. media.html made the premise false while the
  risk it stood for (scripts/ reaching dist/) did not change. It now checks the entries
  themselves: each must be a root-level `.html`, none under `scripts/`, and none may
  reference a probe.

### 14.6 Contrast, both pages

| page | blocks | missing | overflow at 375 / 280 | tightest |
|---|---|---|---|---|
| index.html | **23 of 23** | none | 0 / 0 offenders | 1.17× (footer line, hero tagline) |
| media.html | **8 of 8** | none | 0 / 0 offenders | 1.17× (footer line) |

The marquee's names measure **5.62:1** against a 4.5 requirement.

### 14.7 Still not verified

Everything in §10 stands, plus:

1. **The email sweep the client asked for did not happen.** `violetdiabolo@gmail.com` was
   not signed in; the browser reached Barry's personal account, where the only club mail in
   two years was one forwarded booking (NYU Welcome, 25 Aug 2026). `PERFORMED_FOR` is
   therefore evidenced from the media list plus that one email, and is marked incomplete in
   `src/content/index.js` rather than padded.
2. **The marquee has not been watched running in a foregrounded tab**, only measured
   (track 4,739px, animation `marquee-slide`, two lists, −50%).
3. **The media page's editorial grid above 900px** is asserted in CSS and was not measured:
   the preview pane was 293px wide for this pass.


---

## 15. The mark, and the end of the page

### 15.1 The logo is in the bar

`public/logo.png` was a 521x608 PNG at 63KB, referenced by nothing since the rebuild. It
goes through the pipeline like every other image now — `logo-64` and `logo-128`, AVIF and
WebP — and the bar serves the 64 (**5.4KB AVIF** against 63KB of PNG) for a mark that
paints at 24x28.

`alt=""`. It sits inside the wordmark link, which already carries the text "VIOLET
DIABOLO"; naming the image as well would have a screen reader announce the club twice for
one link. Decorative is the accurate description here, not a shortcut.

Its height is `1.75rem`, sized off the text rather than a fixed pixel value, so at 200%
zoom it grows with the label beside it instead of shrinking into a dot.

**The narrow-screen rule changed sides.** Below 767px the whole chip used to be hidden, on
the reasoning that the hero's h1 says the club's name sixty pixels below it. That is true
of the NAME, which is why the name is the half that now goes and the mark stays: the logo
is ~28px against the 140px the full chip took, so the pill row keeps the width the original
rationale was protecting.

### 15.2 Contact is the footer

The standalone `<footer>` strip is gone. The sign-off is a line inside whichever panel
comes last — contact on the home page, media on the other — appended to `.room` so it
spans both of a grid panel's columns, separated by the page's one hairline, centred.

`.section:last-child { margin-bottom: 0 }` removes the panel gap that used to sit under
the last panel as well.

| | before | after |
|---|---|---|
| space below the last panel | ~400px (gap + strip padding) | **0px** |
| the page ends on | bare gradient | the contact plate |

**The sign-off got safer by moving.** It was one of exactly two blocks on bare canvas and
the joint-tightest on the page at **5.25:1** (1.17x margin). On the solid panel it measures
**16.63:1** (3.70x) and is no longer in the tightest three.

`--bar-edge` became `--hairline` in the same pass: the bar's under-edge and the sign-off's
rule are the same line, and one token for one thing beats two names for one value.

### 15.3 Re-run

| page | blocks | missing | overflow 375 / 280 | tightest |
|---|---|---|---|---|
| index.html | **23 of 23** | none | 0 / 0 | 1.17x (hero tagline) |
| media.html | **8 of 8** | none | 0 / 0 | 1.35x (nav CTA) |

The sign-off guard is falsified three ways: drop it from the media page, move it off the
end of its panel, or bring the standalone strip back — each fails.

### 15.4 Still not verified

Everything in §10 and §14.7 stands, including the email sweep, which still needs
`violetdiabolo@gmail.com` signed in. One new item: the nav mark has not been seen at 200%
text zoom in a real browser — the `1.75rem` height is reasoned from the rule, not measured.
