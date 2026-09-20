# Violet Diabolo — wireframe object, four rooms

**Date:** 2026-09-19
**Status:** approved
**Supersedes the object material and choreography of:** `2026-09-11-violet-diabolo-six-act-revamp-design.md`
**Leaves intact:** content inventory, asset pipeline, lifecycle, geometry profiles, the `tilt`/`spinner` nesting, the labels layer, the entrance

---

## 1. What is being replaced, and why

The client's words: *"I don't really like the setup so far."* Two things underneath that.

**The object is wrong.** It is glossy translucent violet plastic with a clearcoat, a transmission pass
and an image-based environment. The references are the opposite: a flat, minimal, no-highlight
rendition (ref 1), presented as a dark constructed assembly (ref 2). The material is carrying an
idea nobody asked for.

**The rhythm is wrong.** The page is one unbroken scrub from top to bottom. on.energy — the layout
reference — has **discrete rooms** you move between: a hero, a panel that slides up over it, a
showcase, a grid. That difference explains the reaction better than any single detail does.

## 2. The object — flat matte with edge lines

`MeshPhysicalMaterial` becomes `MeshBasicMaterial`: unlit, flat, no specular, no gradient, no glass.
Each part gains a `LineSegments` edge overlay built from `EdgesGeometry`.

**Low-poly is a requirement, not a style choice — and the numbers are measured, not guessed.** My
first reasoning here was wrong in both directions and the measurement corrected it.

`EdgesGeometry(geometry, threshold)` includes a facet boundary when the angle between adjacent face
normals exceeds `threshold`. At the default 1°, *every* boundary on a lathe qualifies, so a dense
mesh produces a dense mesh of lines — not "only the rim circles" as I first assumed. Measured on a
single cup:

| profile pts | radial segs | edge lines | reads as |
|---|---|---|---|
| 24 | 128 | 5120 | solid noise |
| 24 | 20 | 840 | still noise |
| **8** | **12** | **204** | a wireframe |
| 6 | 10 | 130 | sparse but legible |

Raising the threshold instead is a trap: at 20° a smooth lathe drops to 40 lines and the wireframe
disappears entirely.

So **both** counts come down: profile points to **8** (from 96–128) and radial segments to **12**,
with the default 1° threshold. That is what yields a countable, constructed object — and it produces
ref 2's faceting as a side effect rather than as a separate treatment.

**One blocker to clear first:** `src/diabolo/build.js` currently computes
`radialSegments = Math.max(24, Math.round(segments * 0.75))`. That floor of 24 silently overrides any
lower request, so the segment change has no effect until the floor is lowered.

**Form is carried by flat colour per part**, as in ref 1, since an unlit object has no shading to
read. One accent only, following on.energy's discipline:

| Part | Fill |
|---|---|
| cups | pale lavender |
| hub cones | near-black |
| bearing | silver |
| gaskets | **red** — the single accent, matching ref 1 |
| edges | a lighter tint of each part's fill |

The gasket moves from cyan to red. Cyan was chosen for a glossy object lit by an environment map; red
is what the reference uses and it holds better against violet.

### How animejs.com actually does it — and why we deliberately differ

Verified by parsing `module-engine-01.glb` and their app bundle, not assumed.

**They use no wireframe geometry at all.** Their meshes are triangles only — primitive modes came
back `{"4": 1}`, no `LINES` or `LINE_STRIP` — with 3,890 triangles, baked `COLOR_0` vertex colours,
normals, and zero textures. The `.glb`'s own material is an exporter default (`metallic 0.5`,
`roughness 0.5`, no base colour), so the app overrides it at runtime.

What produces the look in ref 2 is a **custom rim/contour shader plus post-processing**:

```
outlineThickness: 1, outlineBlend: 0.4, contourBlend: 0.65,
rimIntensity: 1, rimThreshold, verticesNormalMix

outlineMaterial = new …({ vertexColors: true })
outlineMaterial.onBeforeCompile = …          // shader injection

passes: outlinePass · luminancePass · mipmapBlurPass · effectPass
```

The "edges" are shader-detected silhouettes and rim light, not drawn lines. At 3,890 triangles the
model is also not low-poly.

**We are not copying this, and that is the decision.** The brief's ref 1 is a flat illustration with
no shading; on an unlit object, drawn edges are the only thing that makes form read. Matching ref 2
would mean a custom shader, a post-processing library as a new dependency, and a second render chain
to tune. The approach specced here will read as a *crisper, more explicit* wireframe than animejs —
which is closer to what was actually asked for, since they never built a wireframe at all.

Recorded so that a future reader does not mistake this for a failed attempt at the reference.

### What this deletes

An unlit material needs no lighting, so the following go entirely:

- `RoomEnvironment` and `PMREMGenerator` (and with them the render-target leak machinery that needed
  fixing twice)
- `createGradientTexture` and `GRADIENT_STOPS`
- `transmission`, `clearcoat`, `envMap`, `roughness`, `metalness` — every PBR property
- `TIER_SETTINGS.transmission`, which no longer gates anything

`src/diabolo/materials.js` is currently 121 lines. Most of it goes.

### The light spill goes too

`src/diabolo/spill.js` exists because a glossy object casts light onto the page. A flat unlit object
does not, and on.energy's ground is plain dark with nothing blooming on it. Keeping it would repeat
the mistake the grid made: decoration outliving the idea that justified it. It is referenced by 11
files; all of those references come out.

## 3. Four rooms

| Room | Pattern | Content | Object |
|---|---|---|---|
| **Hero** | full-bleed, nav pills, statement headline lower-left, teaser card lower-right | tagline and hook | large, cropped, idle spin |
| **Panel** | a solid panel slides up over the hero; hero dims behind it | ABOUT copy and an image | hidden behind the panel |
| **Showcase** | headline left, object right, pill button, copy beneath | EVENTS | **the explosion**, with part labels |
| **Grid** | sticky text left, cards right | media, board, contact, footer | absent or small |

Spans, as fractions of total page scroll:

| Room | Span | Sections |
|---|---|---|
| Hero | 0–12% | hero |
| Panel | 12–30% | about |
| Showcase | 30–55% | events + the explosion |
| Grid | 55–100% | media, board, contact, footer |

The Grid pattern repeats across the remaining sections, the way on.energy's does past its fourth
screen. Total page length stays near today's ~20 screens; the change is where the boundaries fall,
not how far you scroll.

The explosion stops being smeared across the whole page and becomes **one contained set piece** in
the Showcase room. That is the substantive change: rooms have edges, and a set piece that plays
inside one is legible in a way a page-long scrub is not.

## 4. Navigation

The page has no nav today and is roughly twenty screens long. That is a usability gap, not a style
borrow. Wordmark left; pills jumping to **About**, **Events**, **Media** and **Board**; one filled
call-to-action right reading **Join us** that targets the contact section. Every pill's target must
exist in the DOM — asserted in §8.

## 5. Placeholder imagery

The asset pipeline already produces four real club photographs — the USADA group shot, the wide stage
shot, and both board portraits. The Panel room uses those rather than grey boxes. Real images reveal
whether a layout works in a way placeholders cannot, and swapping them for the client's own photos
later is a one-line change per image.

## 6. Ownership

Unchanged in shape, minus the deletions:

```
anime.js     tilt.rotation.{x,z}, tilt.position.{x,y}, part .position,
             camera.position.{x,z}, state.spinRate, state.labelOpacity
render loop  spinner.rotation.y, spinMesh.rotation.y, camera.quaternion
             reads state.spinRate only
```

Edge `LineSegments` are children of their part's mesh, so they inherit its transform and introduce no
new owner. No property is written by two owners.

## 7. What carries over untouched

`src/content/index.js`, `scripts/build-assets.mjs`, `src/diabolo/lifecycle.js`,
`src/diabolo/profiles.js`, `src/diabolo/build.js`'s nesting, `src/diabolo/labels.js`,
`src/scroll/entrance.js`, and the `src/ui/` facades and semester switcher.

The work lands in `src/diabolo/materials.js` (gutted and rebuilt), `src/scroll/choreography.js`
(rewritten), `src/ui/sections.js`, and the three stylesheets (949 lines, substantially rewritten).
`src/diabolo/spill.js` is deleted.

## 8. Verification

Carries the previous record's discipline, including its honesty requirement. Every item is written to
be measurable, because this project has now shipped three defects that passed a green suite — a
tautological orbit-radius assertion, a light spill pinned at 50%, and a clearance test that sampled
only the six points where it happened to hold.

1. **The object is unlit.** No material in the scene declares `envMap`, `transmission`, `clearcoat`,
   `roughness` or `metalness`.
2. **Edges render, and in a readable quantity.** Every part has a `LineSegments` child, and its line
   count falls inside a band — roughly 100–450 per part. A non-zero check is not enough: the failure
   mode here is not "no edges" but "so many edges the object reads as solid", which is what 5120
   lines on a 128-segment cup looks like.
3. **One accent.** Exactly one part colour is the accent hue; no other saturated colour appears.
4. **The rooms are distinct.** Each room's scroll span is identifiable and the object's state differs
   between hero, showcase and grid.
5. **The explosion is contained.** Parts are assembled outside the Showcase room's span and fully
   apart inside it.
6. **No spill survives.** No file imports `spill.js`; no CSS references `--spill-x`.
7. **Nav reaches every section.** Every pill's target exists in the DOM.
8. **Ownership holds.** Nothing but the render loop writes `spinner.rotation.y`.
9. The known environment limit stands: this host delivers no scroll events and no animation frames,
   so any timeline measurement is taken by seeking directly and is **labelled synthetic**. Anything
   not observed is reported as not observed.
