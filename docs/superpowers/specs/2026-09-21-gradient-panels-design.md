# Animated Gradient & Panels — Design

**Date:** 2026-09-21
**Supersedes:** the 3D diabolo concept entirely (`2026-09-19-violet-diabolo-wireframe-rooms-design.md`, merged as `3dda688`)

## 1. What this is

The scroll-driven 3D diabolo is removed and replaced by an animated swirling gradient that sits behind the whole page. Sections become self-contained panels that scroll over it, with gaps between where only the gradient shows. Scrolling gains inertia. Nothing locks in place any more.

The client's reference is Framer's "Animated Gradient" component — dark ground, bright swirling ribbons. The palette becomes the club's violet rather than the reference's blue, so the site stops carrying two competing identities.

## 2. What goes

| Path | Fate |
|---|---|
| `src/diabolo/build.js`, `labels.js`, `materials.js`, `profiles.js`, `stage.js` | **deleted** |
| `src/diabolo/lifecycle.js` | **moved** to `src/render/lifecycle.js`, unchanged |
| `src/scroll/choreography.js`, `src/scroll/entrance.js` | **deleted** |
| `src/ui/layout.js` | **deleted** — `applySectionSides`, `SECTION_FOR_ROOM`, `data-side` |
| `three` dependency | **removed** |
| All `position: sticky` | **removed** |

`createLifecycle` survives because it is already generic: it takes `element` and `onFrame`, injects `raf`/`caf`/`doc`/`observerFactory`, cancels the pending frame when the tab is hidden or the element leaves the viewport, and clamps resume deltas. It will drive the gradient unchanged, keeping its 16 tests.

`data-side` goes because the reading-column split existed only to keep text off the diabolo. With no object to avoid, text uses the full measure.

**Tests deleted with their subjects:** `build` (20), `choreography` (32), `choreography.dom` (16), `entrance` (13), `labels.dom` (16), `materials.dom` (19), `profiles` (14), `stage` (28) — 158 of the current 280.

**`tests/sections-layout.dom.test.js` (19) is split, not deleted.** Its subject is partly gone and partly not, so each test is judged individually rather than the file being dropped wholesale:

| Covers | Fate |
|---|---|
| `applySectionSides`, `SECTION_FOR_ROOM`, `data-side` | deleted with their subject |
| Room/section boundary handover, the media card hold-back | deleted — both derive from the choreography's progress fractions |
| The `--type-title` specificity guard, the phone-width cascade guard | **kept** — they guard CSS bugs that have nothing to do with the 3D object, and both caught real defects |

Roughly **122 tests survive**, plus whatever of `sections-layout.dom.test.js` is kept. That number is a prediction, not a target; the plan reports the real one.

**Bundle:** ~600 KB of Three.js leaves. The replacement is raw WebGL with no library.

## 3. The gradient

### Rendering

A single fullscreen quad — two triangles — with a fragment shader. All the visual work happens per-pixel on the GPU in parallel, which is why this is cheap enough to run behind an entire page. The technique follows the approach documented at `alexharri.com/blog/webgl-gradients`: stacked simplex noise at several scales and speeds, layered and mapped through a gradient ramp.

**Rejected alternatives, and why:**
- *Keep Three.js to draw one quad* — 600 KB for something that needs none of it.
- *Layered CSS conic/radial gradients* — cannot produce the fine filaments the reference is made of, and large blurred areas composite expensively.
- *Canvas 2D* — CPU-bound per pixel, which is the lag the client asked to avoid.

### Module shape

```
src/gradient/
  palette.js     # violet ramp stops, exported so the contrast guard can sample them
  shader.js      # vertex + fragment GLSL as strings
  gradient.js    # createGradient({ canvas, palette }) -> { render(delta), setVelocity(v), resize(), dispose() }
```

`gradient.js` owns WebGL state and nothing else: no scroll knowledge, no DOM beyond its canvas. `main.js` wires it to `createLifecycle` and to the scroll source.

### Uniforms

| Uniform | Source | Owner |
|---|---|---|
| `u_time` | accumulated frame delta | `gradient.js` |
| `u_resolution` | canvas size on resize | `gradient.js` |
| `u_velocity` | scroll speed, smoothed | written by `main.js` via `setVelocity`, read by the shader |

**One owner per uniform**, the same invariant the deleted choreography carried: `gradient.js` advances `u_time`, and nothing else writes it. `u_velocity` has exactly one writer.

### Performance

The client's stated requirement is that it must not lag. Four measures, all mandatory:

1. **Render at half device-pixel-ratio** into a canvas that CSS scales to full size. Quarters the fragment work; invisible on a smooth gradient.
2. **Cap at 30fps.** Implemented by accumulating delta inside the gradient's `onFrame` and skipping work below the threshold, so `createLifecycle` stays untouched and its tests keep passing.
3. **Stop when the tab is hidden or the canvas leaves the viewport** — already `createLifecycle`'s behaviour.
4. **`prefers-reduced-motion` renders exactly one frame** and never animates.

A budget, so the plan can verify rather than assert: **frame cost under 4 ms at 1440×900.** Measure it and report the hardware measured on; do not assume it, and do not report a number from a machine whose GPU is not named.

### Scroll acceleration

The client asked for this only if it were cheap. It is: Lenis already computes scroll velocity, so it feeds `setVelocity` directly and the shader adds it to the time step. One uniform, no extra passes. **In scope.**

Velocity is smoothed and clamped so a flung scroll cannot make the gradient strobe — an accessibility concern, not merely an aesthetic one.

Under reduced motion there is no Lenis and therefore no velocity source: `u_velocity` stays at 0 and the single rendered frame is the resting state. Nothing needs to special-case this beyond not installing Lenis.

### Fallback

No WebGL → a static CSS gradient approximating the shader's resting state, under the existing `data-stage="unsupported"` hook. Content is never gated behind the graphics.

## 4. Scroll

**Lenis** (~5.4 KB gzipped — the installed 1.3.26's actual bundle delta, measured
before/after) provides inertia.

- **Disabled entirely under `prefers-reduced-motion`** — native scrolling, no interception.
- Nav anchors route through `lenis.scrollTo` so in-page links still work.
- Its velocity feeds the gradient.
- No `position: sticky` survives anywhere, which removes both the locking headings and the about-section lock in one move — they were the same mechanism.

## 5. Panels

Each section is one self-contained panel sized to its content, with gradient-only gaps between them. Roughly 6–8 screens total, down from 13.

Two attributes, separating layout from material:

- **`data-panel`** names the layout: `hero`, `story`, `feature`, `grid`.
- **`data-surface`** names the material: `solid` or `glass`.

This replaces `data-room`, whose name referred to scroll rooms that no longer exist. Renaming rather than repurposing matters here: this codebase has repeatedly shipped names and comments that no longer described the code, and every one cost a defect.

| Section | `data-panel` | `data-surface` |
|---|---|---|
| hero | `hero` | none — the gradient is the hero |
| about | `story` | `glass` |
| events | `feature` | `glass` |
| media | `grid` | `solid` |
| board | `grid` | `solid` |
| contact | `grid` | `glass` |

Dense content sits on solid panels where readability rules; panels whose point is the gradient showing through are glass. The design pass may adjust this table, but must keep at least one of each.

Glass is `backdrop-filter: blur()` over a translucent fill. **Note:** an existing guard forbids `backdrop-filter`, added when it was being used to rescue text laid over the 3D object. That rationale is gone. The guard is **narrowed, not deleted** — permitted on `[data-surface='glass']`, still forbidden behind body text generally. Weakening it further is out of scope.

## 6. Nav

Pills become semi-transparent, like on.energy's bar, so they read against both the gradient and the panels beneath.

The left-hand buttons currently clip (client screenshot). The pill row must not overflow its container at any width — a layout bug to fix, not to mask.

## 7. Contrast over a moving background

This is the one genuinely new risk, and it is the defect class this project has shipped most often: text over something that moves.

A single-frame contrast check is not sufficient, because the gradient's luminance under any given point varies over time. The guard must:

1. Render the shader off-screen at **N ≥ 12 time steps** spanning a full noise cycle.
2. Sample the pixels under every text block's bounding box.
3. Assert the **worst case across all steps** clears 4.5:1 for body text and 3:1 for large text.

Sampling one frame, or only the resting state, is the failure mode to avoid. Glass panels reduce but do not eliminate this — `backdrop-filter` blurs the gradient without flattening its luminance range, so glass panels are sampled too.

## 8. What survives untouched

`src/content/index.js` (verbatim club copy), `src/ui/` minus `layout.js`, `src/fallback/detect.js`, the asset pipeline, and the content/markup boundary rules.

## 9. Out of scope

- The Framer component's preset picker (Prism/Lava/Plasma/…). A club page needs one background, not six.
- The 58 photos in the client's Drive folder. They must land in the project directory first; a handful will be selected in separate work.

## 10. Verification

Measurable, each with a number rather than an assertion:

1. Three.js absent from `package.json` and from the built bundle; report the new bundle size against 600 KB.
2. No `position: sticky` in any stylesheet.
3. Frame cost under 4 ms at 1440×900; report the measurement and the method.
4. The render loop stops when the tab is hidden and when the canvas leaves the viewport.
5. Reduced motion: exactly one frame rendered, Lenis not installed, no interception.
6. No WebGL: the page renders, all content reachable, static fallback visible.
7. Worst-case contrast across ≥ 12 time steps, per text block, at 375 / 768 / 1440.
8. Every nav anchor resolves and moves the scroll position.
9. The nav pill row does not overflow at 320 / 375 / 768 / 1440.
10. Each of the four `data-panel` patterns and both `data-surface` values appears at least once.
