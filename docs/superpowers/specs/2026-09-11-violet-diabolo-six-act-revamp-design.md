# Violet Diabolo — six-act revamp

**Date:** 2026-09-11
**Status:** approved
**Supersedes the choreography and art direction of:** `2026-09-10-violet-diabolo-s-register-revamp-design.md`
**Leaves intact:** content inventory, asset pipeline, lifecycle, fallbacks, geometry, materials, labels module, entrance

---

## 1. What was wrong

The S-register build fixed the mechanics — simultaneous explosion, the turn, the entrance — but three
things still missed.

1. **One act, not many.** The page went face-on → exploded and stopped. Roughly 9 screens of scroll.
   The reference runs **23.6 screens across ~17 acts** (measured on animejs.com). The spectacle rubric
   scores "competent sections with repeated reveals" at **2**, and reserves **3** for "multiple authored
   acts connected by deliberate transitions" and **4** for continuity that "carries state, material and
   composition forward". One act cannot reach 3.
2. **The object sat behind the text.** It stayed centred while content scrolled over it, so every
   heading needed a dark plate behind it to stay legible. The rubric calls this out directly:
   *content coexistence* — spectacle that still lets the visitor read the thing. Measured on
   animejs.com: `#engine` is `position: fixed; inset: 0`, exactly like ours — but its text sits in a
   **33%-wide column offset 6% from the left**, and the 3D is composed into what remains. Nothing
   overlaps, so nothing needs a plate. Our plates were patching a composition problem.
3. **Stock visual language.** A graph-paper grid, hairline rules, mono indices and leader lines is a
   recognisable off-the-shelf "technical diagram" look. The rubric's graphics-craft scale puts
   "technically competent but recognizable stock visual language" at 2 and reserves 4 for "camera,
   material, post and typography behaving as one designed language". Decorations, not a world.

## 2. The thesis — light is the only connective tissue

The ground is near-black with a violet undertone and **nothing drawn on it**. A soft radial bloom
tracks the object's projected screen position every frame: when the object drifts right, the light on
the page drifts right with it. The page is lit *by* the object rather than decorated to match it.

This is the one idea that replaces the grid, the rules, the plates and the indices. A grid is applied
to a page; light is emitted by its subject. Only the second is a system.

### Deleted outright

| Removed | Currently in |
|---|---|
| graph-paper grid | `base.css`, `sections.css` |
| every hairline rule (`--rule`) | `base.css`, `sections.css`, `stage.css` |
| contrast plates behind text | `base.css`, `sections.css` |
| `01 /` mono section indices (CSS counters) | `sections.css`, `stage.css` |
| label leader lines | `stage.css` |

### Typography

Space Grotesk + Space Mono is a *technical* pairing and is part of what reads as tacky. Replaced:

- **Display: Instrument Serif.** High-contrast, editorial, and genuinely unexpected against glossy
  violet plastic — which is what makes it memorable rather than templated.
- **Body: Inter.** Clean and modern, so the serif reads as elevated rather than stuffy.
- **Mono survives in exactly one place:** the part labels annotating the 3D object, where annotating
  a machined object in mono is actually apt. It leaves the section headings entirely.

Both faces are on Google Fonts, loaded the same way the current pair is. Every face keeps a real
fallback stack.

## 3. Six acts

Each act owns a scroll span. Scroll progress maps onto one master timeline as it does today; the acts
are positions on that timeline, not separate timelines.

| # | Act | Span | Object | Camera | Text |
|---|---|---|---|---|---|
| 1 | **Arrival** | 0–10% | assembled, face-on, spin ramps up | centred, `z 5.4` | title, centred |
| 2 | **Apart** | 10–32% | parts separate; labels fade in | withdraws to `z 10`; object drifts **right** | ABOUT, left |
| 3 | **Recombine** | 32–52% | parts converge *while* turning to profile | closes to `z 7`; object drifts **left** | EVENTS, right |
| 4 | **Spin** | 52–70% | assembled, profile, spinning hard, axle tipped off vertical | holds `z 7`; object **right** | MEDIA, left |
| 5 | **Orbit** | 70–88% | camera circles the object | orbits a quarter turn; object **left** | BOARD, right |
| 6 | **Settle** | 88–100% | returns face-on, small, spin winds down | `z 6`, centred | CONTACT, footer |

Spans are fractions of the single scrubbed timeline. Act 1 is deliberately the shortest — it is an
establishing beat, not a hold — and Acts 2 and 3 are the longest because they carry the two motions
a visitor is most likely to describe afterwards.

Front → exploded → recombine into side view → spin → orbit → settle.

**Target length: ~20 screens**, against today's ~9. Section heights are sized to give each act room;
an act that resolves in less than roughly two screens reads as a jump cut rather than a transition.

**Act 4's tilt, concretely.** A diabolo in play does not sit perfectly upright on its string; the axle
tips a few degrees off vertical and precesses. Act 4 tips `tilt.rotation.z` to roughly 8° and lets it
drift slowly while the object spins. It is the one act that references the object in actual use rather
than as an exhibit.

**Transitions carry state forward.** Act 3 does not replay Act 2 backwards — the parts converge *while*
the object turns, so the recombination and the reveal of the profile are one motion. That is the
difference the rubric draws between "repeated reveals" and "transitions carry state, material and
composition forward".

## 4. Composition — nothing overlaps

- Text column narrows to **~38%** and sits opposite wherever the object is.
- The object crosses sides between acts, so the reading column always has clear space.
- **No plates anywhere**, because there is nothing to protect text from.

At mobile widths the object cannot share a row with the text. There the object holds the upper band of
the viewport and the text flows beneath it, with the light spill still coupling them. The acts survive;
the side-crossing does not, and that is the intended mobile recipe rather than a degraded desktop one.

## 5. Scroll drives the spin

`state.spinRate` is already a scalar anime.js owns and the render loop only reads, so this is wiring,
not new architecture. Across the acts: ramp up on arrival → **slow** through Act 2 while the labels are
meant to be readable → hard through Act 4 → wind down in Act 6. The object never stops; scroll changes
how fast.

## 6. Ownership — extended, and stated rather than left to drift

Acts need lateral movement and a camera orbit, which means two properties nothing currently writes.

```
anime.js owns   tilt.rotation.x, tilt.position.x,
                each part Group's .position,
                camera.position.x, camera.position.z,
                state.spinRate, state.labelOpacity
render loop owns spinner.rotation.y, the bearing's spinMesh.rotation.y
                 and reads state.spinRate only
```

No `Object3D` property is written by two owners, and the render loop still writes no scalar. `tilt`
gains a second anime-owned property; that is the same owner, not a new one.

## 7. What carries over untouched

`src/content/index.js`, `scripts/build-assets.mjs`, `src/diabolo/lifecycle.js`,
`src/diabolo/materials.js`, `src/diabolo/profiles.js`, `src/diabolo/build.js`,
`src/diabolo/labels.js`, `src/scroll/entrance.js`, and the `src/ui/*` facades and switcher.

The work concentrates in `src/scroll/choreography.js` (one act becomes six), the three stylesheets
(~1000 lines, substantially rewritten), and the section layout in `src/ui/sections.js`.

## 8. Verification

Carries the previous record's discipline, including its honesty requirement.

1. **Acts are distinct.** Sample the timeline at each act boundary and confirm the object state differs
   — position, camera and assembly separately, not just "something moved".
2. **Recombination is not a rewind.** At the midpoint of Act 3 the parts must be converging *and* the
   turn underway simultaneously.
3. **Nothing overlaps.** At every act, the text column's bounding box and the object's projected
   bounding box must not intersect. Measure, do not eyeball.
4. **No plates survive.** Assert no element between the text and the canvas paints a background.
5. **Spin is scroll-coupled.** `state.spinRate` differs measurably between acts.
6. **Ownership holds.** Nothing but the render loop writes `spinner.rotation.y`.
7. **Scroll length** is at least 18 screens at a 1440×900 viewport.
8. **Light spill tracks the object** — the bloom's centre follows the object's projected position.
9. The known environment limit stands: this host delivers no scroll events and no animation frames, so
   any timeline measurement taken by seeking directly is **labelled synthetic**. Anything not observed
   is reported as not observed.
