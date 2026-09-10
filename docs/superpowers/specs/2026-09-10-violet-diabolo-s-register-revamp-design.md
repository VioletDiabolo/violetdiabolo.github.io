# Violet Diabolo — S-register revamp

**Date:** 2026-09-10
**Status:** proposed
**Supersedes the choreography and art direction of:** `2026-09-10-violet-diabolo-scroll-explosion-design.md`
**Leaves intact:** that spec's §8 content inventory, §8.2 asset pipeline, §6 lifecycle, §7 fallbacks

---

## 1. Why this exists

The first build shipped a working page but missed the reference. Three things were wrong:

1. **The explosion was sequential.** Parts detached one per section, in a queue. animejs.com separates its assembly **simultaneously**, as one coordinated motion. The queue was invented during planning; it is not in the reference.
2. **The object was only ever seen in profile.** It never turned. A diabolo seen down its own axis is a set of concentric circles — an entirely different and better first impression than the hourglass.
3. **No entrance.** The page simply appeared. animejs.com resolves its hero in.

Plus: the black axle is too long, there is no 2D-in-3D layer, and the spin is too subtle to register.

## 2. Register

**S (Spectacle) throughout — decided on instruction, no hedging.**

The previous spec scoped S to the hero spine and W to content. That scoping is withdrawn. Every
surface is now part of one realtime composition.

**This costs nothing in accessibility**, which is the reason it is safe to do: the 2D layer is a
`CSS3DRenderer`, and CSS3D elements are **real DOM**. Text inside them stays selectable, focusable,
translatable and screen-readable — it is merely transformed. Long-form copy (bios, event details)
stays in normal flow for line-length and scroll reasons; labels, indices, headings and callouts move
into 3D space.

## 3. Architecture — three layers

Mirrors the reference. Verified live on animejs.com: its `#engine` contains exactly this.

```
#engine
├── canvas#renderer     WebGL — Three.js, the diabolo
├── div#css-renderer    CSS3DRenderer — real DOM transformed in 3D space
└── div#labels-renderer CSS2D-style overlay — screen-space annotation
```

All three share one camera. The CSS3D layer is what makes this "2D and 3D combined" rather than
"3D with text on top".

## 4. Transform ownership — revised

The face-on-to-profile turn introduces a second rotation, which would collide with the spin if both
wrote the same object. Resolved by nesting, not by convention:

```
scene
└── tilt              anime.js owns .rotation.x   (face-on → profile, scroll-scrubbed)
    └── spinner       render loop owns .rotation.y (continuous spin)
        ├── Group:cupTop        ┐
        ├── Group:gasketTop     │
        ├── Group:hubConeTop    │ anime.js owns .position.y (axial explosion)
        ├── Group:axleBearing   │ and .rotation where a part tilts
        ├── Group:hubConeBottom │
        ├── Group:gasketBottom  │
        └── Group:cupBottom     ┘
```

**Invariant, unchanged from v1 and still binding:** no `Object3D` transform is written by two owners,
and the render loop never writes a scalar anime.js owns. The `state.spinRate` bridge stays: anime.js
writes it, the loop reads it.

`root` is renamed `spinner` and gains a parent. Everything else about the graph is unchanged.

## 5. Proportions

Measured, not estimated. The black axle assembly currently occupies **32.2%** of the object's total
height; the reference photograph is nearer 15–18%.

| | `hubHeight` | `bearingHeight` | total height | black % |
|---|---|---|---|---|
| current | 0.30 | 0.26 | 2.67 | **32.2%** |
| proposed | 0.12 | 0.14 | 2.19 | **17.4%** |

Every one of these lives in `DIMS` in `src/diabolo/profiles.js`, which exists precisely so the
silhouette can be retuned without touching scene code. `HOME` recomputes from them automatically.

## 6. The explosion — simultaneous, along the axle axis

All seven parts move **at the same time**, along the object's own axis, spaced by how far out they
sit in the assembly. One tween each, one shared duration. No queue.

Rank = distance from the centre in assembly order (bearing 0, hub cones 1, gaskets 2, cups 3):

```
y_exploded = HOME.y + sign(HOME.y) × rank × SPACING     SPACING = 0.55
```

| part | rest y | exploded y |
|---|---|---|
| `cupTop` | 0.235 | **1.885** |
| `gasketTop` | 0.190 | 1.290 |
| `hubConeTop` | 0.070 | 0.620 |
| `axleBearing` | 0.000 | **0.000** — the centre reference part does not move |
| `hubConeBottom` | −0.070 | −0.620 |
| `gasketBottom` | −0.190 | −1.290 |
| `cupBottom` | −0.235 | **−1.885** |

Even, readable spacing — a real exploded assembly drawing. The stationary bearing gives the eye an
anchor and gives the labels a fixed origin.

## 7. Orientation — face-on, then turning

The strongest idea in the brief, and true to the object.

- **At rest / entrance complete:** `tilt.rotation.x = -90°`. The camera looks straight down the
  axle. What you see is a set of **concentric circles** — the cup rim, the gasket ring, the bearing.
  It reads as a target, or a record, and gives away nothing about the silhouette.
- **As you scroll:** `tilt.rotation.x` eases from −90° to 0°, arriving at the familiar hourglass
  profile at the same time the explosion completes.

The turn and the explosion are two tweens on the same scrubbed timeline, so they resolve together.

## 8. Entrance

On load, before scroll has any say:

1. Parts begin scattered along the axis, far out and at zero opacity.
2. They converge onto the assembled object as opacity rises.
3. The 2D layer resolves in behind them — headings and mono indices.
4. On completion, the scroll timeline is attached.

**The entrance and the scroll timeline must never be live at once** — both write part positions, and
two timelines on one property fight. The scroll timeline is created in the entrance's completion
callback, not before. This is an ordering requirement, not a preference.

Reduced motion: the entrance is skipped entirely and the object is placed assembled and face-on.

## 9. Spin

Promoted from near-invisible to a real element. The `spinner` group turns continuously and visibly;
`state.spinRate` still scales it, and the bearing keeps its own faster local spin. A diabolo that
does not spin is a dead diabolo.

## 10. What carries over untouched

Not rebuilt, because none of it is what was wrong:

| Kept | Why |
|---|---|
| `src/content/index.js` | Verbatim club copy, byte-verified, apostrophe mix pinned by tests |
| `scripts/build-assets.mjs` | 11.3 MB → 240 KB AVIF, budget-enforced |
| `src/diabolo/lifecycle.js` | Correct, 13 tests, negative-controlled |
| `src/diabolo/materials.js` | 83% violet, PMREM leak fixed |
| `src/ui/{board,media,forms}.js` | Facades, focus handling, semester switcher |
| `src/fallback/detect.js` | WebGL + reduced-motion detection |
| Quality tier, resize, DPR handling | Independent of art direction |

`src/scroll/choreography.js` is **rewritten**, not patched — its per-part sequential-beat structure is
the wrong shape for a simultaneous explosion.

## 11. Verification

Carries forward the previous spec's discipline, and its honesty requirement.

1. Explosion is **simultaneous**: sample every part's `position.y` at three timeline points and
   confirm they are all in motion together, not in sequence.
2. Orientation resolves: `tilt.rotation.x` runs −90° → 0° across the scrub.
3. Entrance and scroll timelines are never both active.
4. Ownership holds: nothing writes `spinner.rotation.y` except the render loop; nothing writes
   `tilt.rotation.x` except anime.js.
5. Proportions: black region measures ~17% of total height.
6. CSS3D labels stay legible and their text stays selectable.
7. The previous record's known limitation stands: this environment delivers no scroll events or
   animation frames, so live scrubbing is measured with tick delivery substituted by hand, and
   labelled synthetic. Anything not observed is reported as not observed.
