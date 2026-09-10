# Violet Diabolo — Scroll-Explosion Site

**Date:** 2026-09-10
**Status:** Approved (design), pending implementation plan
**Skill routing:** `creative-frontend-architect` (register, rendering architecture, adopt-vs-build) → `frontend-design` (visual thesis, owned separately)

---

## 1. Goal

Rebuild <https://violetdiabolo.github.io/> as a single continuous scroll page whose spine is a
scroll-scrubbed **exploded-view diagram of a purple diabolo**, rendered as real 3D geometry.

All content and imagery is carried over from the existing site. The existing site's visual
structure is explicitly **not** carried over — it is a content source only.

### Success criteria

1. Scrolling the page drives a diabolo from assembled → fully exploded → reassembled, continuously
   and reversibly, with no cuts.
2. The diabolo is solid geometry. **Not particles.** (Explicit user constraint.)
3. Every piece of content from the source site is present and readable.
4. The 3D system does no work when its surface is offscreen or the document is hidden, verified
   under real conditions.
5. Output is static files deployable to `violetdiabolo.github.io` with no server.

### Non-goals

- No CMS, no backend, no auth.
- No redesign of the two Google Forms (embedded as-is, lazily).
- No new photography or video. No board-roster content authoring beyond what exists.

---

## 2. Register decision

**S (Spectacle) for the hero spine; W (Expressive) for content sections.**

Decided rather than asked: the brief grants open license ("super cool"), names a spectacle-register
reference (animejs.com), and specifies a realtime system whose state is materially driven by user
interaction (scroll position). Per `creative-frontend-architect` non-negotiable 4, S was weighed
explicitly and **chosen knowingly**.

The choice is scoped, not global. Board bios, video listings and forms are ordinary readable
content and stay in W — legible type, restrained motion, no 3D dependency to read them.

**Cost accepted:** a WebGL dependency and ~150 KB gzipped of Three.js on the critical path. Bought
deliberately; mitigated by the fallbacks in §7.

---

## 3. Adopt-vs-build record

Primitive sought: *a scroll-scrubbed exploded assembly of a surface-of-revolution object.*

| Source | Closest primitive | Verdict |
|---|---|---|
| React Bits | `ModelViewer` (Three.js viewer, orbit controls, lighting presets); `ScrollReveal`, `AnimatedContent` | **reference-only** — a viewer for a *supplied* model, not a scrubbed exploded assembly. React-only; MIT + Commons-Clause, not plain MIT. Lighting-preset approach worth studying. |
| Magic UI | `Floating 3D Particles`, `Globe`, `Icon Cloud` | **poor fit** — all particle-based, which the brief rules out. |
| Aceternity UI | landing-section compositions | **poor fit** — no 3D assembly primitive. Search bounded and stopped here; evidence sufficient. |

**Verdict: custom build on the Three.js substrate.** No catalog carries this primitive.

Catalogs supply ingredients, never art direction. Substrates selected: Three.js (rendering),
anime.js v4 (timelines + scroll scrub).

---

## 4. Rendering architecture

### 4.1 Stack

- **Three.js** `^0.186` — rendering only.
- **anime.js** `^4.5` — owns *every* timeline and the scroll scrub.
- **Vite** `^8.2` — static build; no framework runtime.

Rationale for mirroring animejs.com's stack: it is the named reference, and it is the correct pairing
independently — anime.js v4's `onScroll` is a first-class scrubber, and Three.js is the only substrate
here that renders translucent solids honestly.

**No second animation engine.** GSAP and Motion are excluded by one-owner-per-concern, not by taste.

### 4.2 Ownership of transforms

The failure mode this guards against: idle rotation and explosion offsets both wanting to write the
same object's transform. Resolved structurally rather than by convention.

```
scene
└── root                      ← render loop owns root.rotation.y  (idle spin only)
    ├── Group:cupTop          ┐
    ├── Group:gasketTop       │
    ├── Group:hubConeTop      │  anime.js owns .position and .rotation
    ├── Group:axleBearing     │  (explosion offsets, scroll-scrubbed)
    ├── Group:hubConeBottom   │
    ├── Group:gasketBottom    │
    └── Group:cupBottom       ┘
```

`axleBearing` additionally spins on its own local axis. That spin is owned by the **render loop**, on
a child mesh inside the group — anime.js writes the group, the loop writes the mesh. Still one owner
per object.

The bearing visibly speeds up during the Media section (§5). That is **not** a second writer: the
timeline animates a plain scalar `state.spinRate`, and the render loop *reads* it to advance the mesh.
anime.js writes numbers it owns; the loop writes transforms it owns. The same applies to `root`'s idle
spin, which the loop drives continuously and which **does not stop** while the object is exploded.

**Invariant:** no `Object3D` transform is written by both owners, and no scalar is written by the
render loop. Any future part must declare its owner.

### 4.3 Geometry — procedural, no model assets

A diabolo is a surface of revolution, so every part is `LatheGeometry` generated from a 2-D profile
curve at build/init time. **Zero `.glb`/Draco assets to fetch** (animejs.com ships Draco-compressed
models; this page does not need to).

Part inventory, from the supplied reference photo:

| # | Part | Geometry | Material |
|---|---|---|---|
| 1 | `cupTop` | Lathe, bowl profile | translucent purple→milky gradient, clearcoat |
| 2 | `gasketTop` | Lathe, thin ring | cyan/teal, semi-gloss |
| 3 | `hubConeTop` | Lathe, cone | matte black |
| 4 | `axleBearing` | Cylinder + fine grooves | chrome, metalness 1.0 |
| 5 | `hubConeBottom` | mirror of 3 | matte black |
| 6 | `gasketBottom` | mirror of 2 | cyan/teal |
| 7 | `cupBottom` | mirror of 1 | translucent purple→milky gradient |

Profile curves live in one module as plain coordinate arrays so the silhouette can be tuned without
touching scene code.

### 4.4 Materials and lighting

`MeshPhysicalMaterial` with `clearcoat`, plus a canvas-generated purple→white gradient map for the
cups. Lit by `RoomEnvironment` through `PMREMGenerator` — **procedural IBL, no HDR asset download**.
This is what gives moulded plastic its highlights; flat lights read as clay.

`transmission` (true glass refraction) is **gated to the `high` quality tier**. It forces an extra
render pass per frame and is the most expensive single feature on the page.

**Quality tiers** (resolved once at init, in `stage.js`):

| Tier | Condition | DPR cap | `transmission` | Lathe segments |
|---|---|---|---|---|
| `high` | pointer is `fine` **and** viewport ≥ 1024 px **and** `deviceMemory` unreported or ≥ 8 | 2.0 | on | 128 |
| `base` | everything else | 1.5 | off | 64 |

Tier is decided from capability signals only, never from user-agent sniffing. `base` is the default
if any signal is unavailable.

---

## 5. Scroll choreography

One master anime.js timeline, scrubbed:

```js
createTimeline({ autoplay: onScroll({ sync: 0.15, target: stage, enter: 'top top', leave: 'bottom bottom' }) })
```

`sync: 0.15` smooths the scrub so the object glides rather than snapping to raw scroll delta.

The canvas stage is `position: sticky` behind the content column. As each part reaches its resting
place, a thin annotation stroke and monospace label draw out to the adjacent section heading —
**exploded technical diagram**, not a burst.

| Scroll section | Diabolo state |
|---|---|
| **Hero** | assembled, slow idle spin |
| **About** | `cupTop` peels away and labels itself |
| **Events** | `gasketTop` + `hubConeTop` separate |
| **Media** | `axleBearing` floats out, spinning fast |
| **Board** | `hubConeBottom` + `gasketBottom` separate |
| **Contact** | `cupBottom` drops away — fully exploded |
| **Footer** | snaps back together |

Reversible: scrolling up runs the same timeline backwards. No state outside timeline position.

---

## 6. Lifecycle — hard requirement

Per `creative-frontend-architect` non-negotiables 1 and 2.

### 6.1 Pausing

- `IntersectionObserver` on the sticky stage → `stageVisible`.
- `visibilitychange` listener → `docVisible`.
- When `!(stageVisible && docVisible)`: **`cancelAnimationFrame(rafId)`, set `rafId = null`, and stop
  scheduling**; also `tl.pause()`. Re-entry restarts the loop.
- Skipping work *inside* a still-scheduled rAF is **not** pausing and does not satisfy this.

### 6.2 The shared-ticker trap

**Do not pause anime.js's global engine ticker.** Content-section reveals are also anime.js timelines
and may still be onscreen; killing the shared ticker to "pause" the 3D would freeze visible content
too. Pause only the 3D timeline and the 3D rAF.

This is the Pixi `Ticker.system` trap from the skill, in a different library. Assume any engine not
written here runs a ticker until verified, and check *what that ticker drives* before stopping it.

### 6.3 Verification — real conditions only

- "Pauses when scrolled away" is verified by **actually scrolling it away**, not by toggling a flag.
- "Pauses when hidden" is verified by **actually backgrounding the tab**, not by dispatching
  `visibilitychange`.
- Install a global `requestAnimationFrame` wrapper to **discover** surviving activity, then
  **attribute** each surviving callback to a specific source. A nonzero global count is evidence to
  explain (unrelated visible animation), **not** a verdict.
- Any condition the environment cannot produce is reported as such, and any stand-in is labelled
  synthetic. No mitigation is reported that was not observed working.

---

## 7. Fallbacks

| Condition | Behaviour |
|---|---|
| `prefers-reduced-motion: reduce` | Diabolo renders assembled and static; no scrub. Sections appear with no motion. |
| No WebGL | CSS/SVG diabolo still image. All content fully reachable. |
| Mobile / low-power | DPR capped at 1.5, `transmission` off, coarser lathe segments. |

Content is never gated behind the 3D system. The page is fully readable with the canvas absent.

**First paint.** The content column is server-static HTML and renders before Three.js parses. The
sticky stage reserves its box in CSS from the start, so the canvas mounting causes **no layout shift**.
Three.js is loaded as a deferred module; a failure to load leaves the no-WebGL still in place rather
than an empty stage.

---

## 8. Content inventory

Recovered in full by cloning `github.com/violetdiabolo/violetdiabolo.github.io`. Nothing outstanding.

| Section | Source | Notes |
|---|---|---|
| Hero | `VIOLET DIABOLO` / `PREMIER DIABOLO TEAM AT NYU` | |
| About | founding paragraph (Spring 2019, NYU's award-winning Chinese Yo-Yo team, Hell's Kitchen, AAPI cultural promotion) | verbatim |
| Events | Saturdays 1–3 PM, Kimmel 606; first practice Sept 20; equipment provided; all experience levels | verbatim |
| Media | 10 YouTube entries with titles and IDs | click-to-load thumbnails |
| Board | 5 semesters (Fall 2023 → Fall 2025); Aaron Hui, Jonathan Sun | semester switcher retained |
| Contact | `violetdiabolo@gmail.com`, Linktree | |
| Forms | Performance/Teaching Request; Interest Form | lazily mounted on click |
| Socials | Instagram, YouTube, NYU Engage, GitHub | `engage.svg` carried over |
| Footer | `VIOLET DIABOLO <year>` | year computed, not hardcoded |

### 8.1 Content judgment calls (approved)

1. **Placeholder board entry.** The third slot in every semester is named `"N/A"` and hotlinks a
   Google CDN (`encrypted-tbn0.gstatic.com`) thumbnail. Rendered instead as an honest "more board
   members coming soon" card; hotlink dropped (unreliable, and not the club's asset).
2. **Video embeds.** 10 live iframes would dominate page weight. Replaced with click-to-load
   thumbnails (facade pattern).
3. **Google Forms.** Mounted on interaction rather than on load, same reason.

### 8.2 Asset pipeline

| Asset | Size | Action |
|---|---|---|
| `vdgroupphotousadc.png` | **11.3 MB** | responsive AVIF/WebP, multiple widths |
| `usadcphoto.png` | 3.1 MB | responsive AVIF/WebP |
| `aaron_boardphoto.jpg` | 110 KB | resize + WebP |
| `jon_boardphoto.jpg` | 271 KB | resize + WebP |
| `logo.png`, `engage.svg` | small | carried over as-is |

Shipping the 11 MB PNG is not acceptable at any register.

---

## 9. Design direction

The **visual thesis, typography, layout, palette and final critique belong to the design director**
(`frontend-design` skill), invoked during implementation. This architect does not set style and must
not act as a second director.

Architectural constraints only:
- One saturated element — the diabolo — against a near-black stage.
- NYU violet as the palette anchor.
- Technical-diagram annotation language (thin strokes, monospace labels) as the connective tissue
  between the 3D spine and the content column.

---

## 10. Module boundaries

Each unit has one purpose, a stated interface, and is understandable without reading its siblings.

| Module | Purpose | Depends on |
|---|---|---|
| `diabolo/profiles.js` | 2-D profile coordinate arrays per part | — |
| `diabolo/materials.js` | material + gradient-map + env-map construction | three |
| `diabolo/build.js` | assembles the 7 groups into `root` | profiles, materials |
| `diabolo/stage.js` | renderer, camera, resize, quality tier | three, build |
| `diabolo/lifecycle.js` | IO + visibility → start/stop rAF and timeline | stage |
| `scroll/choreography.js` | the master scrubbed timeline | anime, build |
| `content/*.js` | section data extracted from source site | — |
| `ui/*.js` | section rendering, semester switcher, video/form facades | content |

Rule: `content/*` holds no markup, `ui/*` holds no 3D, `diabolo/*` holds no copy.

---

## 11. Verification plan

1. **Behavioural (real conditions):** scroll stage fully offscreen → confirm 3D rAF stopped and
   attributed; background the tab → same. Report observed evidence.
2. **Scrub integrity:** drive scroll to each checkpoint, screenshot, confirm reversibility upward.
3. **Fallbacks:** reduced-motion path; WebGL-disabled path; confirm all content readable in both.
4. **Responsive:** 375 / 768 / 1440.
5. **Weight:** report final gzipped bundle and largest image actually shipped.
6. **Links:** every outbound link and both form URLs resolve.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Lathe profile reads as a bowl, not a diabolo | Profiles isolated in one module; iterate against the reference photo |
| `transmission` tanks mid-range GPUs | Gated to desktop-high tier; default off |
| Scrub feels laggy or rubber-bandy | `sync` value tuned empirically; fall back to lower smoothing |
| Sticky canvas + iOS Safari address-bar resize | Use `dvh`, listen to `visualViewport` |
| anime.js engine keeps a ticker alive after `tl.pause()` | Verified empirically per §6.3, not assumed |
