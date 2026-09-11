# Violet Diabolo Six-Act Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single explode act into six authored acts across ~20 screens, move the object out from behind the text so its contrast plates can be deleted, drive the spin from scroll, and replace the technical-drawing language with an editorial one lit by the object itself.

**Architecture:** The acts become **data**, not hand-written tween calls — one frozen `ACTS` table of target states that the timeline is generated from, so the choreography is tunable and testable without a browser. A light-spill overlay projects the object's screen position each frame and drives a CSS bloom, coupling page and object through light rather than through drawn rules.

**Tech Stack:** Three.js 0.186 (WebGL + CSS3DRenderer) · anime.js 4.5 (all timelines) · Vite 8 · Vitest 5

**Spec:** `docs/superpowers/specs/2026-09-11-violet-diabolo-six-act-revamp-design.md`

**Starting state:** `main`, 165 tests passing, `npm run build` clean.

## Global Constraints

Every task's requirements implicitly include this section.

- **One owner per transform.** anime.js owns `tilt.rotation.x`, `tilt.rotation.z`, `tilt.position.x`, every part `Group`'s `.position`, `camera.position.x`, `camera.position.z`, `state.spinRate`, `state.labelOpacity`. The render loop owns `spinner.rotation.y`, the bearing's `spinMesh.rotation.y`, and `camera.quaternion` (via `lookAt`), and *reads* the scalars only. No property written by two owners.
- **The entrance and the scroll timeline are never live at once.** Both write part positions. The scroll timeline is created inside the entrance's completion callback.
- **Never pause anime.js's global engine.** A test greps all of `src/` and fails on any `engine` import or `engine.pause(`/`engine.resume(` call.
- **No second animation engine.** Three.js renders, anime.js animates.
- **Module boundaries:** `content/*` no markup, `ui/*` no 3D, `diabolo/*` and `scroll/*` no club copy. A test fails if club copy is hardcoded into a `ui/` module.
- **Do not edit the copy in `src/content/index.js`.** Verbatim club text with a deliberate curly/ASCII apostrophe mix pinned by tests. New exports are fine; edits to existing strings are not.
- **Content is never gated behind the 3D system** — every section readable with WebGL disabled.
- **Nothing paints a background behind body text.** The plates are being deleted precisely because the composition no longer needs them; re-adding one is a regression, and a test asserts it.
- All 165 existing tests keep passing. `npx vitest run` before every commit.

## File Map

| Path | Change |
|---|---|
| `src/scroll/choreography.js` | **rewritten** — `ACTS` data table, timeline generated from it (Task 1) |
| `src/diabolo/stage.js` | render loop calls `camera.lookAt` (Task 2) |
| `src/diabolo/spill.js` | **new** — light-spill overlay (Task 3) |
| `src/main.js` | register the spill overlay (Task 3) |
| `src/ui/sections.js` | act-aligned section sides (Task 4) |
| `src/styles/base.css` | **rewritten** — editorial type scale, no grid (Task 5) |
| `src/styles/sections.css` | **rewritten** — 38% column, no plates, no rules (Task 5) |
| `src/styles/stage.css` | label restyle, spill layer (Tasks 3, 5) |
| `index.html` | font links, spill element (Tasks 3, 5) |

## Measured values this plan depends on

Computed against the real `DIMS` and `CAMERA_FOV = 34` before writing, not estimated:

| Quantity | Value |
|---|---|
| assembled half-extent | 1.095 |
| exploded half-extent | 2.510 |
| visible half-height at `z` 5.4 / 7 / 10 | 1.65 / 2.14 / 3.06 — every act frames with ≥15% margin |
| orbit at 40°, radius 7 | `camX 4.500`, `camZ 5.362` |
| lateral offset 1.6 | object near edge at 56–59% against a 0–38% text column |

---

### Task 1: Acts as data, and the choreography generated from them

The current module hand-writes one act as a sequence of `timeline.add` calls. Six acts written that way would be ~40 opaque lines. Instead the acts become a frozen table of **target states**, and the timeline is generated from it — which is what makes the choreography testable without a browser and tunable without touching timeline code.

**Files:**
- Rewrite: `src/scroll/choreography.js`
- Rewrite: `tests/choreography.test.js`
- Modify: `tests/choreography.dom.test.js`

**Interfaces:**
- Consumes: `HOME` from `../diabolo/build.js`; `CAMERA_NEAR_Z`, `CAMERA_FAR_Z` from `../diabolo/stage.js`
- Produces:
  - `ACTS: readonly Act[]` where `Act = { id, end, explode, tiltX, tiltZ, x, camX, camZ, spin, labels, textSide }`
  - `PART_RANK`, `SPACING`, `FACE_ON_X`, `PROFILE_X`, `SCRUB_DURATION`, `explodedY` — unchanged from today
  - `LATERAL_OFFSET = 1.6`
  - `partYAt(partId, explode): number` — pure; interpolates rest → exploded
  - `createChoreography({ parts, tilt, state, camera, scrollTarget }): { timeline, dispose }`

`end` is the fraction of the scrub at which the act's state is reached. `explode` is 0 (assembled) to 1 (fully apart). `textSide` records which side the reading column occupies during that act, so a test can assert the object is on the other one.

- [ ] **Step 1: Write the failing test**

Replace `tests/choreography.test.js` entirely:

```js
import { describe, it, expect } from 'vitest';
import {
  ACTS, SPACING, FACE_ON_X, PROFILE_X, LATERAL_OFFSET, explodedY, partYAt,
} from '../src/scroll/choreography.js';
import { HOME } from '../src/diabolo/build.js';
import { CAMERA_NEAR_Z, CAMERA_FAR_Z, CAMERA_FOV } from '../src/diabolo/stage.js';
import { DIMS, PART_IDS } from '../src/diabolo/profiles.js';

const byId = () => Object.fromEntries(ACTS.map((a) => [a.id, a]));

describe('ACTS', () => {
  it('names the six acts in order', () => {
    expect(ACTS.map((a) => a.id)).toEqual(
      ['arrival', 'apart', 'recombine', 'spin', 'orbit', 'settle'],
    );
  });

  it('covers the whole scrub without gaps or overlap', () => {
    for (let i = 1; i < ACTS.length; i++) {
      expect(ACTS[i].end).toBeGreaterThan(ACTS[i - 1].end);
    }
    expect(ACTS.at(-1).end).toBe(1);
  });

  it('gives every act enough room to read as a transition rather than a cut', () => {
    let previous = 0;
    for (const act of ACTS) {
      expect(act.end - previous, `${act.id} is too short to register`).toBeGreaterThanOrEqual(0.08);
      previous = act.end;
    }
  });

  it('starts face-on and assembled', () => {
    expect(ACTS[0].explode).toBe(0);
    expect(ACTS[0].tiltX).toBeCloseTo(FACE_ON_X, 10);
  });

  it('explodes only in the apart act, then recombines', () => {
    const a = byId();
    expect(a.apart.explode).toBe(1);
    expect(a.recombine.explode).toBe(0);
    expect(a.spin.explode).toBe(0);
  });

  it('reaches profile at the recombine act and holds it through the spin', () => {
    const a = byId();
    expect(a.recombine.tiltX).toBeCloseTo(PROFILE_X, 10);
    expect(a.spin.tiltX).toBeCloseTo(PROFILE_X, 10);
  });

  it('returns face-on to close, so the page ends where it began', () => {
    expect(ACTS.at(-1).tiltX).toBeCloseTo(FACE_ON_X, 10);
    expect(ACTS.at(-1).explode).toBe(0);
  });

  it('tips the axle off vertical only while spinning, as a diabolo on a string does', () => {
    const a = byId();
    expect(a.arrival.tiltZ).toBe(0);
    expect(Math.abs(a.spin.tiltZ)).toBeGreaterThan(0.05);
  });

  it('varies the spin across acts, so scroll visibly drives it', () => {
    const rates = ACTS.map((a) => a.spin);
    expect(new Set(rates).size).toBeGreaterThan(3);
    expect(Math.max(...rates)).toBeGreaterThan(2 * Math.min(...rates));
  });

  it('slows the spin while the labels are meant to be read', () => {
    const a = byId();
    expect(a.apart.spin).toBeLessThan(a.spin.spin);
  });

  it('shows labels only while the object is apart', () => {
    const a = byId();
    expect(a.apart.labels).toBe(1);
    expect(a.arrival.labels).toBe(0);
    expect(a.settle.labels).toBe(0);
  });

  it('keeps every act inside the camera frustum', () => {
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const assembledHalf = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    const explodedHalf = 3 * SPACING + DIMS.cupHeight;
    for (const act of ACTS) {
      const halfExtent = act.explode === 1 ? explodedHalf : assembledHalf;
      expect(visibleHalfHeight(act.camZ), `${act.id} clips`).toBeGreaterThan(halfExtent * 1.1);
    }
  });

  it('keeps the camera between its near and far distances', () => {
    for (const act of ACTS) {
      expect(act.camZ).toBeGreaterThanOrEqual(CAMERA_NEAR_Z - 0.01);
      expect(act.camZ).toBeLessThanOrEqual(CAMERA_FAR_Z + 0.01);
    }
  });

  it('orbits the camera in exactly one act, holding its distance', () => {
    const orbiting = ACTS.filter((a) => Math.abs(a.camX) > 0.01);
    expect(orbiting).toHaveLength(1);
    expect(orbiting[0].id).toBe('orbit');
    expect(
      Math.hypot(orbiting[0].camX, orbiting[0].camZ),
      'the orbit must swing the camera, not dolly it',
    ).toBeCloseTo(7, 1);
  });

  it('puts the object on the opposite side from the reading column', () => {
    for (const act of ACTS) {
      if (act.textSide === 'left') expect(act.x, act.id).toBeGreaterThan(0);
      if (act.textSide === 'right') expect(act.x, act.id).toBeLessThan(0);
      if (act.textSide === 'center') expect(act.x, act.id).toBe(0);
    }
  });

  it('moves the object far enough aside to clear a 38% reading column', () => {
    const offset = ACTS.filter((a) => a.x !== 0);
    expect(offset.length).toBeGreaterThan(0);
    for (const act of offset) {
      const visibleWidth = 2 * act.camZ * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * (16 / 10);
      const nearEdgePct = 50 + (100 * (Math.abs(act.x) - DIMS.rimRadius)) / visibleWidth;
      expect(nearEdgePct, `${act.id} overlaps the reading column`).toBeGreaterThanOrEqual(42);
    }
  });
});

describe('partYAt', () => {
  it('returns the rest position when nothing is exploded', () => {
    for (const id of PART_IDS) expect(partYAt(id, 0)).toBeCloseTo(HOME[id].y, 10);
  });

  it('returns the exploded position when fully apart', () => {
    for (const id of PART_IDS) expect(partYAt(id, 1)).toBeCloseTo(explodedY(id), 10);
  });

  it('interpolates linearly in between', () => {
    for (const id of PART_IDS) {
      expect(partYAt(id, 0.5)).toBeCloseTo((HOME[id].y + explodedY(id)) / 2, 10);
    }
  });

  it('leaves the centre bearing still at every value', () => {
    for (const t of [0, 0.25, 0.5, 1]) expect(partYAt('axleBearing', t)).toBe(0);
  });
});

describe('lateral offset', () => {
  it('is large enough to be a composition, not a nudge', () => {
    expect(LATERAL_OFFSET).toBeGreaterThan(DIMS.rimRadius);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/choreography.test.js`
Expected: FAIL — `ACTS`, `partYAt` and `LATERAL_OFFSET` are not exported.

- [ ] **Step 3: Write the module**

Keep `PART_RANK`, `SPACING`, `FACE_ON_X`, `PROFILE_X`, `SCRUB_DURATION` and `explodedY` exactly as they are today — unchanged and already tested. Add above `createChoreography`:

```js
/** How far the object slides off centre so the reading column has clear space. */
export const LATERAL_OFFSET = 1.6;

/** The orbit swings the camera around the object at a constant radius; it does not dolly. */
const ORBIT_RADIUS = 7;
const ORBIT_ANGLE = 40 * (Math.PI / 180);

/**
 * The six acts, as target states reached at the END of each `end` fraction. The timeline
 * tweens from one act's state to the next, so this table is the whole choreography — data
 * rather than timeline calls, so it can be tuned and tested without a browser.
 *
 * `explode` 0 = assembled, 1 = fully apart. `textSide` records where the reading column
 * sits, so a test can assert the object is always on the other side of it.
 */
export const ACTS = Object.freeze([
  { id: 'arrival',   end: 0.10, explode: 0, tiltX: FACE_ON_X,        tiltZ: 0,    x: 0,               camX: 0, camZ: 5.4, spin: 1.0, labels: 0, textSide: 'center' },
  { id: 'apart',     end: 0.32, explode: 1, tiltX: FACE_ON_X * 0.45, tiltZ: 0,    x:  LATERAL_OFFSET, camX: 0, camZ: 10,  spin: 0.4, labels: 1, textSide: 'left'   },
  { id: 'recombine', end: 0.52, explode: 0, tiltX: PROFILE_X,        tiltZ: 0,    x: -LATERAL_OFFSET, camX: 0, camZ: 7,   spin: 1.2, labels: 0, textSide: 'right'  },
  { id: 'spin',      end: 0.70, explode: 0, tiltX: PROFILE_X,        tiltZ: 0.14, x:  LATERAL_OFFSET, camX: 0, camZ: 7,   spin: 4.0, labels: 0, textSide: 'left'   },
  { id: 'orbit',     end: 0.88, explode: 0, tiltX: PROFILE_X,        tiltZ: 0.14, x: -LATERAL_OFFSET,
    camX: ORBIT_RADIUS * Math.sin(ORBIT_ANGLE), camZ: ORBIT_RADIUS * Math.cos(ORBIT_ANGLE),
    spin: 1.2, labels: 0, textSide: 'right' },
  { id: 'settle',    end: 1.00, explode: 0, tiltX: FACE_ON_X,        tiltZ: 0,    x: 0,               camX: 0, camZ: 6,   spin: 0.5, labels: 0, textSide: 'center' },
]);

/**
 * Pure: a part's Y at a given explode fraction. anime.js writes part positions directly
 * (never a scalar the render loop reads back), so the timeline needs a concrete Y per act
 * rather than one shared scalar.
 */
export function partYAt(partId, explode) {
  const rest = HOME[partId].y;
  return rest + (explodedY(partId) - rest) * explode;
}
```

Then replace the body of `createChoreography` below the sticky-target guard. **Keep that guard verbatim** — `#stage` is `position: sticky` and pointing the observer at it pins progress at 0 forever, which already cost one full debugging round.

```js
  const timeline = createTimeline({
    defaults: { ease: 'inOutSine', duration: SCRUB_DURATION },
    autoplay: onScroll({
      target: scrollTarget,
      sync: 0.2,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  // Generated from ACTS rather than hand-written. Each act tweens from wherever the
  // previous one left off, so transitions carry state forward instead of resetting.
  let previousEnd = 0;
  for (const act of ACTS) {
    const at = previousEnd * SCRUB_DURATION;
    const duration = (act.end - previousEnd) * SCRUB_DURATION;
    if (duration <= 0) continue;

    for (const partId of Object.keys(PART_RANK)) {
      timeline.add(parts[partId].position, { y: partYAt(partId, act.explode), duration }, at);
    }
    timeline.add(tilt.rotation, { x: act.tiltX, z: act.tiltZ, duration }, at);
    timeline.add(tilt.position, { x: act.x, duration }, at);
    timeline.add(camera.position, { x: act.camX, z: act.camZ, duration }, at);
    timeline.add(state, { spinRate: act.spin, labelOpacity: act.labels, duration }, at);

    previousEnd = act.end;
  }
```

Delete `LABEL_FADE_START` and `LABEL_FADE_END` — label opacity is now per-act data. Any test importing them moves to asserting `ACTS[n].labels`.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: `tests/choreography.dom.test.js` fails first — it asserts the old single-act behaviour. Rewrite its happy path in the next step rather than weakening it.

- [ ] **Step 5: Rewrite the DOM test's happy path**

Keep the three sticky/fixed guard tests unchanged. Replace the simultaneity block:

```js
describe('acts', () => {
  const setup = () => {
    const target = document.createElement('div');
    target.style.position = 'static';
    document.body.append(target);
    const { tilt, spinner, parts } = buildDiabolo({
      materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16,
    });
    const state = { spinRate: 1, labelOpacity: 0 };
    const camera = { position: { x: 0, y: 0, z: CAMERA_NEAR_Z } };
    const choreo = createChoreography({ parts, tilt, state, camera, scrollTarget: target });
    return { ...choreo, parts, tilt, spinner, state, camera };
  };
  const at = (tl, f) => tl.seek(tl.duration * f);

  it('reaches a visibly different state at each act boundary', () => {
    const { timeline, parts, tilt, camera } = setup();
    const seen = new Set();
    for (const act of ACTS) {
      at(timeline, act.end);
      seen.add([
        parts.cupTop.position.y.toFixed(2), tilt.rotation.x.toFixed(2),
        tilt.position.x.toFixed(2), camera.position.x.toFixed(2), camera.position.z.toFixed(2),
      ].join('|'));
    }
    expect(seen.size, 'two acts land on the same state').toBe(ACTS.length);
  });

  it('explodes every part simultaneously within the apart act', () => {
    const { timeline, parts } = setup();
    at(timeline, 0.21);
    const moving = Object.keys(PART_RANK).filter((id) => id !== 'axleBearing');
    const progress = (id) => {
      const rest = HOME[id].y, done = explodedY(id);
      return (parts[id].position.y - rest) / (done - rest);
    };
    const first = progress(moving[0]);
    expect(first).toBeGreaterThan(0.05);
    expect(first).toBeLessThan(0.95);
    for (const id of moving) expect(progress(id), `${id} is out of step`).toBeCloseTo(first, 6);
  });

  it('recombines while turning, rather than replaying the explosion backwards', () => {
    const { timeline, parts, tilt } = setup();
    at(timeline, 0.42);
    expect(Math.abs(parts.cupTop.position.y - HOME.cupTop.y)).toBeGreaterThan(0.01);
    expect(tilt.rotation.x).toBeGreaterThan(FACE_ON_X + 0.05);
    expect(tilt.rotation.x).toBeLessThan(PROFILE_X - 0.001);
  });

  it('never writes the spinner, which the render loop owns', () => {
    const { timeline, spinner } = setup();
    const before = spinner.rotation.y;
    at(timeline, 0.63);
    expect(spinner.rotation.y).toBe(before);
  });

  it('drives the spin rate from scroll position', () => {
    const { timeline, state } = setup();
    at(timeline, 0.30);
    const whileApart = state.spinRate;
    at(timeline, 0.68);
    expect(state.spinRate, 'spin does not change between acts').toBeGreaterThan(whileApart * 1.5);
  });
});
```

Import `ACTS`, `PART_RANK`, `explodedY`, `FACE_ON_X`, `PROFILE_X` from the module under test, `HOME` and `buildDiabolo` from `../src/diabolo/build.js`, and `CAMERA_NEAR_Z` from `../src/diabolo/stage.js`.

- [ ] **Step 6: Prove the act-distinctness test bites**

Temporarily give `recombine` the same `explode`, `tiltX`, `x`, `camX` and `camZ` as `spin`; re-run; confirm "reaches a visibly different state at each act boundary" FAILS. Revert and confirm green. Report both runs — a six-act table whose acts are interchangeable is precisely the failure this task exists to prevent.

- [ ] **Step 7: Commit**

```bash
git add src/scroll/choreography.js tests/choreography.test.js tests/choreography.dom.test.js
git commit -m "feat: six acts as data, timeline generated from the table"
```

---
### Task 2: Aim the camera at the object

The orbit act swings the camera to `camX 4.500, camZ 5.362` while the object sits at `x -1.6`. A camera still staring down `-Z` would let the object slide out of frame instead of circling it. The camera must track the object.

This introduces the only new render-loop responsibility in the plan: `camera.quaternion`. anime.js owns `camera.position`; the render loop owns where it points. Different properties, so the invariant holds — but state it rather than assume it.

**Files:**
- Modify: `src/diabolo/stage.js`
- Modify: `tests/stage.test.js`

**Interfaces:**
- Produces: `aimCamera(camera, target): void` — exported so it can be tested with real Three objects in Node, no WebGL needed. The render loop calls it every frame.

- [ ] **Step 1: Write the failing test**

Camera maths is pure and runs headless. Add to `tests/stage.test.js`:

```js
describe('aimCamera', () => {
  const forwardOf = (camera) => new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const angleToTarget = (camera, target) =>
    forwardOf(camera).angleTo(target.clone().sub(camera.position).normalize());

  it('points the camera at the target', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(0, 0, CAMERA_NEAR_Z);
    const target = new Vector3(0, 0, 0);
    aimCamera(camera, target);
    expect(angleToTarget(camera, target)).toBeLessThan(1e-6);
  });

  it('tracks an off-centre object, which is what the lateral offset needs', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(0, 0, 7);
    const target = new Vector3(-1.6, 0, 0);
    aimCamera(camera, target);
    expect(angleToTarget(camera, target)).toBeLessThan(1e-6);
  });

  it('still frames the object from the orbit position, which is the whole point', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(4.5, 0, 5.362);
    const target = new Vector3(-1.6, 0, 0);
    aimCamera(camera, target);
    expect(angleToTarget(camera, target)).toBeLessThan(1e-6);
  });

  it('leaves the camera position alone — anime.js owns that', () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
    camera.position.set(4.5, 0, 5.362);
    aimCamera(camera, new Vector3(-1.6, 0, 0));
    expect(camera.position.toArray()).toEqual([4.5, 0, 5.362]);
  });
});
```

Import `PerspectiveCamera` and `Vector3` from `three`, and `aimCamera` from the module under test.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/stage.test.js`
Expected: FAIL — `aimCamera` is not exported.

- [ ] **Step 3: Implement**

In `src/diabolo/stage.js`:

```js
/**
 * Point the camera at the object. anime.js owns camera.position; this owns where the
 * camera looks. Separate properties, so the two drivers never collide — but without it
 * the orbit act slides the object out of frame instead of circling it.
 */
export function aimCamera(camera, target) {
  camera.lookAt(target);
}
```

Inside `createStage`, keep one reusable `Vector3` (allocating per frame is needless garbage) and aim before drawing:

```js
  const aimTarget = new Vector3();

  function render(deltaSeconds) {
    const spin = rotationDeltas(deltaSeconds, state.spinRate);
    spinner.rotation.y += spin.spinner;
    spinMesh.rotation.y += spin.bearing;
    tilt.getWorldPosition(aimTarget);
    aimCamera(camera, aimTarget);
    renderer.render(scene, camera);
    for (const overlay of overlays) overlay.render(scene, camera);
  }
```

Import `Vector3` from `three`. If the existing `rotationDeltas` return field is still named `root` rather than `spinner`, use whatever the current code exports — do not rename it as a side effect of this task.

- [ ] **Step 4: Run the suite and commit**

Run: `npx vitest run`

```bash
git add src/diabolo/stage.js tests/stage.test.js
git commit -m "feat: aim the camera at the object so the orbit act frames it"
```

---

### Task 3: The light spill

The single idea replacing the grid, the rules and the plates. A soft violet bloom tracks the object's **projected screen position** every frame, so the page is lit by its subject rather than decorated to match it. A grid is applied to a page; light is emitted by what is in it.

**Files:**
- Create: `src/diabolo/spill.js`
- Modify: `src/main.js`, `index.html`, `src/styles/stage.css`
- Test: `tests/spill.dom.test.js`

**Interfaces:**
- Consumes: `tilt` and `camera` from the stage
- Produces: `createSpill({ container, tilt, camera }): { element, render, setSize, dispose }` — an overlay in the same shape the labels use, registered via `stage.addOverlay`.
- Writes two CSS custom properties on its element: `--spill-x` and `--spill-y`, each a percentage string.

- [ ] **Step 1: Write the failing test**

```js
// tests/spill.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Group, Vector3 } from 'three';
import { createSpill } from '../src/diabolo/spill.js';
import { CAMERA_FOV, CAMERA_NEAR_Z } from '../src/diabolo/stage.js';

const setup = () => {
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  const tilt = new Group();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1.6, 0.1, 100);
  camera.position.set(0, 0, CAMERA_NEAR_Z);
  camera.lookAt(new Vector3(0, 0, 0));
  camera.updateMatrixWorld(true);
  return { container, tilt, camera, spill: createSpill({ container, tilt, camera }) };
};

const spillX = (container) =>
  parseFloat(container.firstElementChild.style.getPropertyValue('--spill-x'));

describe('createSpill', () => {
  it('mounts a single element into the container', () => {
    const { container } = setup();
    expect(container.children).toHaveLength(1);
  });

  it('centres the bloom when the object is centred', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(0, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(spillX(container)).toBeCloseTo(50, 0);
    expect(parseFloat(container.firstElementChild.style.getPropertyValue('--spill-y')))
      .toBeCloseTo(50, 0);
  });

  it('follows the object to the right, which is what couples page to object', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(1.6, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(spillX(container)).toBeGreaterThan(55);
  });

  it('follows the object to the left', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(-1.6, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(spillX(container)).toBeLessThan(45);
  });

  it('expresses position as a percentage, so CSS places it without JS units', () => {
    const { tilt, camera, spill, container } = setup();
    tilt.position.set(0.5, 0, 0);
    tilt.updateMatrixWorld(true);
    spill.render(null, camera);
    expect(container.firstElementChild.style.getPropertyValue('--spill-x')).toMatch(/%$/);
  });

  it('does not intercept pointer events', () => {
    const { container } = setup();
    expect(container.firstElementChild.style.pointerEvents).toBe('none');
  });

  it('removes its element on dispose', () => {
    const { container, spill } = setup();
    spill.dispose();
    expect(container.children).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/spill.dom.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/spill.js`.

- [ ] **Step 3: Write the module**

```js
// src/diabolo/spill.js
import { Vector3 } from 'three';

/**
 * A soft bloom that tracks the object's projected screen position.
 *
 * This is the page's only connective tissue: the ground has nothing drawn on it, and the
 * relationship between object and layout is carried entirely by where the light falls.
 * Reads anime-owned transforms and writes nothing but two CSS custom properties, so it
 * introduces no new owner of anything.
 */
export function createSpill({ container, tilt, camera }) {
  const element = document.createElement('div');
  element.className = 'light-spill';
  element.style.pointerEvents = 'none';
  element.setAttribute('aria-hidden', 'true');
  container.append(element);

  const projected = new Vector3();

  return {
    element,
    render() {
      tilt.getWorldPosition(projected);
      projected.project(camera);
      // NDC is -1..1 with +Y up; CSS percentages are 0..100 with +Y down.
      element.style.setProperty('--spill-x', `${(projected.x * 0.5 + 0.5) * 100}%`);
      element.style.setProperty('--spill-y', `${(-projected.y * 0.5 + 0.5) * 100}%`);
    },
    setSize() {},
    dispose() {
      element.remove();
    },
  };
}
```

- [ ] **Step 4: Register it**

In `index.html`, inside `#stage`, before the label layer:

```html
    <div id="spill-layer"></div>
```

In `src/main.js`, after the labels are registered:

```js
  const spill = createSpill({
    container: document.getElementById('spill-layer'),
    tilt: stage.tilt,
    camera: stage.camera,
  });
  stage.addOverlay(spill);
```

In `src/styles/stage.css`:

```css
#spill-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

.light-spill {
  position: absolute;
  inset: -30%;
  background: radial-gradient(
    circle at var(--spill-x, 50%) var(--spill-y, 50%),
    color-mix(in oklab, var(--violet) 26%, transparent) 0%,
    color-mix(in oklab, var(--violet-deep) 12%, transparent) 28%,
    transparent 62%
  );
  /* No transition here: the position is driven per frame, and a CSS transition would be a
     second animation driver fighting the render loop. */
}
```

- [ ] **Step 5: Run the suite and commit**

Run: `npx vitest run`

```bash
git add src/diabolo/spill.js src/main.js index.html src/styles/stage.css tests/spill.dom.test.js
git commit -m "feat: light spill that tracks the object's screen position"
```

---

### Task 4: Scroll length and act-aligned sections

Today the page is ~9 screens and every section is the same height, so the acts cannot align with the content. The spec targets **~20 screens**, with each section's height proportional to its act's span.

**Files:**
- Create: `src/ui/layout.js`
- Modify: `src/main.js`, `src/styles/sections.css`
- Test: `tests/sections-layout.dom.test.js`

**Interfaces:**
- Consumes: `ACTS` from `../scroll/choreography.js`
- Produces: `SECTION_FOR_ACT: Record<string, string>` and `applySectionSides(root): void`, which stamps each `[data-section]` with `data-side="left" | "right" | "center"`.

`src/ui/sections.js` stays free of choreography — `ui/*` owns no 3D and no motion. A tiny `ui/layout.js` that reads act *data* (numbers and side names, no Three objects) is the seam, and `main.js` calls it.

- [ ] **Step 1: Write the failing test**

```js
// tests/sections-layout.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACTS } from '../src/scroll/choreography.js';
import { SECTION_FOR_ACT, applySectionSides } from '../src/ui/layout.js';

const build = () => {
  const root = document.createElement('main');
  for (const id of ['hero', 'about', 'events', 'media', 'board', 'contact', 'footer']) {
    const s = document.createElement('section');
    s.dataset.section = id;
    root.append(s);
  }
  document.body.replaceChildren(root);
  return root;
};

describe('act to section mapping', () => {
  it('maps every act to exactly one section', () => {
    const sections = ACTS.map((a) => SECTION_FOR_ACT[a.id]);
    expect(sections.every(Boolean), 'an act has no section').toBe(true);
    expect(new Set(sections).size).toBe(ACTS.length);
  });

  it('follows the reading order of the page', () => {
    expect(ACTS.map((a) => SECTION_FOR_ACT[a.id])).toEqual(
      ['hero', 'about', 'events', 'media', 'board', 'contact'],
    );
  });
});

describe('applySectionSides', () => {
  it('gives every mapped section the side its act says', () => {
    const root = build();
    applySectionSides(root);
    for (const act of ACTS) {
      const el = root.querySelector(`[data-section="${SECTION_FOR_ACT[act.id]}"]`);
      expect(el.dataset.side, SECTION_FOR_ACT[act.id]).toBe(act.textSide);
    }
  });

  it('puts the text opposite the object every time', () => {
    const root = build();
    applySectionSides(root);
    for (const act of ACTS) {
      const side = root.querySelector(`[data-section="${SECTION_FOR_ACT[act.id]}"]`).dataset.side;
      if (side === 'left') expect(act.x).toBeGreaterThan(0);
      if (side === 'right') expect(act.x).toBeLessThan(0);
    }
  });

  it('alternates sides rather than stacking every section on one edge', () => {
    const sides = ACTS.map((a) => a.textSide).filter((s) => s !== 'center');
    for (let i = 1; i < sides.length; i++) {
      expect(sides[i], 'two consecutive sections share a side').not.toBe(sides[i - 1]);
    }
  });

  it('leaves sections with no act alone', () => {
    const root = build();
    applySectionSides(root);
    expect(root.querySelector('[data-section="footer"]').dataset.side).toBeUndefined();
  });
});

describe('scroll length', () => {
  it('gives the six acts enough page to play over', () => {
    const css = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8');
    const total = [...css.matchAll(/min-height:\s*(\d+)vh/g)]
      .map((m) => Number(m[1]))
      .reduce((a, b) => a + b, 0);
    expect(total, 'the page is too short for six acts to register').toBeGreaterThanOrEqual(1800);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/sections-layout.dom.test.js`
Expected: FAIL — cannot resolve `../src/ui/layout.js`.

- [ ] **Step 3: Write the module**

```js
// src/ui/layout.js
import { ACTS } from '../scroll/choreography.js';

/**
 * Which section each act plays over. Acts and reading order advance together, so the
 * object's state always belongs to whatever the visitor is reading.
 */
export const SECTION_FOR_ACT = Object.freeze({
  arrival: 'hero',
  apart: 'about',
  recombine: 'events',
  spin: 'media',
  orbit: 'board',
  settle: 'contact',
});

/**
 * Stamp each section with the side its reading column occupies. The object sits on the
 * other side for the whole act, which is why no text needs a plate behind it.
 */
export function applySectionSides(root) {
  for (const act of ACTS) {
    const el = root.querySelector(`[data-section="${SECTION_FOR_ACT[act.id]}"]`);
    if (el) el.dataset.side = act.textSide;
  }
}
```

Call `applySectionSides(content)` in `src/main.js` immediately after `renderSections(content)`.

- [ ] **Step 4: Size the sections**

In `src/styles/sections.css`, replace the uniform section height with heights proportional to each act's span (10 / 22 / 20 / 18 / 18 / 12 percent):

```css
[data-section="hero"]    { min-height: 200vh; }
[data-section="about"]   { min-height: 440vh; }
[data-section="events"]  { min-height: 400vh; }
[data-section="media"]   { min-height: 360vh; }
[data-section="board"]   { min-height: 360vh; }
[data-section="contact"] { min-height: 240vh; }
[data-section="footer"]  { min-height: 60vh; }
```

Content inside each section sticks to the middle of its span, so a long section reads as a held beat rather than a wall of whitespace:

```css
.section > * { position: sticky; top: 50%; transform: translateY(-50%); }
```

Total is 2060vh — about **20.6 screens**, against today's 9.

- [ ] **Step 5: Run the suite and commit**

Run: `npx vitest run`

```bash
git add src/ui/layout.js src/main.js src/styles/sections.css tests/sections-layout.dom.test.js
git commit -m "feat: act-aligned section sides and a page long enough for six acts"
```

---
### Task 5: The editorial language

Delete the technical-drawing vocabulary and replace it with one where light does the work. The spectacle rubric scores the current look at 2 — "technically competent but recognizable stock visual language" — and a grid plus hairlines plus mono indices is exactly that. Deletion is most of this task; the design pass is the rest.

**Files:**
- Rewrite: `src/styles/base.css`, `src/styles/sections.css`
- Modify: `src/styles/stage.css`, `index.html`
- Test: `tests/visual-language.test.js`

**Interfaces:**
- Consumes: `data-side` on sections (Task 4), `--spill-x` / `--spill-y` (Task 3)
- Produces: no JS API. The contract is what the stylesheets no longer contain.

- [ ] **Step 1: Write the failing test**

These guards exist because "we deleted the grid" is the kind of claim that quietly stops being true. They are source scans, in the same style as the existing guard keeping club copy out of `ui/`.

```js
// tests/visual-language.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const allCss = () =>
  ['../src/styles/base.css', '../src/styles/sections.css', '../src/styles/stage.css']
    .map(read).join('\n');

describe('the technical-drawing language is gone', () => {
  it('draws no grid across the page', () => {
    expect(allCss()).not.toMatch(/repeating-linear-gradient/i);
  });

  it('keeps no hairline-rule token', () => {
    expect(allCss()).not.toMatch(/--rule\b/);
  });

  it('paints no plate behind text', () => {
    // The plates existed only because the object sat under the text. The object now moves
    // aside, so a plate reappearing means the composition regressed.
    expect(allCss()).not.toMatch(/plate|backdrop-filter/i);
  });

  it('numbers no section with a CSS counter', () => {
    expect(allCss()).not.toMatch(/counter-(reset|increment)|counter\(/);
  });

  it('draws no leader lines from the labels', () => {
    expect(read('../src/styles/stage.css')).not.toMatch(/\.part-label::before/);
  });
});

describe('the editorial pairing', () => {
  it('loads Instrument Serif and Inter', () => {
    const html = read('../index.html');
    expect(html).toMatch(/Instrument\+Serif/);
    expect(html).toMatch(/family=Inter/);
  });

  it('drops Space Grotesk, which was the technical voice', () => {
    expect(read('../index.html')).not.toMatch(/Space\+Grotesk/);
  });

  it('keeps mono loaded, because the 3D part labels still use it', () => {
    expect(read('../index.html')).toMatch(/Space\+Mono/);
  });

  it('uses mono only on the object labels, never in the reading column', () => {
    expect(read('../src/styles/stage.css')).toMatch(/\.part-label/);
    expect(read('../src/styles/sections.css')).not.toMatch(/Space Mono|monospace/i);
  });
});

describe('the light spill is wired to the object', () => {
  it('positions the bloom from the properties the overlay writes', () => {
    const stage = read('../src/styles/stage.css');
    expect(stage).toMatch(/var\(--spill-x/);
    expect(stage).toMatch(/var\(--spill-y/);
  });
});

describe('the reading column', () => {
  it('is placed by side, not run full width', () => {
    const css = read('../src/styles/sections.css');
    expect(css).toMatch(/\[data-side=["']?left["']?\]/);
    expect(css).toMatch(/\[data-side=["']?right["']?\]/);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/visual-language.test.js`
Expected: FAIL on most cases — the grid, `--rule`, the plates and the counters are all still present.

- [ ] **Step 3: Swap the fonts**

In `index.html`, replace the Space Grotesk link, keeping Space Mono:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
```

In `base.css`:

```css
  --font-display: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
```

Display sizes go up and weights come down. A high-contrast serif at large size is the whole effect; at small size it reads as an ordinary body serif and the change is wasted.

- [ ] **Step 4: Delete the technical vocabulary**

Remove from the stylesheets, wholesale:

- the `repeating-linear-gradient` graph paper and its `background-size`
- the `--rule` token and every `border` or `::before` that used it
- every plate, backdrop and `backdrop-filter` behind text
- `counter-reset` / `counter-increment` / `counter()` for section indices
- `.part-label::before` leader lines

Section headings lose their `01 /` prefixes entirely. The mono index was technical-drawing grammar; it does not survive the change of voice.

- [ ] **Step 5: The design pass**

**REQUIRED SUB-SKILL:** invoke `frontend-design` and let it own the visual thesis, type scale, palette and final critique. What follows are constraints, not style.

- **Editorial and cinematic.** Instrument Serif display at real size, generous whitespace, and **no drawn structure of any kind** — no rules, no borders, no grid, no boxes. Where separation is needed, use space or light, never a line.
- **Light is the only connective tissue.** The `.light-spill` bloom (Task 3) tracks the object's real projected position. Tune colour and falloff so the page reads as lit by the object. This is the idea that replaces everything deleted.
- **The reading column is ~38%**, placed by `[data-side="left"]` / `[data-side="right"]` (Task 4), with `center` for the hero and the closing act. The object is always opposite, so **nothing needs a background behind it**.
- Mono survives only on `.part-label`.
- Every fallback state (`[data-stage="unsupported"]`, `[data-stage="static"]`) must look deliberate.
- **Measure contrast against live canvas pixels**, not against the CSS background — the object moves, so a measurement against a flat colour is meaningless. A previous pass found the hero tagline at **1.07:1** this way, which eyeballing had not caught.
- Keep `:focus-visible` on every interactive element.
- Mobile: the object holds the upper band and text flows beneath it, per the spec. Side-crossing does not survive at 375 px, and that is the intended recipe rather than a degradation.

- [ ] **Step 6: Run the suite, build, and commit**

Run: `npx vitest run && npm run build`

```bash
git add src/styles index.html tests/visual-language.test.js
git commit -m "feat: editorial language, lit by the object rather than drawn on the page"
```

---

### Task 6: Verification

Report only what you observe. Where the environment cannot produce a condition, say so and label any stand-in synthetic. The spec's §8 list is deliberately measurable because a previous round's eyeball check missed a permanent defect.

- [ ] **Step 1: Build and serve**

```bash
npm run build && npx vite preview --port 4173
```

- [ ] **Step 2: Acts are distinct**

```js
const vd = window.__vd, tl = vd.choreography.timeline;
const sample = (f) => { tl.seek(tl.duration * f); return {
  cupTop: +vd.stage.parts.cupTop.position.y.toFixed(2),
  tiltX: +vd.stage.tilt.rotation.x.toFixed(2),
  objX: +vd.stage.tilt.position.x.toFixed(2),
  camX: +vd.stage.camera.position.x.toFixed(2),
  camZ: +vd.stage.camera.position.z.toFixed(2),
  spin: +vd.stage.state.spinRate.toFixed(2),
}; };
console.log(JSON.stringify([0.10, 0.32, 0.52, 0.70, 0.88, 1.0].map(sample), null, 1));
```

Six rows, all different. Record them.

- [ ] **Step 3: Recombination is not a rewind**

At `0.42` the parts must still be converging **and** the turn underway. Report both numbers.

- [ ] **Step 4: Nothing overlaps — measure, do not eyeball**

For each offset act, confirm the reading column's bounding box and the object's projected centre sit on opposite sides of the viewport midline:

```js
import('three').then(({ Vector3 }) => {
  const probe = (f, section) => {
    tl.seek(tl.duration * f);
    vd.stage.render(0.016);
    const t = document.querySelector(`[data-section="${section}"] p`).getBoundingClientRect();
    const v = new Vector3();
    vd.stage.tilt.getWorldPosition(v);
    v.project(vd.stage.camera);
    return { section, textCentre: Math.round((t.left + t.right) / 2),
             objCentre: Math.round((v.x * 0.5 + 0.5) * window.innerWidth),
             mid: Math.round(window.innerWidth / 2) };
  };
  console.log([['0.32','about'],['0.52','events'],['0.70','media'],['0.88','board']]
    .map(([f, s]) => probe(Number(f), s)));
});
```

- [ ] **Step 5: No plates survive**

```js
[...document.querySelectorAll('[data-section] p, [data-section] h1, [data-section] h2')]
  .map((e) => getComputedStyle(e).backgroundColor)
  .filter((c) => c !== 'rgba(0, 0, 0, 0)');
```

Must be empty.

- [ ] **Step 6: Light spill tracks the object**

Sample `--spill-x` at an act with the object left and one with it right. The values must move in the same direction as the object.

- [ ] **Step 7: Scroll length**

`document.body.scrollHeight / window.innerHeight` at 1440×900 — must be **at least 18**.

- [ ] **Step 8: Ownership, fallbacks, responsiveness, links**

Nothing but the render loop writes `spinner.rotation.y`. Reduced motion, no-WebGL, 375 / 768 / 1440, every outbound link, final bundle size.

- [ ] **Step 9: Rewrite `docs/VERIFICATION.md`**

Replace it with this run's results. Keep the honest structure: a status per claim, plus an explicit "outstanding for a human on a real machine" list. **Carry forward no number you did not re-measure**, and mark anything checked only at a single frozen frame as such — that caveat is exactly what the last round's label-orbit defect hid behind.

```bash
git add docs/VERIFICATION.md
git commit -m "test: record six-act verification"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §2 thesis: light is the connective tissue | Tasks 3, 5 |
| §2 deleted: grid, rules, plates, indices, leader lines | Task 5, with guard tests |
| §2 typography: Instrument Serif + Inter, mono only on labels | Task 5 |
| §3 six acts with spans | Task 1 |
| §3 ~20 screens | Task 4 |
| §3 transitions carry state forward | Task 1 (recombine-is-not-a-rewind) |
| §3 Act 4 axle tipped off vertical | Task 1 (`tiltZ 0.14`) |
| §4 38% column, object opposite, no plates | Tasks 4, 5 |
| §4 mobile recipe | Task 5 |
| §5 scroll drives the spin | Task 1 (`spin` per act) |
| §6 ownership extended | Tasks 1, 2 |
| §7 what carries over untouched | no task — nothing to do, by design |
| §8 verification | Task 6 |

Every spec requirement has a task.

**Placeholder scan:** no TBD/TODO, no "add appropriate error handling", no "similar to Task N". Every code step carries complete code.

**Type consistency:** `ACTS`, `LATERAL_OFFSET`, `partYAt`, `explodedY`, `PART_RANK`, `SPACING`, `FACE_ON_X`, `PROFILE_X`, `SCRUB_DURATION`, `aimCamera`, `createSpill`, `SECTION_FOR_ACT`, `applySectionSides`, `--spill-x`, `--spill-y`, `data-side` are spelled identically at every definition and use site. `LABEL_FADE_START` and `LABEL_FADE_END` are deleted in Task 1 and must not survive anywhere.

**Ordering note:** Task 4's `src/ui/layout.js` imports `ACTS`, so Task 1 must land first. Tasks 2, 3 and 5 are independent of each other.

**Verified while planning, not assumed:**
- Every act frames inside the frustum: visible half-height 1.65 / 2.14 / 3.06 at `z` 5.4 / 7 / 10, against an assembled half-extent of 1.095 and an exploded one of 2.510.
- The orbit at 40° and radius 7 gives `camX 4.500`, `camZ 5.362` — a swing at constant distance, not a dolly.
- `LATERAL_OFFSET = 1.6` puts the object's near edge at 56–59% against a 0–38% reading column. The first value tried, 1.1, left only a 13% gutter; the clearance test in Task 1 is parametric, so it does not depend on trusting either number.
