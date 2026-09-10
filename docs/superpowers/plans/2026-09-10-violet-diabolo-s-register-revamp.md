# Violet Diabolo S-Register Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the existing Violet Diabolo site to full spectacle register — an entrance sequence, a CSS3D 2D/3D layer, a simultaneous axial explosion, a face-on-to-profile turn, corrected axle proportions, and a visible spin.

**Architecture:** The existing scene graph gains one level — a `tilt` group (anime.js owns its `rotation.x`, the scroll-driven turn) wrapping a `spinner` group (the render loop owns its `rotation.y`, the continuous spin) wrapping the seven part groups (anime.js owns their `position`). A `CSS3DRenderer` sharing the same camera puts real DOM into the 3D composition. `choreography.js` is rewritten; everything else is extended or untouched.

**Tech Stack:** Three.js 0.186 (WebGL + CSS3DRenderer) · anime.js 4.5 (all timelines) · Vite 8 · Vitest 5

**Spec:** `docs/superpowers/specs/2026-09-10-violet-diabolo-s-register-revamp-design.md`

**Starting state:** `main` at the merged v1 build. 127 tests passing, `npm run build` clean.

## Global Constraints

Every task's requirements implicitly include this section.

- **One owner per transform, extended for the new nesting.** anime.js owns `tilt.rotation.x`, every part `Group`'s `.position`/`.rotation`, and the scalar `state.spinRate`. The render loop owns `spinner.rotation.y` and the bearing's `spinMesh.rotation.y`, and only *reads* `state.spinRate`. No `Object3D` transform written by two owners; the render loop never writes a scalar anime.js owns.
- **The entrance timeline and the scroll timeline must never be live simultaneously.** Both write part positions. The scroll timeline is created inside the entrance's completion callback.
- **Never pause anime.js's global engine.** `engine.pauseOnDocumentHidden` already defaults to `true` and the engine self-idles. A test guard greps `src/` and fails on any `engine` import or `engine.pause(`/`engine.resume(` call.
- **No second animation engine.** Three.js renders, anime.js animates. No GSAP, no Motion.
- **Module boundaries:** `content/*` no markup, `ui/*` no 3D, `diabolo/*` and `scroll/*` no copy. A test fails if club copy is hardcoded into a `ui/` module.
- **Content is never gated behind the 3D system** — every section readable with WebGL disabled.
- **Do not edit `src/content/index.js`'s existing copy.** Verbatim club text with a deliberate curly/ASCII apostrophe mix pinned by tests. New *exports* are fine; edits to existing strings are not.
- **All 127 existing tests keep passing.** Run `npx vitest run` before every commit.
- Reduced motion: no entrance, no scrub — object placed assembled and face-on.

## File Map

| Path | Change |
|---|---|
| `src/diabolo/profiles.js` | retune `DIMS` (Task 1) |
| `src/diabolo/build.js` | return `tilt`/`spinner` nesting (Task 2) |
| `src/diabolo/stage.js` | consume nesting, promote spin (Tasks 2, 6) |
| `src/scroll/choreography.js` | **rewritten** — simultaneous explosion + turn (Task 3) |
| `src/scroll/entrance.js` | **new** (Task 4) |
| `src/diabolo/labels.js` | **new** — CSS3D layer (Task 5) |
| `src/main.js` | wire entrance → scroll ordering, labels (Tasks 4, 5) |
| `src/styles/*.css` | S-register art direction (Task 6) |
| `index.html` | CSS3D container (Task 5) |

---

### Task 1: Retune the proportions

The black axle assembly currently occupies **32.2%** of the object's total height. The reference photograph is nearer 15–18%. Every number lives in one frozen object, which is why this is a constant change and not a refactor.

**Files:**
- Modify: `src/diabolo/profiles.js`
- Modify: `tests/profiles.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `DIMS.hubHeight = 0.12`, `DIMS.bearingHeight = 0.14`. `HOME` in `build.js` recomputes from these automatically — do not hand-edit `HOME`.

- [ ] **Step 1: Write the failing test**

Add to `tests/profiles.test.js`:

```js
describe('proportions', () => {
  it('keeps the black axle assembly a minor share of total height, as in the reference photo', () => {
    const totalHeight = 2 * (DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness + DIMS.cupHeight);
    const blackHeight = 2 * DIMS.hubHeight + DIMS.bearingHeight;
    const share = blackHeight / totalHeight;
    expect(share).toBeGreaterThan(0.12);
    expect(share).toBeLessThan(0.22);
  });

  it('keeps the cups the dominant mass', () => {
    expect(DIMS.cupHeight).toBeGreaterThan(DIMS.hubHeight * 4);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/profiles.test.js`
Expected: FAIL — the share is currently 0.322, above the 0.22 ceiling.

- [ ] **Step 3: Retune `DIMS`**

In `src/diabolo/profiles.js`, change exactly two values:

```js
  hubHeight: 0.12,
  bearingHeight: 0.14,
```

Leave `neckRadius`, `rimRadius`, `cupHeight`, `gasketRadius`, `gasketThickness`, `bearingRadius` alone — the silhouette of the cups is not what was wrong.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Watch specifically that the **seam continuity** tests in `tests/build.test.js` still pass — they assert the hub cone meets the bearing and the gasket bore within 0.02, and those seams are computed from `DIMS`, so a bad retune shows up there first.

Resulting geometry, for reference when checking:

| | before | after |
|---|---|---|
| `halfBearing` | 0.130 | 0.070 |
| `gasketY` | 0.430 | 0.190 |
| `neckY` | 0.475 | 0.235 |
| total height | 2.670 | 2.190 |
| black share | 32.2% | **17.4%** |

- [ ] **Step 5: Commit**

```bash
git add src/diabolo/profiles.js tests/profiles.test.js
git commit -m "fix: shorten the black axle from 32% to 17% of total height"
```

---

### Task 2: Nest `tilt` and `spinner`

The face-on-to-profile turn is a second rotation. If it wrote the same object as the spin, the two would fight. Resolved structurally.

**Files:**
- Modify: `src/diabolo/build.js`, `src/diabolo/stage.js`
- Modify: `tests/build.test.js`

**Interfaces:**
- Consumes: `PART_IDS`, `DIMS`, profile functions (unchanged)
- Produces: `buildDiabolo({ materials, segments })` now returns `{ tilt, spinner, parts }` instead of `{ root, parts }`.
  - `tilt` is the outermost `Group`, added to the scene. anime.js owns `tilt.rotation.x`.
  - `spinner` is `tilt`'s only child. The render loop owns `spinner.rotation.y`.
  - `parts` are `spinner`'s children, unchanged.
- `createStage` returns `{ renderer, scene, camera, tilt, spinner, parts, state, render, resize, dispose }` — `root` is gone; any consumer using `root` must move to `spinner`.

- [ ] **Step 1: Write the failing test**

Add to `tests/build.test.js`, and change every existing reference to `root` in that file to `spinner`:

```js
describe('scene graph nesting', () => {
  it('wraps the spinner in a tilt group so the turn and the spin never share an object', () => {
    const { tilt, spinner } = build();
    expect(tilt).toBeInstanceOf(Group);
    expect(spinner).toBeInstanceOf(Group);
    expect(spinner.parent).toBe(tilt);
    expect(tilt.parent).toBeNull();
  });

  it('gives tilt exactly one child, so nothing else is caught by the turn', () => {
    const { tilt, spinner } = build();
    expect(tilt.children).toEqual([spinner]);
  });

  it('parents every part to the spinner', () => {
    const { spinner, parts } = build();
    expect(spinner.children).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) expect(parts[id].parent).toBe(spinner);
  });

  it('names both groups, so a debugger shows which owns what', () => {
    const { tilt, spinner } = build();
    expect(tilt.name).toBe('diaboloTilt');
    expect(spinner.name).toBe('diaboloSpinner');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/build.test.js`
Expected: FAIL — `tilt` is undefined.

- [ ] **Step 3: Change `buildDiabolo`'s return**

In `src/diabolo/build.js`:

```js
export function buildDiabolo({ materials, segments = 96 }) {
  // Two nested groups, so the scroll-driven turn and the continuous spin never write
  // the same object. anime.js owns tilt.rotation.x; the render loop owns
  // spinner.rotation.y. Collapsing these into one group reintroduces the collision.
  const tilt = new Group();
  tilt.name = 'diaboloTilt';
  const spinner = new Group();
  spinner.name = 'diaboloSpinner';
  tilt.add(spinner);

  const parts = {};
  const radialSegments = Math.max(24, Math.round(segments * 0.75));

  for (const id of PART_IDS) {
    // ... existing per-part construction, unchanged ...
    spinner.add(group);       // was: root.add(group)
    parts[id] = group;
  }

  return { tilt, spinner, parts };
}
```

- [ ] **Step 4: Update `stage.js` to consume it**

In `src/diabolo/stage.js`:

```js
  const { tilt, spinner, parts } = buildDiabolo({ materials, segments: settings.segments });
  scene.add(tilt);
```

and in `render`, the spin moves to `spinner`:

```js
  function render(deltaSeconds) {
    const spin = rotationDeltas(deltaSeconds, state.spinRate);
    spinner.rotation.y += spin.root;
    spinMesh.rotation.y += spin.bearing;
    renderer.render(scene, camera);
  }
```

`dispose()` traverses `tilt` rather than `root`. Return `{ ..., tilt, spinner, parts, ... }` and drop `root`.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS. If anything still references `stage.root`, it fails here — fix the reference rather than re-adding `root`.

- [ ] **Step 6: Commit**

```bash
git add src/diabolo/build.js src/diabolo/stage.js tests/build.test.js
git commit -m "feat: nest tilt over spinner so turn and spin own separate objects"
```

---
### Task 3: Rewrite the choreography — simultaneous explosion and turn

**This replaces the whole module.** The existing per-part sequential-beat structure (`SCROLL_BEATS`, `beatTarget`, `HERO_HOLD`, `BEAT_STAGGER`, `REASSEMBLE_AT`) is the wrong shape and must go, along with its tests. Do not try to preserve it.

What replaces it: every part moves **at the same time**, along the object's own axis, spaced by how far out it sits in the assembly. Simultaneously, `tilt.rotation.x` turns the object from face-on to profile. Both resolve together.

**Files:**
- Rewrite: `src/scroll/choreography.js`
- Rewrite: `tests/choreography.test.js`
- Modify: `tests/choreography.dom.test.js` (keep the sticky/fixed guard tests, replace the happy path)
- Modify: `src/main.js` (call-site signature)

**Interfaces:**
- Consumes: `HOME` from `../diabolo/build.js`; `parts`, `tilt`, `state` from the stage
- Produces:
  - `PART_RANK: Record<string, number>` — distance from the centre in assembly order
  - `SPACING = 0.55`, `FACE_ON_X = -Math.PI / 2`, `PROFILE_X = 0`, `SCRUB_DURATION = 1000`
  - `explodedY(partId): number` — pure, unit-tested
  - `createChoreography({ parts, tilt, state, scrollTarget }): { timeline, dispose }`

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `tests/choreography.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  PART_RANK, SPACING, FACE_ON_X, PROFILE_X, explodedY,
} from '../src/scroll/choreography.js';
import { HOME } from '../src/diabolo/build.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

describe('PART_RANK', () => {
  it('ranks every part by how far out it sits in the assembly', () => {
    expect(Object.keys(PART_RANK).sort()).toEqual([...PART_IDS].sort());
    expect(PART_RANK.axleBearing).toBe(0);
    expect(PART_RANK.hubConeTop).toBe(1);
    expect(PART_RANK.gasketTop).toBe(2);
    expect(PART_RANK.cupTop).toBe(3);
  });

  it('ranks mirrored parts identically, so the explosion stays symmetric', () => {
    expect(PART_RANK.hubConeTop).toBe(PART_RANK.hubConeBottom);
    expect(PART_RANK.gasketTop).toBe(PART_RANK.gasketBottom);
    expect(PART_RANK.cupTop).toBe(PART_RANK.cupBottom);
  });
});

describe('explodedY', () => {
  it('leaves the centre bearing exactly where it rests, as the reference part', () => {
    expect(explodedY('axleBearing')).toBe(0);
    expect(explodedY('axleBearing')).toBe(HOME.axleBearing.y);
  });

  it('orders the top half outward by rank', () => {
    const order = ['axleBearing', 'hubConeTop', 'gasketTop', 'cupTop'];
    for (let i = 1; i < order.length; i++) {
      expect(explodedY(order[i])).toBeGreaterThan(explodedY(order[i - 1]));
    }
  });

  it('stays symmetric about the centre', () => {
    expect(explodedY('cupTop')).toBeCloseTo(-explodedY('cupBottom'), 10);
    expect(explodedY('gasketTop')).toBeCloseTo(-explodedY('gasketBottom'), 10);
    expect(explodedY('hubConeTop')).toBeCloseTo(-explodedY('hubConeBottom'), 10);
  });

  it('spaces parts exactly evenly, which is what makes it read as a measured diagram', () => {
    const ladder = ['cupTop', 'gasketTop', 'hubConeTop', 'axleBearing'].map(explodedY);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i - 1] - ladder[i]).toBeCloseTo(SPACING, 10);
    }
  });

  it('moves every part except the bearing away from home', () => {
    for (const id of PART_IDS) {
      if (id === 'axleBearing') continue;
      expect(Math.abs(explodedY(id))).toBeGreaterThan(Math.abs(HOME[id].y));
    }
  });

  it('derives from rank and SPACING alone, so retuning the spread needs one number', () => {
    expect(explodedY('cupTop')).toBeCloseTo(3 * SPACING, 10);
    expect(explodedY('gasketTop')).toBeCloseTo(2 * SPACING, 10);
    expect(explodedY('hubConeTop')).toBeCloseTo(1 * SPACING, 10);
  });
});

describe('orientation', () => {
  it('starts face-on, looking straight down the axle', () => {
    expect(FACE_ON_X).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('ends in profile', () => {
    expect(PROFILE_X).toBe(0);
  });

  it('turns a quarter turn in total', () => {
    expect(Math.abs(PROFILE_X - FACE_ON_X)).toBeCloseTo(Math.PI / 2, 10);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/choreography.test.js`
Expected: FAIL — `PART_RANK` and `explodedY` are not exported.

- [ ] **Step 3: Write the module**

Replace `src/scroll/choreography.js` entirely:

```js
import { createTimeline, onScroll } from 'animejs';
import { HOME } from '../diabolo/build.js';

/**
 * Distance from the centre in assembly order. The bearing is the reference part and
 * does not move; everything else travels outward in proportion to its rank, which is
 * what produces the even spacing of a technical exploded view.
 */
export const PART_RANK = Object.freeze({
  axleBearing: 0,
  hubConeTop: 1,
  hubConeBottom: 1,
  gasketTop: 2,
  gasketBottom: 2,
  cupTop: 3,
  cupBottom: 3,
});

/** Scene units between adjacent parts when fully exploded. The one number to retune. */
export const SPACING = 0.55;

/** Looking straight down the axle: the object reads as concentric circles. */
export const FACE_ON_X = -Math.PI / 2;
/** The familiar hourglass silhouette. */
export const PROFILE_X = 0;

/** Arbitrary timeline length; scroll progress maps onto it, so only ratios matter. */
export const SCRUB_DURATION = 1000;

/**
 * Pure: where a part sits when fully exploded. Extracted from the timeline so the
 * spacing arithmetic is testable without a scroll container.
 */
export function explodedY(partId) {
  // A function of rank alone, not of the rest position. Adding SPACING to HOME would
  // inherit the assembly's own uneven gaps (0.045 / 0.120 / 0.070) and the exploded
  // view would not read as a measured diagram. Measured gaps here: exactly 0.550.
  const direction = Math.sign(HOME[partId].y);
  return direction * PART_RANK[partId] * SPACING;
}

export function createChoreography({ parts, tilt, state, scrollTarget }) {
  // A sticky or fixed element's rect never travels, so scroll progress can never
  // advance and the timeline would silently sit at 0. Fail loudly instead.
  if (typeof getComputedStyle === 'function' && scrollTarget) {
    const position = getComputedStyle(scrollTarget).position;
    if (position === 'sticky' || position === 'fixed') {
      throw new Error(
        `createChoreography: scrollTarget has position:${position}, so its rect never ` +
        `travels and scroll progress cannot advance. Pass an element that scrolls with the page.`
      );
    }
  }

  const timeline = createTimeline({
    defaults: { ease: 'inOutQuad', duration: SCRUB_DURATION },
    autoplay: onScroll({
      target: scrollTarget,
      sync: 0.2,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  // Every part starts at the same instant. Position 0 for all of them is the whole
  // point: a staggered start reads as a queue, which is what this replaced.
  for (const partId of Object.keys(PART_RANK)) {
    timeline.add(parts[partId].position, { y: explodedY(partId) }, 0);
  }

  // The turn runs across the same span, so the object arrives in profile exactly as
  // the parts finish separating.
  timeline.add(tilt.rotation, { x: PROFILE_X }, 0);

  // The bearing spins up as the object opens, then settles.
  timeline
    .add(state, { spinRate: 3.5, duration: SCRUB_DURATION * 0.5 }, 0)
    .add(state, { spinRate: 1, duration: SCRUB_DURATION * 0.5 }, SCRUB_DURATION * 0.5);

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
```

- [ ] **Step 4: Replace the DOM test's happy path**

In `tests/choreography.dom.test.js`, keep the three sticky/fixed guard tests unchanged (update their `createChoreography` call to pass `tilt` and `parts` from a real build). Replace the happy-path test with one asserting **simultaneity**, the property that was wrong before:

```js
describe('simultaneous explosion', () => {
  const setup = () => {
    const target = document.createElement('div');
    target.style.position = 'static';
    document.body.append(target);
    const { tilt, spinner, parts } = buildDiabolo({
      materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16,
    });
    const state = { spinRate: 1 };
    const choreo = createChoreography({ parts, tilt, state, scrollTarget: target });
    return { ...choreo, parts, tilt, spinner, state };
  };

  it('has every part in motion at the same time, rather than one after another', () => {
    const { timeline, parts } = setup();
    timeline.seek(SCRUB_DURATION * 0.5);
    for (const id of Object.keys(PART_RANK)) {
      if (id === 'axleBearing') continue;
      const y = parts[id].position.y;
      expect(Math.abs(y - HOME[id].y), `${id} has not started`).toBeGreaterThan(1e-6);
      expect(Math.abs(y - explodedY(id)), `${id} has already finished`).toBeGreaterThan(1e-6);
    }
  });

  it('lands every part on its exploded position at the end', () => {
    const { timeline, parts } = setup();
    timeline.seek(SCRUB_DURATION);
    for (const id of Object.keys(PART_RANK)) {
      expect(parts[id].position.y).toBeCloseTo(explodedY(id), 4);
    }
  });

  it('turns the object from face-on to profile across the same span', () => {
    const { timeline, tilt } = setup();
    timeline.seek(0);
    const atStart = tilt.rotation.x;
    timeline.seek(SCRUB_DURATION);
    expect(tilt.rotation.x).toBeCloseTo(PROFILE_X, 4);
    expect(Math.abs(atStart - tilt.rotation.x)).toBeGreaterThan(0.5);
  });

  it('never writes the spinner, which the render loop owns', () => {
    const { timeline, spinner } = setup();
    const before = spinner.rotation.y;
    timeline.seek(SCRUB_DURATION * 0.7);
    expect(spinner.rotation.y).toBe(before);
  });
});
```

Import `buildDiabolo` and `HOME` from `../src/diabolo/build.js`, and `PART_RANK`, `explodedY`, `PROFILE_X`, `SCRUB_DURATION` from the module under test.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS. `src/main.js` still calls `createChoreography` with the old signature — pass `tilt: stage.tilt` and drop any `stage.root` reference. Task 4 rewires the call fully.

- [ ] **Step 6: Prove the simultaneity test bites**

Temporarily stagger the position tweens — `timeline.add(parts[partId].position, { y: explodedY(partId) }, PART_RANK[partId] * 200)` — re-run, and confirm the "every part in motion at the same time" test FAILS. Revert and confirm green. Report both runs: a simultaneity test that still passes under a staggered timeline is worthless.

- [ ] **Step 7: Commit**

```bash
git add src/scroll/choreography.js tests/choreography.test.js tests/choreography.dom.test.js src/main.js
git commit -m "feat: simultaneous axial explosion with face-on to profile turn"
```

---

### Task 4: Entrance sequence

On load the parts converge from scattered into the assembled object. Only when that finishes does scroll take over.

**The ordering is a correctness requirement, not a preference.** The entrance and the scroll timeline both write part positions. If both are live they fight and the object jitters. The scroll timeline is created **inside** the entrance's completion callback.

**Files:**
- Create: `src/scroll/entrance.js`
- Modify: `src/main.js`
- Test: `tests/entrance.test.js`

**Interfaces:**
- Consumes: `HOME` from `../diabolo/build.js`; `FACE_ON_X` from `./choreography.js`
- Produces:
  - `ENTRANCE_SCATTER = 4.5`, `ENTRANCE_DURATION = 1400`
  - `entranceStartY(partId): number` — pure
  - `createEntrance({ parts, tilt, onComplete }): { timeline, skip }`
  - `skip()` places the final entrance state immediately and fires `onComplete` — the reduced-motion path.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest';
import {
  ENTRANCE_SCATTER, entranceStartY, createEntrance,
} from '../src/scroll/entrance.js';
import { FACE_ON_X } from '../src/scroll/choreography.js';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

const scene = () => buildDiabolo({ materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16 });

describe('entranceStartY', () => {
  it('starts every part further out than it will ever travel', () => {
    for (const id of PART_IDS) {
      expect(Math.abs(entranceStartY(id))).toBeGreaterThan(Math.abs(HOME[id].y));
    }
  });

  it('scatters symmetrically about the centre', () => {
    expect(entranceStartY('cupTop')).toBeCloseTo(-entranceStartY('cupBottom'), 10);
  });

  it('gives even the centre bearing somewhere to come from', () => {
    expect(entranceStartY('axleBearing')).not.toBe(0);
  });

  it('derives from ENTRANCE_SCATTER, so the spread is one number', () => {
    expect(entranceStartY('cupTop')).toBeCloseTo(HOME.cupTop.y + ENTRANCE_SCATTER, 10);
  });
});

describe('createEntrance', () => {
  it('places parts scattered and face-on before it plays', () => {
    const { tilt, parts } = scene();
    createEntrance({ parts, tilt, onComplete: () => {} });
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 6);
    for (const id of PART_IDS) {
      expect(parts[id].position.y).toBeCloseTo(entranceStartY(id), 6);
    }
  });

  it('converges every part onto its rest position by the end', () => {
    const { tilt, parts } = scene();
    const { timeline } = createEntrance({ parts, tilt, onComplete: () => {} });
    timeline.seek(timeline.duration);
    for (const id of PART_IDS) {
      expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 4);
    }
  });

  it('leaves the object face-on when it finishes, so the turn has somewhere to go', () => {
    const { tilt, parts } = scene();
    const { timeline } = createEntrance({ parts, tilt, onComplete: () => {} });
    timeline.seek(timeline.duration);
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 4);
  });

  it('skip() lands the final state immediately and reports completion', () => {
    const { tilt, parts } = scene();
    const onComplete = vi.fn();
    const { skip } = createEntrance({ parts, tilt, onComplete });
    skip();
    for (const id of PART_IDS) expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 4);
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 4);
    expect(onComplete.mock.calls.length).toBe(1);
  });

  it('reports completion exactly once, so the scroll timeline is never built twice', () => {
    const { tilt, parts } = scene();
    const onComplete = vi.fn();
    const { skip } = createEntrance({ parts, tilt, onComplete });
    skip();
    skip();
    expect(onComplete.mock.calls.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/entrance.test.js`
Expected: FAIL — cannot resolve `../src/scroll/entrance.js`.

- [ ] **Step 3: Write the module**

```js
import { createTimeline } from 'animejs';
import { HOME } from '../diabolo/build.js';
import { FACE_ON_X } from './choreography.js';

/** How far out parts begin, comfortably beyond any exploded position. */
export const ENTRANCE_SCATTER = 4.5;
export const ENTRANCE_DURATION = 1400;

/**
 * Pure: where a part begins the entrance. The centre bearing gets a nudge too, so it
 * arrives with everything else rather than being the one piece that was always there.
 */
export function entranceStartY(partId) {
  const rest = HOME[partId].y;
  const direction = Math.sign(rest) || 1;
  return rest + direction * ENTRANCE_SCATTER;
}

/**
 * The load sequence: parts converge from scattered onto the assembled object, face-on.
 *
 * `onComplete` is where the caller creates the scroll timeline. It must not be created
 * before this fires — the entrance and the scroll timeline both write part positions,
 * and two live timelines on one property fight.
 */
export function createEntrance({ parts, tilt, onComplete }) {
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    onComplete();
  };

  // Establish the starting state synchronously, so the first painted frame is already
  // correct rather than flashing the assembled object for one frame.
  tilt.rotation.x = FACE_ON_X;
  for (const partId of Object.keys(HOME)) {
    parts[partId].position.y = entranceStartY(partId);
  }

  const timeline = createTimeline({
    defaults: { ease: 'outExpo', duration: ENTRANCE_DURATION },
    onComplete: finish,
  });

  for (const partId of Object.keys(HOME)) {
    timeline.add(parts[partId].position, { y: HOME[partId].y }, 0);
  }

  return {
    timeline,
    skip() {
      tilt.rotation.x = FACE_ON_X;
      for (const partId of Object.keys(HOME)) {
        parts[partId].position.y = HOME[partId].y;
      }
      timeline.pause();
      finish();
    },
  };
}
```

- [ ] **Step 4: Wire the ordering in `src/main.js`**

```js
  document.documentElement.dataset.stage = prefersReducedMotion() ? 'static' : 'live';

  const lifecycle = createLifecycle({ element: stageEl, onFrame: stage.render });
  window.__vd = { stage, lifecycle, choreography: null, entrance: null };

  const attachScroll = () => {
    // Created here, not earlier: the entrance and the scroll timeline both write part
    // positions, and two live timelines on one property fight.
    window.__vd.choreography = createChoreography({
      parts: stage.parts,
      tilt: stage.tilt,
      state: stage.state,
      scrollTarget: content,
    });
  };

  const entrance = createEntrance({ parts: stage.parts, tilt: stage.tilt, onComplete: attachScroll });
  window.__vd.entrance = entrance;
  if (prefersReducedMotion()) entrance.skip();
```

Restructure the existing reduced-motion branch so it uses `entrance.skip()` rather than returning early — reduced-motion users still get the assembled, face-on object and a fully readable page, just no motion. Keep `data-stage="static"` for that case, and keep the single `stage.render(0)` that paints it.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scroll/entrance.js src/main.js tests/entrance.test.js
git commit -m "feat: add entrance sequence, attach scroll only on its completion"
```

---
### Task 5: The CSS3D layer — real DOM inside the 3D composition

This is what makes the page "2D and 3D combined" rather than "3D with text laid on top". Verified on the reference: animejs.com's `#engine` holds `canvas#renderer` + `div#css-renderer` + `div#labels-renderer`, sharing one camera.

`CSS3DSprite` (confirmed present in `three@0.186` at `examples/jsm/renderers/CSS3DRenderer.js`, alongside `CSS3DObject` and `CSS3DRenderer`) is the billboard variant — it always faces the camera. Parenting sprites to the part groups gives both properties at once: the labels travel with the explosion, and stay readable through the face-on-to-profile turn.

**Files:**
- Create: `src/diabolo/labels.js`
- Modify: `src/diabolo/stage.js` (overlay renderers), `src/main.js`, `index.html`, `src/styles/stage.css`
- Test: `tests/labels.dom.test.js`

**Interfaces:**
- Consumes: `parts` from the build, `PART_IDS` from profiles
- Produces:
  - `PART_LABELS: Record<string, { index: string, name: string }>`
  - `LABEL_OFFSET_X = 1.15`, `LABEL_SCALE = 0.006`
  - `createLabels({ parts, container }): { elements, render, setSize, dispose }`
- `createStage` gains `addOverlay(o)`, where `o` is `{ render(scene, camera), setSize(w, h) }`. `stage.render` calls each overlay after the WebGL draw; `stage.resize` calls each `setSize`.

**On the module boundary:** `diabolo/*` holds no *club copy*. Technical annotation of the object's own parts is not club copy — no bio, date, name or event text appears here. That distinction is the rule's intent, and a test enforces it.

- [ ] **Step 1: Write the failing test**

```js
// tests/labels.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PART_LABELS, LABEL_OFFSET_X, createLabels } from '../src/diabolo/labels.js';
import { buildDiabolo } from '../src/diabolo/build.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

const scene = () => buildDiabolo({ materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16 });

describe('PART_LABELS', () => {
  it('labels every part', () => {
    expect(Object.keys(PART_LABELS).sort()).toEqual([...PART_IDS].sort());
  });

  it('numbers them in assembly order, top to bottom', () => {
    const indices = PART_IDS.map((id) => PART_LABELS[id].index);
    expect(indices).toEqual(['01', '02', '03', '04', '05', '06', '07']);
  });

  it('carries no club copy — these annotate the object, not the site', () => {
    const text = Object.values(PART_LABELS).map((l) => l.name).join(' ');
    expect(text).not.toMatch(/NYU|Violet|Kimmel|Aaron|Jonathan/i);
  });
});

describe('createLabels', () => {
  it('attaches one sprite to every part, so labels travel with the explosion', () => {
    const { parts } = scene();
    const { elements } = createLabels({ parts, container: document.createElement('div') });
    expect(Object.keys(elements)).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) {
      const sprite = parts[id].children.find((c) => c.element);
      expect(sprite, `${id} has no label sprite`).toBeDefined();
    }
  });

  it('offsets labels to the side so they do not sit on top of the part', () => {
    const { parts } = scene();
    createLabels({ parts, container: document.createElement('div') });
    const sprite = parts.cupTop.children.find((c) => c.element);
    expect(Math.abs(sprite.position.x)).toBeCloseTo(LABEL_OFFSET_X, 6);
  });

  it('alternates sides so stacked labels do not overlap once exploded', () => {
    const { parts } = scene();
    createLabels({ parts, container: document.createElement('div') });
    const sides = PART_IDS.map((id) => Math.sign(parts[id].children.find((c) => c.element).position.x));
    expect(new Set(sides).size).toBe(2);
  });

  it('renders real DOM, so the text stays selectable and screen-readable', () => {
    const { parts } = scene();
    const { elements } = createLabels({ parts, container: document.createElement('div') });
    const el = elements.cupTop;
    expect(el.textContent).toContain(PART_LABELS.cupTop.index);
    expect(el.textContent).toContain(PART_LABELS.cupTop.name);
    expect(el.dataset.part).toBe('cupTop');
  });

  it('mounts its renderer into the given container', () => {
    const { parts } = scene();
    const container = document.createElement('div');
    createLabels({ parts, container });
    expect(container.children.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/labels.dom.test.js`
Expected: FAIL — cannot resolve `../src/diabolo/labels.js`.

- [ ] **Step 3: Write the module**

```js
// src/diabolo/labels.js
import { CSS3DRenderer, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { PART_IDS } from './profiles.js';

/**
 * Technical annotation of the object's own parts. Not club copy — no bios, dates or
 * event text belongs here, and a test asserts that.
 */
export const PART_LABELS = Object.freeze({
  cupTop:        { index: '01', name: 'UPPER CUP' },
  gasketTop:     { index: '02', name: 'GASKET' },
  hubConeTop:    { index: '03', name: 'HUB CONE' },
  axleBearing:   { index: '04', name: 'AXLE BEARING' },
  hubConeBottom: { index: '05', name: 'HUB CONE' },
  gasketBottom:  { index: '06', name: 'GASKET' },
  cupBottom:     { index: '07', name: 'LOWER CUP' },
});

/** How far to the side of its part a label sits, in scene units. */
export const LABEL_OFFSET_X = 1.15;
/** CSS3D works in CSS pixels; this brings a ~200px element down to scene scale. */
export const LABEL_SCALE = 0.006;

/**
 * A CSS3DRenderer layer sharing the WebGL camera.
 *
 * Sprites are parented to the part groups, so they travel with the explosion. CSS3DSprite
 * billboards toward the camera, so they stay readable through the face-on-to-profile turn
 * — a plain CSS3DObject would turn edge-on and vanish.
 *
 * The elements are real DOM: selectable, focusable, translatable, screen-readable. That is
 * what makes going full spectacle cost nothing in accessibility.
 */
export function createLabels({ parts, container }) {
  const renderer = new CSS3DRenderer();
  renderer.domElement.className = 'label-layer';
  container.append(renderer.domElement);

  const elements = {};

  PART_IDS.forEach((id, order) => {
    const meta = PART_LABELS[id];
    const el = document.createElement('div');
    el.className = 'part-label';
    el.dataset.part = id;

    const index = document.createElement('span');
    index.className = 'part-label-index';
    index.textContent = meta.index;

    const name = document.createElement('span');
    name.className = 'part-label-name';
    name.textContent = meta.name;

    el.append(index, name);

    const sprite = new CSS3DSprite(el);
    sprite.scale.setScalar(LABEL_SCALE);
    // Alternate sides so stacked labels never collide once the object is exploded.
    sprite.position.set(LABEL_OFFSET_X * (order % 2 === 0 ? 1 : -1), 0, 0);

    parts[id].add(sprite);
    elements[id] = el;
  });

  return {
    elements,
    render(scene, camera) {
      renderer.render(scene, camera);
    },
    setSize(width, height) {
      renderer.setSize(width, height);
    },
    dispose() {
      for (const id of PART_IDS) {
        const sprite = parts[id].children.find((c) => c.element);
        if (sprite) parts[id].remove(sprite);
      }
      renderer.domElement.remove();
    },
  };
}
```

- [ ] **Step 4: Add overlay support to `stage.js`**

Inside `createStage`, keep a local `const overlays = []`. In `render`, after `renderer.render(scene, camera)`:

```js
    for (const overlay of overlays) overlay.render(scene, camera);
```

In `resize`, after the camera update:

```js
    for (const overlay of overlays) overlay.setSize(view.width, view.height);
```

Add to the returned object:

```js
    addOverlay(overlay) {
      overlays.push(overlay);
      overlay.setSize(canvas.clientWidth, canvas.clientHeight);
    },
```

Registering after construction avoids a chicken-and-egg: labels need `stage.parts`, and the stage needs the labels as an overlay.

- [ ] **Step 5: Add the container to `index.html` and wire `main.js`**

In `index.html`, inside `#stage`, after the canvas:

```html
    <div id="label-layer"></div>
```

`#stage` currently carries `aria-hidden="true"`. The label text is genuine content, so move that attribute off `#stage` and onto the `<canvas>` and the decorative fallback SVG individually, leaving `#label-layer` exposed to assistive technology.

In `main.js`:

```js
  const stage = createStage({ canvas, tier });
  const labels = createLabels({ parts: stage.parts, container: document.getElementById('label-layer') });
  stage.addOverlay(labels);
```

- [ ] **Step 6: Style the labels in `src/styles/stage.css`**

`.label-layer` is `position: absolute; inset: 0; pointer-events: none;`. `.part-label` is mono, uppercase, `0.68rem`, letter-spacing `0.18em`, `var(--ink-dim)`, `white-space: nowrap`; `.part-label-index` in `var(--violet-lift)`. Add a 1px `var(--rule)` leader line from the label toward its part via `::before`.

- [ ] **Step 7: Run the full suite and commit**

Run: `npx vitest run`

```bash
git add src/diabolo/labels.js src/diabolo/stage.js src/main.js index.html src/styles/stage.css tests/labels.dom.test.js
git commit -m "feat: add CSS3D label layer with real DOM in 3D space"
```

---

### Task 6: Promote the spin, and the S-register art direction

**Files:**
- Modify: `src/diabolo/stage.js`, `src/styles/*.css`
- Modify: `tests/stage.test.js`

- [ ] **Step 1: Promote the spin**

`IDLE_SPIN = 0.22` rad/s is roughly one revolution every 28 seconds — invisible. A diabolo that does not spin is a dead diabolo. Pin the intent first:

```js
  it('spins fast enough to read as motion rather than drift', () => {
    // At least one visible revolution every ~10 seconds.
    expect(rotationDeltas(1, 1).root).toBeGreaterThan(0.6);
  });
```

Run it, confirm it fails at 0.22, then set `IDLE_SPIN = 0.7` in `src/diabolo/stage.js`. Keep `BEARING_SPIN_MULTIPLIER = 6` so the bearing still reads as the fast centre.

- [ ] **Step 2: The design pass**

**REQUIRED SUB-SKILL:** invoke `frontend-design` and let it own the visual thesis. This plan sets constraints, not style.

Constraints:

- **Industrial technical drawing**, committed to, with the earlier W-register hedging removed. One saturated element — the diabolo — on a near-black ground. NYU violet anchor; the gasket's cyan is the only accent and appears rarely.
- Space Grotesk (display/body) + Space Mono (annotation) are already loaded and working. Keep them.
- The page is now **one composition**, not a stage with sections beside it. The CSS3D part labels are part of the type system: section headings, mono section indices and part labels must read as one family.
- Keep the alternating two-column layout — it is the strongest thing in the current build, and labels alternating sides reinforce it.
- Every fallback state (`[data-stage="unsupported"]`, `[data-stage="static"]`) must look deliberate.
- Text over the canvas must stay legible at 375 / 768 / 1440. Measure contrast; do not assume it.
- Keep `:focus-visible` on every interactive element, including any focusable label.

- [ ] **Step 3: Run the suite, build, and commit**

```bash
npx vitest run && npm run build
git add -A
git commit -m "feat: promote the spin and apply S-register art direction"
```

---

### Task 7: Verification

Carries the previous record's discipline. **Report only what you observe.** Where the environment cannot produce a condition, say so and label any stand-in synthetic.

- [ ] **Step 1: Build and serve**

```bash
npm run build && npx vite preview --port 4173
```

- [ ] **Step 2: The property that was wrong before — simultaneity**

```js
const vd = window.__vd, tl = vd.choreography.timeline;
const at = (t) => { tl.seek(t); return Object.fromEntries(
  Object.entries(vd.stage.parts).map(([k, g]) => [k, +g.position.y.toFixed(3)])); };
console.log(JSON.stringify({ start: at(0), half: at(tl.duration * 0.5), end: at(tl.duration) }, null, 1));
```

Every part except `axleBearing` must be **strictly between** rest and exploded at the halfway point. If any is still at rest or already finished, the explosion is not simultaneous — report that rather than explaining it away.

- [ ] **Step 3: The turn**

```js
tl.seek(0);           console.log('face-on:', vd.stage.tilt.rotation.x);  // ≈ -1.5708
tl.seek(tl.duration); console.log('profile:', vd.stage.tilt.rotation.x);  // ≈ 0
```

- [ ] **Step 4: Ownership still holds**

```js
const before = vd.stage.spinner.rotation.y;
tl.seek(tl.duration * 0.7);
console.log('spinner untouched by anime:', vd.stage.spinner.rotation.y === before);
```

- [ ] **Step 5: The entrance never overlaps the scroll timeline**

Reload and check that `window.__vd.choreography` is `null` while the entrance runs and becomes non-null only after it completes. Record both observations with timings.

- [ ] **Step 6: Proportions and appearance**

Framebuffer readback as in the previous record: mean RGB, percentage of clearly-violet lit pixels, draw calls, triangles. Confirm the black axle now reads as a minor share of the silhouette.

- [ ] **Step 7: Labels**

Confirm `.part-label` elements exist, that their text is selectable (not `user-select: none`), and that they track their parts as the timeline seeks.

- [ ] **Step 8: Fallbacks, responsiveness, links**

Reduced motion, no-WebGL, 375 / 768 / 1440, every outbound link, final bundle size.

- [ ] **Step 9: Rewrite `docs/VERIFICATION.md`**

Replace it with this run's results. Keep the honest structure: a summary table with a status per claim, and an explicit "outstanding for a human on a real machine" list. Do not carry forward any number you did not re-measure.

```bash
git add docs/VERIFICATION.md
git commit -m "test: record S-register verification"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §2 Register S throughout | Task 6 |
| §3 Three layers | Task 5 |
| §4 Transform ownership | Task 2 (nesting), Tasks 3–4 (writers), Task 7 §4 (check) |
| §5 Proportions | Task 1 |
| §6 Simultaneous axial explosion | Task 3 |
| §7 Face-on → profile | Task 3 |
| §8 Entrance and its ordering | Task 4 |
| §9 Spin | Task 6 |
| §10 What carries over | no task — nothing to do, by design |
| §11 Verification | Task 7 |

**Placeholder scan:** no TBD/TODO, no "add error handling", no "similar to Task N".

**Type consistency:** `tilt`, `spinner`, `parts`, `PART_RANK`, `SPACING`, `explodedY`, `FACE_ON_X`, `PROFILE_X`, `SCRUB_DURATION`, `entranceStartY`, `createEntrance`, `PART_LABELS`, `LABEL_OFFSET_X`, `LABEL_SCALE`, `createLabels`, `addOverlay` are spelled identically at every definition and use site. `root` is retired in Task 2 and must not reappear.

**Verified while planning, not assumed:**
- `three@0.186` ships `CSS3DRenderer`, `CSS3DObject` and `CSS3DSprite` at `examples/jsm/renderers/CSS3DRenderer.js`, plus `CSS2DRenderer`.
- Retuned `DIMS` give `halfBearing 0.070`, `gasketY 0.190`, `neckY 0.235`, total height `2.190`, black share **17.4%** (down from 32.2%).
- Pure-rank `explodedY` yields exactly even 0.550 gaps, symmetric about the centre, bearing fixed at 0, every other part further from centre than its rest position. The first formula tried (`HOME.y + rank × SPACING`) gave uneven gaps of 0.595 / 0.670 / 0.620 and was rejected on measurement, not taste.
