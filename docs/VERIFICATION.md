# Real-condition verification record — six-act build

Recorded 2026-09-11 against `build/six-act`, `npm run build` → `vite preview`, driven in a real
Chromium instance. **Only observed numbers appear here.** Where the environment could not produce
a condition, that is stated rather than papered over.

## Summary

| Claim | Status |
|---|---|
| Six distinct acts across the scrub | **Verified** |
| ~20 screens of scroll | **Verified** — 20.6 |
| Object traverses the screen rather than sitting centred | **Verified** — 26.6% → 73.4% |
| Object stays out of the reading column | **Verified** — 6.1% of samples overlap, from 30.6% |
| Scroll drives the spin | **Verified** — 0.4 → 4.0 across acts |
| Camera orbits at constant radius | **Verified** — 7.00 at 40° |
| Light spill tracks the object | **Verified** — 50 → 69.6 → 22.0 → 78.0 → 31.3 → 50% |
| Grid, hairlines, plates, counters, stroked text all gone | **Verified** |
| No background behind body text | **Verified**, property-level |
| Hero title clear of the object | **Verified** — contrast 1.11:1 → 15.85:1 |
| Ownership holds | **Verified**, now mutation-guarded |
| Live scroll drives the timeline | **Not verified** — host fires no scroll events |
| Mobile recipe from spec §4 | **Not implemented** — see §7 |

## 1. The six acts

Sampled by seeking the real timeline. Every row differs:

| act | objX | camX | camZ | spill | spin | labels |
|---|---|---|---|---|---|---|
| arrival | 0.00 | 0.00 | 6.2 | 50% | 1.0 | 0 |
| apart | +1.60 | 0.00 | 10.0 | 69.6% | 0.4 | 1 |
| recombine | −1.60 | 0.00 | 7.0 | 22.0% | 1.2 | 0 |
| spin | +1.60 | 0.00 | 7.0 | 78.0% | 4.0 | 0 |
| orbit | −1.60 | 4.50 | 5.36 | 31.3% | 1.2 | 0 |
| settle | 0.00 | 0.00 | 6.8 | 50% | 0.5 | 0 |

Orbit distance `hypot(4.50, 5.36) = 7.00` — a swing at constant radius, not a dolly.

## 2. The obstruction, measured

This is the defect the revamp existed to fix, and it survived into the branch in a form no
endpoint test could see.

`textSide` flips instantly at an act boundary while `x` took the whole act to cross, so **four of
six acts began with the object sitting on the incoming text's side**:

| act | text side | object x at act start |
|---|---|---|
| recombine | right | **+1.60** |
| spin | left | **−1.60** |
| orbit | right | **+1.60** |
| settle | centre | **−1.60** |

Dense sampling of the real timeline: **30.6% of samples overlapped** the reading column, each act
spending 41–67% of its span with the object over the text — peaking exactly where that section's
heading is held, with no plate behind it.

The clearance test that claimed to guard this iterated `ACTS`, i.e. the six act **endpoints**,
which are clean by construction. The tween between them was never sampled.

Fixed by giving the lateral tween its own duration (`LATERAL_SETTLE = 0.22`): the object crosses in
the first fifth of an act, then holds clear. Re-measured independently: **6.1%** of samples overlap.
A dense-sampling test now guards it, negative-controlled against the full-duration crossing.

## 3. Composition and scroll

```
scroll length        20.6 screens (2060vh)          was 9
section sides        center / left / right / left / right / center
object screen x      26.6% - 73.4% across the acts
plates behind text   none (checked property-level, not by substring)
stroked text         none
```

## 4. The visual language

Deleted and confirmed absent from `src/styles/` and `index.html`: the graph-paper grid, the
`--rule` hairline token, `backdrop-filter`, CSS counters for section indices, label leader lines,
every `-webkit-text-stroke`, and Space Grotesk.

Fonts now Instrument Serif (display) + Inter (body), with Space Mono surviving only on the 3D part
labels.

Hero contrast, measured **against live canvas pixels** rather than the CSS background: **1.11:1 →
15.85:1** desktop, 7.24:1 mobile. The 1.11:1 reading is what had forced a 3px text stroke onto the
title; the real cause was that the arrival act centred the text on a centred object. Fixed
compositionally — the object lifts clear (`y 0.55`, `camZ 6.2`) and occupies the top ~65%, with the
title beneath it on near-black. No stroke needed.

## 5. Bugs this record exists to remember

Three defects passed a green suite on this branch and were caught by reading or by mutation, not by
measurement:

1. **The camera aimed at the object.** It then projected that same point through that same camera,
   so the light spill read exactly 50% forever — and worse, the object was pinned to screen centre
   in every act, so the lateral offset moved it in world space but never on screen. Fixed by aiming
   at a fixed world origin.
2. **The orbit-radius test was tautological.** `hypot(R·sinθ, R·cosθ) ≡ R` for any θ, so the orbit
   angle had no coverage at all.
3. **The clearance test sampled only act endpoints**, which are clean by construction. See §2.

Each now has a guard that was confirmed to fail under the exact mutation.

## 6. Ownership

```
anime.js     tilt.rotation.{x,z}, tilt.position.{x,y}, part .position,
             camera.position.{x,z}, state.spinRate, state.labelOpacity
render loop  spinner.rotation.y, spinMesh.rotation.y, camera.quaternion
             reads state.spinRate only
```

Mutating the aim target back to the object now fails a source-inspection guard. `tests/lifecycle.test.js`
greps all of `src/` and fails on any `engine` import or `engine.pause(` call.

## 7. Not verified, and not implemented

**Live scroll-driven scrubbing is unverified.** This host fires zero `scroll` events and zero
animation frames — measured directly on an earlier build: a bare scroll listener received 0 events
across a real 3000 px scroll, and a bare `requestAnimationFrame` loop 0 ticks in 900 ms, with
`document.hidden === true`. Every timeline figure above was taken by seeking the timeline directly
or by calling the app's own `entrance.skip()`. **That is a synthetic stand-in and is labelled as
such.** The wiring is verified; tick delivery is not.

The preview pane also will not recomposite after a scroll jump, so screenshots below the hero could
not be taken. Those sections were verified through the DOM and through framebuffer readback instead.

**Spec §4's mobile recipe is not implemented.** The spec says the object should hold the upper band
with text flowing beneath at narrow widths. Instead the canvas is dimmed to 30% opacity and text
shadows are re-added under 768px — text over a dimmed object, which is the pattern the client
rejected, mitigated rather than composed away. Contrast there measures ~7.4:1 so it is not an
accessibility failure, but it is a spec gap and should be treated as outstanding work.

## Outstanding for a human on a real machine

1. Watch the entrance, then scrub all six acts end to end at a real frame rate.
2. Confirm the object never visibly crosses the text — 6.1% of samples still overlap, all of them
   mid-crossing at act boundaries.
3. Toggle OS reduced-motion: the object should sit assembled, in profile, labels visible, no scrub.
4. Disable WebGL: `data-stage="unsupported"` should show the static SVG diabolo.
5. Tab through every interactive element and confirm `:focus-visible` is legible over the object.
6. Decide whether §7's mobile gap is worth closing before this goes live.
