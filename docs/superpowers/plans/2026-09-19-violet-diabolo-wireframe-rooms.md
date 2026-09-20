# Violet Diabolo — Wireframe Object & Four Rooms

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the glossy violet object with a flat unlit one drawn in edge lines, and replace the unbroken page-long scrub with four discrete rooms following on.energy's rhythm.

**Architecture:** Unlit `MeshBasicMaterial` fills plus a `LineSegments` edge overlay per part, at deliberately low geometry counts so the edges are countable. The light spill is deleted along with all PBR lighting machinery. The choreography collapses from six continuous acts to four rooms, with the explosion contained inside one of them.

**Tech Stack:** Three.js 0.186 · anime.js 4.5 · Vite 8 · Vitest 5

**Spec:** `docs/superpowers/specs/2026-09-19-violet-diabolo-wireframe-rooms-design.md`

**Starting state:** `main`, 220 tests passing, `npm run build` clean.

## Global Constraints

Every task's requirements implicitly include this section.

- **One owner per transform.** anime.js owns `tilt.rotation.{x,z}`, `tilt.position.{x,y}`, every part `Group`'s `.position`, `camera.position.{x,z}`, `state.spinRate`, `state.labelOpacity`. The render loop owns `spinner.rotation.y`, the bearing's `spinMesh.rotation.y`, and `camera.quaternion`. Edge `LineSegments` are children of their part's **mesh**, so they inherit its transform and introduce no new owner.
- **The object is unlit.** No material may declare `envMap`, `transmission`, `clearcoat`, `roughness` or `metalness`. A test asserts this.
- **One accent colour.** Exactly one part colour is the accent (red); no other saturated hue appears in the object.
- **Never pause anime.js's global engine.** A test greps all of `src/`.
- **No second animation engine.** Three.js renders, anime.js animates.
- **Module boundaries:** `content/*` no markup, `ui/*` no 3D, `diabolo/*` and `scroll/*` no club copy.
- **Do not edit the copy in `src/content/index.js`.** Verbatim club text with a deliberate curly/ASCII apostrophe mix pinned by tests. New exports are fine.
- **Nothing paints a background behind body text**, and no text is stroked. Both guards already exist; keep them passing.
- **Content is never gated behind the 3D system.**
- All 220 existing tests keep passing except where a task explicitly rewrites one. `npx vitest run` before every commit.

## File Map

| Path | Change |
|---|---|
| `src/diabolo/materials.js` | **gutted and rebuilt** — flat fills + edge materials (Task 1) |
| `src/diabolo/profiles.js` | hub cone 24 → 2 profile points (Task 1) |
| `src/diabolo/build.js` | edge `LineSegments` per part; segment floor removed (Task 1) |
| `src/diabolo/stage.js` | `createMaterials()` signature; tier drops `segments`/`transmission` (Task 1) |
| `src/diabolo/spill.js` | **deleted** (Task 2) |
| `src/scroll/choreography.js` | **rewritten** — four rooms (Task 3) |
| `src/ui/nav.js` | **new** (Task 4) |
| `src/ui/sections.js` | room patterns (Task 4) |
| `src/styles/*.css` | on.energy language (Task 5) |
| `index.html` | nav mount, spill layer removed (Tasks 2, 4) |

## Measured values this plan depends on

Computed against the real profiles before writing, not estimated.

`EdgesGeometry(geometry, 1)` includes every facet boundary. Edge lines per part at **8 profile points × 12 radial segments**, with the hub cone reduced to 2 points:

| part | lines |
|---|---|
| cups (×2) | 204 |
| bearing | 132 |
| gaskets (×2) | 72 |
| hub cones (×2) | **48** (was 312 at 24 points) |
| **total** | **780** |

For comparison, the current 24 × 128 cup yields **5120** lines and reads as solid. Raising the
`EdgesGeometry` threshold instead is a trap: at 20° a smooth lathe drops to 40 lines and the
wireframe disappears entirely.

---

### Task 1: The flat wireframe object

The largest single change. Three things happen together because each is useless without the others: the material goes unlit, the geometry goes low-poly, and the edges get drawn.

**Files:**
- Rewrite: `src/diabolo/materials.js`
- Modify: `src/diabolo/profiles.js`, `src/diabolo/build.js`, `src/diabolo/stage.js`
- Modify: `tests/materials.dom.test.js`, `tests/build.test.js`, `tests/profiles.test.js`, `tests/stage.test.js`

**Interfaces:**
- Produces:
  - `PART_COLORS: Record<'cup'|'hub'|'bearing'|'gasket', string>` and `EDGE_COLORS` — same keys
  - `ACCENT = 'gasket'` — names which part carries the single accent
  - `createMaterials(): { cup, gasket, hub, bearing, edge: { cup, gasket, hub, bearing } }` — **no arguments**; an unlit material needs neither a renderer nor a quality tier
  - `disposeMaterials(materials)` — unchanged contract, now walks `edge` too
  - `PROFILE_POINTS = 8`, `RADIAL_SEGMENTS = 12`, `EDGE_THRESHOLD = 1` from `build.js`
  - `buildDiabolo({ materials, segments = PROFILE_POINTS, radialSegments = RADIAL_SEGMENTS })`

- [ ] **Step 1: Write the failing tests**

Replace `tests/materials.dom.test.js` entirely — `GRADIENT_STOPS` and `createGradientTexture` no longer exist:

```js
// tests/materials.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PART_COLORS, EDGE_COLORS, ACCENT, createMaterials, disposeMaterials } from '../src/diabolo/materials.js';

const PBR = ['envMap', 'transmission', 'clearcoat', 'roughness', 'metalness', 'thickness', 'ior'];

const saturation = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722;
};

describe('flat palette', () => {
  it('colours every part kind', () => {
    expect(Object.keys(PART_COLORS).sort()).toEqual(['bearing', 'cup', 'gasket', 'hub']);
    expect(Object.keys(EDGE_COLORS).sort()).toEqual(Object.keys(PART_COLORS).sort());
  });

  it('uses valid hex throughout', () => {
    for (const c of [...Object.values(PART_COLORS), ...Object.values(EDGE_COLORS)]) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('names a part that exists as the accent', () => {
    expect(PART_COLORS[ACCENT]).toBeDefined();
  });

  it('keeps the accent the only saturated colour', () => {
    const accent = saturation(PART_COLORS[ACCENT]);
    for (const [key, hex] of Object.entries(PART_COLORS)) {
      if (key === ACCENT) continue;
      expect(saturation(hex), `${key} competes with the accent`).toBeLessThan(accent * 0.6);
    }
  });

  it('draws edges lighter than their fill, so form reads without lighting', () => {
    for (const key of Object.keys(PART_COLORS)) {
      expect(luminance(EDGE_COLORS[key]), `${key} edges vanish into the fill`)
        .toBeGreaterThan(luminance(PART_COLORS[key]));
    }
  });
});

describe('createMaterials', () => {
  it('takes no renderer and no quality tier, because unlit needs neither', () => {
    expect(createMaterials.length).toBe(0);
  });

  it('builds a fill and an edge material for every part kind', () => {
    const m = createMaterials();
    for (const key of Object.keys(PART_COLORS)) {
      expect(m[key], `${key} fill`).toBeDefined();
      expect(m.edge[key], `${key} edge`).toBeDefined();
    }
  });

  it('declares no lighting properties anywhere', () => {
    const m = createMaterials();
    const all = [...Object.keys(PART_COLORS).map((k) => m[k]), ...Object.values(m.edge)];
    for (const mat of all) {
      for (const prop of PBR) {
        expect(mat[prop], `${mat.type} still declares ${prop}`).toBeUndefined();
      }
    }
  });

  it('disposes fills and edges alike', () => {
    const m = createMaterials();
    const disposed = [];
    for (const mat of [...Object.keys(PART_COLORS).map((k) => m[k]), ...Object.values(m.edge)]) {
      mat.dispose = () => disposed.push(mat);
    }
    disposeMaterials(m);
    expect(disposed).toHaveLength(Object.keys(PART_COLORS).length * 2);
  });
});
```

Add to `tests/profiles.test.js`:

```js
describe('hub cone density', () => {
  it('describes its taper with as few points as a straight line needs', () => {
    // A linear taper is exact at 2 subdivisions; subdividing 24 times only multiplies
    // edge lines. Measured: 312 lines at 24 points versus 48 at 2, identical endpoints.
    expect(hubConeProfile()).toHaveLength(3);
  });

  it('still spans the same radii, so the silhouette is unchanged', () => {
    const p = hubConeProfile();
    expect(p[0].x).toBeCloseTo(DIMS.bearingRadius, 6);
    expect(p.at(-1).x).toBeCloseTo(DIMS.neckRadius, 6);
    expect(p.at(-1).y).toBeCloseTo(DIMS.hubHeight, 6);
  });
});
```

Add to `tests/build.test.js`, and update its `stubMaterials` to carry an `edge` map:

```js
const stubMaterials = {
  cup: { id: 'cup' }, gasket: { id: 'gasket' }, hub: { id: 'hub' }, bearing: { id: 'bearing' },
  edge: {
    cup: { id: 'edge-cup' }, gasket: { id: 'edge-gasket' },
    hub: { id: 'edge-hub' }, bearing: { id: 'edge-bearing' },
  },
};
```

```js
describe('edge wireframe', () => {
  const built = () => buildDiabolo({ materials: stubMaterials });
  const edgesOf = (parts, id) => {
    const mesh = parts[id].children.find((c) => c.geometry && c.type === 'Mesh');
    return { mesh, edges: mesh.children.find((c) => c.type === 'LineSegments') };
  };

  it('gives every part a LineSegments child of its mesh, not of its group', () => {
    const { parts } = built();
    for (const id of PART_IDS) {
      const { mesh, edges } = edgesOf(parts, id);
      expect(edges, `${id} has no edge overlay`).toBeDefined();
      // Parented to the mesh so it inherits the flip scale and adds no new owner.
      expect(edges.parent).toBe(mesh);
    }
  });

  it('draws a countable number of lines, not a solid mesh', () => {
    // The failure mode is not "no edges" but "so many the object reads as solid".
    // Measured at 8 profile points x 12 radial: 48-204 per part, 780 across the object.
    const { parts } = built();
    let total = 0;
    for (const id of PART_IDS) {
      const { edges } = edgesOf(parts, id);
      const lines = edges.geometry.attributes.position.count / 2;
      expect(lines, `${id} draws ${lines} lines`).toBeGreaterThan(20);
      expect(lines, `${id} draws ${lines} lines`).toBeLessThan(400);
      total += lines;
    }
    expect(total, `${total} lines across the object`).toBeLessThan(1200);
  });

  it('keeps geometry low-poly enough for the edges to be legible', () => {
    expect(RADIAL_SEGMENTS).toBeLessThanOrEqual(16);
    expect(PROFILE_POINTS).toBeLessThanOrEqual(12);
  });
});
```

Import `PROFILE_POINTS` and `RADIAL_SEGMENTS` from `../src/diabolo/build.js`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/materials.dom.test.js tests/build.test.js tests/profiles.test.js`
Expected: FAIL — `PART_COLORS`, `ACCENT`, `RADIAL_SEGMENTS` are not exported; the hub cone still returns 25 points.

- [ ] **Step 3: Rewrite `src/diabolo/materials.js`**

Replace the file entirely:

```js
import { Color, DoubleSide, LineBasicMaterial, MeshBasicMaterial } from 'three';

/**
 * Flat fills, one per part kind. The object is unlit, so nothing shades it — colour and
 * the edge overlay carry the whole of its form.
 */
export const PART_COLORS = Object.freeze({
  cup: '#b9a6dc',
  hub: '#15111b',
  bearing: '#9aa0ab',
  gasket: '#cf2f2a',
});

/** Edges sit lighter than their fill so the wireframe reads against it. */
export const EDGE_COLORS = Object.freeze({
  cup: '#e4dcf4',
  hub: '#6b6478',
  bearing: '#d6dae1',
  gasket: '#f2857f',
});

/** The single accent. Every other part stays low-chroma; a test enforces that. */
export const ACCENT = 'gasket';

/**
 * Unlit materials, so this needs neither a renderer nor a quality tier.
 *
 * Deleting the PBR path took RoomEnvironment, PMREMGenerator, the gradient canvas texture
 * and the transmission tier with it — including the render-target leak that machinery
 * needed two separate fixes for.
 */
export function createMaterials() {
  const fill = (key, extra = {}) =>
    new MeshBasicMaterial({ color: new Color(PART_COLORS[key]), ...extra });

  return {
    cup: fill('cup', { side: DoubleSide }),
    hub: fill('hub'),
    bearing: fill('bearing'),
    gasket: fill('gasket'),
    edge: Object.fromEntries(
      Object.keys(PART_COLORS).map((key) => [
        key,
        new LineBasicMaterial({ color: new Color(EDGE_COLORS[key]) }),
      ]),
    ),
  };
}

export function disposeMaterials(materials) {
  for (const value of Object.values(materials)) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
  for (const value of Object.values(materials.edge ?? {})) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
}
```

- [ ] **Step 4: Reduce the hub cone**

In `src/diabolo/profiles.js`, change `hubConeProfile`'s `const segments = 24;` to `const segments = 2;` and add to its docblock:

```
 * A linear taper is exact at two subdivisions — the endpoints are identical at any count.
 * Subdividing further only multiplies edge lines: 312 at 24 points versus 48 at 2.
```

- [ ] **Step 5: Draw the edges in `src/diabolo/build.js`**

Add the exports:

```js
/** Profile points per part. Low so EdgesGeometry yields a countable wireframe. */
export const PROFILE_POINTS = 8;
/** Revolution steps. Measured: 8 x 12 gives 48-204 lines per part, 780 across the object. */
export const RADIAL_SEGMENTS = 12;
/** Include every facet boundary. Raising this makes a smooth lathe lose its wireframe. */
export const EDGE_THRESHOLD = 1;
```

Change the signature and delete the floor:

```js
export function buildDiabolo({ materials, segments = PROFILE_POINTS, radialSegments = RADIAL_SEGMENTS }) {
```

The existing `const radialSegments = Math.max(24, Math.round(segments * 0.75));` line goes — that floor silently overrides any lower request, which would make this whole task a no-op.

Inside the part loop, after the mesh is created and before `group.add(mesh)`:

```js
    // Parented to the mesh, not the group: it inherits the flip scale for free and adds
    // no new owner of any transform.
    const edges = new LineSegments(
      new EdgesGeometry(geometry, EDGE_THRESHOLD),
      materials.edge[MATERIAL_FOR[id]],
    );
    mesh.add(edges);
```

Import `EdgesGeometry` and `LineSegments` from `three`.

- [ ] **Step 6: Update `src/diabolo/stage.js`**

`createMaterials` takes no arguments, and the tier no longer carries geometry or transmission:

```js
export const TIER_SETTINGS = Object.freeze({
  high: { dpr: 2.0 },
  base: { dpr: 1.5 },
});
```

Call `createMaterials()` and `buildDiabolo({ materials })`. Remove the `scene.environment` assignment — there is no environment map any more. In `tests/stage.test.js`, replace assertions about `TIER_SETTINGS.high.transmission` and `.segments` with one that `base.dpr < high.dpr`, the only quality knob left.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Anything still importing `GRADIENT_STOPS`, `createGradientTexture` or `createEnvironment` fails here — delete the reference rather than restoring the function.

- [ ] **Step 8: Prove the line-count guard bites**

Temporarily set `RADIAL_SEGMENTS = 128`, re-run, and confirm the "countable number of lines" test FAILS. Revert and confirm green. Report both runs — a wireframe test that passes on a solid-looking object is worthless, and that is exactly the failure the measurement round caught.

- [ ] **Step 9: Commit**

```bash
git add src/diabolo tests/materials.dom.test.js tests/build.test.js tests/profiles.test.js tests/stage.test.js
git commit -m "feat: flat unlit object drawn in edge lines"
```

---

### Task 2: Delete the light spill

`src/diabolo/spill.js` exists because a glossy object casts light onto the page. A flat unlit object does not, and on.energy's ground is plain dark with nothing blooming on it. Keeping it would repeat the grid's mistake — decoration outliving the idea that justified it.

**Files:**
- Delete: `src/diabolo/spill.js`, `tests/spill.dom.test.js`, `tests/stage-spill.dom.test.js`
- Modify: `src/main.js`, `index.html`, `src/styles/stage.css`, `src/styles/sections.css`, `src/styles/base.css`, `tests/main.dom.test.js`, `tests/visual-language.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: nothing. The contract is what no longer exists.

- [ ] **Step 1: Write the failing test**

Add to `tests/visual-language.test.js`:

```js
describe('the light spill is gone', () => {
  it('leaves no spill module behind', () => {
    expect(existsSync(new URL('../src/diabolo/spill.js', import.meta.url))).toBe(false);
  });

  it('positions nothing from the spill custom properties', () => {
    // The bloom tracked a glossy object's screen position. An unlit object emits nothing,
    // so a gradient still following it would be decoration with no idea behind it.
    expect(allCss()).not.toMatch(/--spill-[xy]/);
    expect(allCss()).not.toMatch(/light-spill/);
  });

  it('mounts no spill layer', () => {
    expect(read('../index.html')).not.toMatch(/spill-layer/);
  });
});
```

Import `existsSync` from `node:fs`. If that file's other tests read paths via a `path.join` workaround rather than `new URL` (jsdom's URL shim resolves `file:` bases against `http://localhost`), follow whichever convention is already in the file.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/visual-language.test.js`
Expected: FAIL — `spill.js` still exists and the CSS still references `--spill-x`.

- [ ] **Step 3: Remove it**

```bash
git rm src/diabolo/spill.js tests/spill.dom.test.js tests/stage-spill.dom.test.js
```

Then clear every remaining reference:
- `src/main.js` — the `createSpill` import, its construction, and its `stage.addOverlay` call
- `index.html` — the `#spill-layer` div
- `src/styles/stage.css` — the `#spill-layer` and `.light-spill` rules
- `src/styles/base.css`, `src/styles/sections.css` — any `--spill-*` usage
- `tests/main.dom.test.js` — `#spill-layer` in the DOM fixture, and any assertion that the spill overlay was registered
- `tests/visual-language.test.js` — delete the existing `describe('the light spill is wired to the object', …)` block at line 126. It asserts the CSS *does* position the bloom from `--spill-x`/`--spill-y`, which is the exact opposite of what you just added, and it will fail once the properties are gone.

Keep `stage.addOverlay` itself — the CSS3D label layer still uses it.

- [ ] **Step 4: Run the full suite and commit**

Run: `npx vitest run`

```bash
git add -A
git commit -m "refactor: delete the light spill, which an unlit object cannot justify"
```

---
### Task 3: Four rooms

The choreography stops being a page-long scrub and becomes four rooms with edges. The explosion is contained inside one of them rather than smeared across the whole page.

`ACTS` becomes `ROOMS`. The table-driven shape stays — it is what makes the choreography testable without a browser, and this project has shipped three defects that a green suite missed.

**Files:**
- Rewrite: `src/scroll/choreography.js`
- Rewrite: `tests/choreography.test.js`
- Modify: `tests/choreography.dom.test.js`, `src/ui/layout.js`, `src/diabolo/stage.js`

**Interfaces:**
- Produces:
  - `ROOMS: readonly Room[]` where `Room = { id, end, explode, tiltX, x, y, camZ, spin, labels, opacity }`
  - `SHOWCASE_ID = 'showcase'` — the one room the explosion happens in
  - `PART_RANK`, `SPACING`, `FACE_ON_X`, `PROFILE_X`, `SCRUB_DURATION`, `explodedY`, `partYAt`, `LATERAL_OFFSET`, `LATERAL_SETTLE` — carried over unchanged
  - `createChoreography({ parts, tilt, state, camera, scrollTarget }): { timeline, dispose }`
- `state` gains `objectOpacity`, written by anime.js and read by the render loop — the same bridge pattern as `spinRate`.

- [ ] **Step 1: Write the failing test**

Replace `tests/choreography.test.js`'s `ACTS` describe-block with:

```js
describe('ROOMS', () => {
  const byId = () => Object.fromEntries(ROOMS.map((r) => [r.id, r]));

  it('names the four rooms in order', () => {
    expect(ROOMS.map((r) => r.id)).toEqual(['hero', 'panel', 'showcase', 'grid']);
  });

  it('covers the whole scrub without gaps or overlap', () => {
    for (let i = 1; i < ROOMS.length; i++) expect(ROOMS[i].end).toBeGreaterThan(ROOMS[i - 1].end);
    expect(ROOMS.at(-1).end).toBe(1);
  });

  it('matches the spans the spec sets', () => {
    expect(ROOMS.map((r) => r.end)).toEqual([0.12, 0.30, 0.55, 1.00]);
  });

  it('explodes in exactly one room', () => {
    const exploding = ROOMS.filter((r) => r.explode > 0);
    expect(exploding).toHaveLength(1);
    expect(exploding[0].id).toBe(SHOWCASE_ID);
    expect(exploding[0].explode).toBe(1);
  });

  it('keeps the object assembled everywhere else', () => {
    for (const room of ROOMS) {
      if (room.id === SHOWCASE_ID) continue;
      expect(room.explode, `${room.id} is partly exploded`).toBe(0);
    }
  });

  it('shows the part labels only where the object is apart', () => {
    for (const room of ROOMS) {
      expect(room.labels, `${room.id}`).toBe(room.id === SHOWCASE_ID ? 1 : 0);
    }
  });

  it('holds the object still behind the panel, which covers it', () => {
    const r = byId();
    expect(r.panel.x).toBeCloseTo(r.hero.x, 6);
    expect(r.panel.camZ).toBeCloseTo(r.hero.camZ, 6);
    expect(r.panel.explode).toBe(r.hero.explode);
  });

  it('fades the object out by the grid room, where content takes over', () => {
    const r = byId();
    expect(r.hero.opacity).toBe(1);
    expect(r.showcase.opacity).toBe(1);
    expect(r.grid.opacity).toBeLessThan(0.2);
  });

  it('varies the spin between rooms, so scroll visibly drives it', () => {
    const rates = ROOMS.map((r) => r.spin);
    expect(new Set(rates).size).toBeGreaterThan(2);
    expect(Math.max(...rates)).toBeGreaterThan(2 * Math.min(...rates));
  });

  it('pulls the camera back for the explosion and nowhere else', () => {
    const r = byId();
    expect(r.showcase.camZ).toBeGreaterThan(r.hero.camZ);
    expect(r.showcase.camZ).toBeGreaterThan(r.grid.camZ);
  });

  it('keeps every room inside the camera frustum', () => {
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const assembledHalf = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    const explodedHalf = 3 * SPACING + DIMS.cupHeight;
    for (const room of ROOMS) {
      const reach = Math.abs(room.y) + (room.explode === 1 ? explodedHalf : assembledHalf);
      expect(visibleHalfHeight(room.camZ), `${room.id} clips`).toBeGreaterThan(reach * 1.1);
    }
  });

  it('pins every room state, so no field can drift unnoticed', () => {
    expect(ROOMS.map((r) => [r.id, r.end, r.explode, r.spin, r.labels, r.opacity])).toEqual([
      ['hero',     0.12, 0, 1.0, 0, 1],
      ['panel',    0.30, 0, 1.0, 0, 1],
      ['showcase', 0.55, 1, 0.5, 1, 1],
      ['grid',     1.00, 0, 1.6, 0, 0],
    ]);
  });
});
```

Import `ROOMS`, `SHOWCASE_ID`, `SPACING` from the module under test, `CAMERA_FOV` from `../src/diabolo/stage.js`, and `DIMS` from `../src/diabolo/profiles.js`.

Then add to `tests/choreography.dom.test.js`, alongside the existing sticky-target guards:

```js
describe('the explosion is contained', () => {
  const setup = () => {
    const target = document.createElement('div');
    target.style.position = 'static';
    document.body.append(target);
    const { tilt, spinner, parts } = buildDiabolo({ materials: stubMaterials });
    const state = { spinRate: 1, labelOpacity: 0, objectOpacity: 1 };
    const camera = { position: { x: 0, y: 0, z: CAMERA_NEAR_Z } };
    const choreo = createChoreography({ parts, tilt, state, camera, scrollTarget: target });
    return { ...choreo, parts, tilt, spinner, state };
  };
  const seekTo = (tl, f) => tl.seek(tl.duration * f);
  const apartness = (parts) => Math.abs(parts.cupTop.position.y - HOME.cupTop.y);

  it('leaves the object assembled before the showcase room', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 0.10);
    expect(apartness(parts)).toBeLessThan(0.02);
  });

  it('pulls it fully apart inside the showcase room', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 0.55);
    expect(parts.cupTop.position.y).toBeCloseTo(explodedY('cupTop'), 3);
  });

  it('puts it back together after the showcase room', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 1.0);
    expect(apartness(parts)).toBeLessThan(0.02);
  });

  it('explodes every part together, not one after another', () => {
    const { timeline, parts } = setup();
    seekTo(timeline, 0.43); // mid-showcase
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

  it('never writes the spinner, which the render loop owns', () => {
    const { timeline, spinner } = setup();
    const before = spinner.rotation.y;
    seekTo(timeline, 0.7);
    expect(spinner.rotation.y).toBe(before);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/choreography.test.js tests/choreography.dom.test.js`
Expected: FAIL — `ROOMS` and `SHOWCASE_ID` are not exported.

- [ ] **Step 3: Rewrite the table and the generator**

In `src/scroll/choreography.js`, keep `PART_RANK`, `SPACING`, `FACE_ON_X`, `PROFILE_X`, `SCRUB_DURATION`, `explodedY`, `partYAt`, `LATERAL_OFFSET` and `LATERAL_SETTLE` exactly as they are — unchanged and already tested. Replace `ACTS` with:

```js
/** The one room the explosion plays in. Everywhere else the object is whole. */
export const SHOWCASE_ID = 'showcase';

/** Lifted off profile so the hero reads as an object rather than a diagram. */
const HERO_TILT = -0.42;

/**
 * Four rooms, as target states reached at the END of each `end` fraction. Rooms have
 * edges: the explosion is contained in one of them rather than smeared across the page,
 * which is the substantive change from the six-act version this replaces.
 */
export const ROOMS = Object.freeze([
  { id: 'hero',     end: 0.12, explode: 0, tiltX: HERO_TILT, x: LATERAL_OFFSET * 0.55, y: 0, camZ: 5.6, spin: 1.0, labels: 0, opacity: 1 },
  { id: 'panel',    end: 0.30, explode: 0, tiltX: HERO_TILT, x: LATERAL_OFFSET * 0.55, y: 0, camZ: 5.6, spin: 1.0, labels: 0, opacity: 1 },
  { id: 'showcase', end: 0.55, explode: 1, tiltX: PROFILE_X, x: LATERAL_OFFSET * 0.50, y: 0, camZ: 10,  spin: 0.5, labels: 1, opacity: 1 },
  { id: 'grid',     end: 1.00, explode: 0, tiltX: PROFILE_X, x: 0,                     y: 0, camZ: 7,   spin: 1.6, labels: 0, opacity: 0 },
]);
```

The panel room repeats the hero's object state deliberately: the panel slides up and covers the object, so moving it there would animate something nobody can see.

Then the generator loop — the same shape as before, over `ROOMS`:

```js
  let previousEnd = 0;
  for (const room of ROOMS) {
    const at = previousEnd * SCRUB_DURATION;
    const duration = (room.end - previousEnd) * SCRUB_DURATION;
    if (duration <= 0) continue;

    for (const partId of Object.keys(PART_RANK)) {
      timeline.add(parts[partId].position, { y: partYAt(partId, room.explode), duration }, at);
    }
    timeline.add(tilt.rotation, { x: room.tiltX, duration }, at);
    timeline.add(tilt.position, { x: room.x, y: room.y, duration: duration * LATERAL_SETTLE }, at);
    timeline.add(camera.position, { z: room.camZ, duration }, at);
    timeline.add(state, {
      spinRate: room.spin, labelOpacity: room.labels, objectOpacity: room.opacity, duration,
    }, at);

    previousEnd = room.end;
  }
```

`camera.position.x` is no longer animated — there is no orbit room. Leave it at 0.

- [ ] **Step 4: Wire `objectOpacity`**

In `src/diabolo/stage.js`, add `objectOpacity: 1` to the `state` object and apply it in `render`:

```js
    // anime.js owns state.objectOpacity; this only reads it. Materials are shared across
    // parts, so this is one write per material per frame, not one per mesh.
    for (const material of materialList) material.opacity = state.objectOpacity;
```

Build `materialList` once, from the four fills plus the four edge materials. Set `transparent: true` on every material in `createMaterials` so the opacity takes effect — without it the assignment is silently ignored.

Rename `src/ui/layout.js`'s `SECTION_FOR_ACT` to `SECTION_FOR_ROOM`, mapping `hero → hero`, `panel → about`, `showcase → events`, `grid → media`, and update its tests and `main.js` call site.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`

- [ ] **Step 6: Prove the containment test bites**

Temporarily give the `grid` room `explode: 1`, re-run, and confirm "puts it back together after the showcase room" FAILS. Revert and confirm green. Report both runs — containment is the whole point of the room structure, and a test that cannot see a leak is worthless.

- [ ] **Step 7: Commit**

```bash
git add src/scroll/choreography.js src/diabolo/stage.js src/ui/layout.js tests/
git commit -m "feat: four rooms, with the explosion contained in one"
```

---

### Task 4: Navigation and the room patterns

**Files:**
- Create: `src/ui/nav.js`
- Modify: `src/ui/sections.js`, `src/main.js`
- Test: `tests/nav.dom.test.js`

**Interfaces:**
- Consumes: `SITE` from `../content/index.js`
- Produces:
  - `NAV_LINKS: readonly { label: string, target: string }[]`
  - `CTA: { label: 'Join us', target: 'contact' }`
  - `buildNav(): HTMLElement`
- Every section element gains `data-room` naming its pattern — `hero`, `panel`, `showcase` or `grid` — and a real `id` for the nav to jump to.

- [ ] **Step 1: Write the failing test**

```js
// tests/nav.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { NAV_LINKS, CTA, buildNav } from '../src/ui/nav.js';
import { renderSections } from '../src/ui/sections.js';

beforeEach(() => { document.body.innerHTML = '<main id="content"></main>'; });

describe('NAV_LINKS', () => {
  it('jumps to the sections a visitor most wants', () => {
    expect(NAV_LINKS.map((l) => l.target)).toEqual(['about', 'events', 'media', 'board']);
  });

  it('gives every link a label', () => {
    for (const link of NAV_LINKS) expect(link.label.length).toBeGreaterThan(0);
  });

  it('sends the call to action to contact', () => {
    expect(CTA.target).toBe('contact');
    expect(CTA.label).toBe('Join us');
  });
});

describe('buildNav', () => {
  it('renders one link per entry plus the call to action', () => {
    expect(buildNav().querySelectorAll('a')).toHaveLength(NAV_LINKS.length + 2);
  });

  it('marks the call to action so it can be styled apart', () => {
    expect(buildNav().querySelector('[data-cta]')).not.toBeNull();
  });

  it('is a landmark with an accessible name', () => {
    const nav = buildNav();
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  it('points every link at a section that actually exists', () => {
    // A nav that scrolls nowhere is worse than no nav.
    const content = document.getElementById('content');
    renderSections(content);
    document.body.prepend(buildNav());
    for (const a of document.querySelectorAll('nav a')) {
      const id = a.getAttribute('href').slice(1);
      expect(content.querySelector(`#${id}`), `${id} has no section`).not.toBeNull();
    }
  });
});

describe('room patterns', () => {
  it('assigns every section a room pattern', () => {
    const content = document.getElementById('content');
    renderSections(content);
    for (const el of content.querySelectorAll('[data-section]')) {
      if (el.dataset.section === 'footer') continue;
      expect(['hero', 'panel', 'showcase', 'grid'], `${el.dataset.section}`)
        .toContain(el.dataset.room);
    }
  });

  it('uses each of the four patterns at least once', () => {
    const content = document.getElementById('content');
    renderSections(content);
    const used = new Set([...content.querySelectorAll('[data-room]')].map((e) => e.dataset.room));
    expect([...used].sort()).toEqual(['grid', 'hero', 'panel', 'showcase']);
  });
});
```

Note the wordmark is also an `<a>` (to `#hero`), which is why the count is `NAV_LINKS.length + 2`.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/nav.dom.test.js`
Expected: FAIL — cannot resolve `../src/ui/nav.js`.

- [ ] **Step 3: Write the nav**

```js
// src/ui/nav.js
import { SITE } from '../content/index.js';

/** Where the pills go, ordered as the page is. */
export const NAV_LINKS = Object.freeze([
  { label: 'About', target: 'about' },
  { label: 'Events', target: 'events' },
  { label: 'Media', target: 'media' },
  { label: 'Board', target: 'board' },
]);

/** The one filled control. A club page's job is to get people to turn up. */
export const CTA = Object.freeze({ label: 'Join us', target: 'contact' });

export function buildNav() {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Sections');

  const wordmark = document.createElement('a');
  wordmark.className = 'site-nav-mark';
  wordmark.href = '#hero';
  wordmark.textContent = SITE.name;
  nav.append(wordmark);

  const pills = document.createElement('div');
  pills.className = 'site-nav-links';
  for (const link of NAV_LINKS) {
    const a = document.createElement('a');
    a.href = `#${link.target}`;
    a.textContent = link.label;
    pills.append(a);
  }
  nav.append(pills);

  const cta = document.createElement('a');
  cta.className = 'site-nav-cta';
  cta.dataset.cta = 'true';
  cta.href = `#${CTA.target}`;
  cta.textContent = CTA.label;
  nav.append(cta);

  return nav;
}
```

- [ ] **Step 4: Stamp the room patterns**

In `src/ui/sections.js`, the `section()` helper takes a room and sets a real `id` — the nav's anchors need something to jump to:

```js
function section(id, headingText, room, level = 'h2') {
  const el = document.createElement('section');
  el.id = id;
  el.dataset.section = id;
  el.dataset.room = room;
  el.className = `section section-${id}`;
  if (headingText) {
    const heading = document.createElement(level);
    heading.textContent = headingText;
    el.append(heading);
  }
  return el;
}
```

Assign `hero → 'hero'`, `about → 'panel'`, `events → 'showcase'`, and `media`, `board`, `contact` → `'grid'`. The footer keeps its `data-section` but gets no room.

Mount the nav in `src/main.js`, before `renderSections`:

```js
  document.body.prepend(buildNav());
```

- [ ] **Step 5: Run the suite and commit**

Run: `npx vitest run`

```bash
git add src/ui/nav.js src/ui/sections.js src/main.js tests/nav.dom.test.js
git commit -m "feat: pill nav and room patterns on every section"
```

---
### Task 5: The on.energy language

The four room patterns get built, and the page's visual language moves from editorial-with-light to on.energy's dark-with-one-accent.

**One thing that is free and worth knowing before you start:** the panel slide-up needs no JavaScript. `#stage` is `position: sticky` and `#content` scrolls over it, so a section with an opaque background *already* slides up and covers the object exactly as ref 4 shows. Give `[data-room="panel"]` a solid background and the effect exists. Do not reach for a scroll listener.

**Two accents, at two scopes — do not collapse them.** The *object's* accent is red, on the gasket, per ref 1. The *page's* accent is violet, the club's own colour, used for the panel and the nav's call to action. They never touch: the object sits on the dark ground, the violet lives on the page furniture. Collapsing them into one hue loses the red ring that makes the object read as a diabolo.

**Files:**
- Rewrite: `src/styles/base.css`, `src/styles/sections.css`
- Modify: `src/styles/stage.css`, `index.html`
- Modify: `tests/visual-language.test.js`

**Interfaces:**
- Consumes: `data-room` on sections and `.site-nav` markup (both Task 4)
- Produces: no JS API. The contract is what the stylesheets contain and what they no longer do.

- [ ] **Step 1: Write the failing test**

Add to `tests/visual-language.test.js`:

```js
describe('the four room patterns', () => {
  it('styles every room pattern', () => {
    const css = read('../src/styles/sections.css');
    for (const room of ['hero', 'panel', 'showcase', 'grid']) {
      expect(css, `${room} has no styling`).toMatch(new RegExp(`\\[data-room=["']?${room}["']?\\]`));
    }
  });

  it('gives the panel an opaque background, which is what makes it cover the object', () => {
    // The slide-up is free: #stage is sticky and #content scrolls over it. A transparent
    // panel would simply fail to cover anything.
    const css = read('../src/styles/sections.css');
    const panel = css.slice(css.search(/\[data-room=['"]?panel/));
    expect(panel.slice(0, 600)).toMatch(/background/);
  });
});

describe('the nav', () => {
  it('is styled', () => {
    expect(read('../src/styles/base.css') + read('../src/styles/sections.css'))
      .toMatch(/\.site-nav/);
  });

  it('marks the call to action apart from the pills', () => {
    expect(read('../src/styles/base.css') + read('../src/styles/sections.css'))
      .toMatch(/\.site-nav-cta/);
  });
});

describe('accent discipline', () => {
  it('keeps the page accent as a named token', () => {
    // The object's accent is the red gasket, set in materials.js; the page's is violet.
    // They live at different scopes and must not be collapsed into one value.
    expect(read('../src/styles/base.css')).toMatch(/--accent/);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/visual-language.test.js`
Expected: FAIL — no `[data-room=...]` rules and no `.site-nav` styling exist yet.

- [ ] **Step 3: The design pass**

**REQUIRED SUB-SKILL:** invoke the `frontend-design` skill and let it own the visual thesis, type scale, palette and critique. What follows are constraints, not style.

Room patterns, from the references:

- **Hero** (ref 3) — full-bleed, object cropped and large. A very large, *thin*-weight headline at lower-left; a small paragraph beneath it; a teaser card lower-right. Nav pills across the top.
- **Panel** (ref 4) — a solid violet panel carrying near-black text, large. Holds the ABOUT copy and one image. It scrolls up over the hero; the object stays where it is and does not move.
- **Showcase** (ref 5) — headline upper-left, object right, a pill button, body copy lower-left. This is where the explosion plays.
- **Grid** (ref 6) — sticky text column left, cards right. Used for media, board and contact.

Constraints:

- **Dark ground, one page accent (violet), used sparingly.** on.energy's whole discipline is a near-black page where exactly one colour does all the signalling.
- The existing guards still bind: **no grid overlay, no hairline rules, no plates behind text, no stroked text, no `--spill-*`**. Those tests exist and must keep passing.
- **Measure contrast against live canvas pixels**, not against the CSS background — the object moves underneath. A previous pass found a hero tagline sitting at **1.07:1** this way, which eyeballing had not caught.
- Keep `:focus-visible` on every interactive element, the nav included.
- Mobile: the object holds the upper band and text flows beneath it. The previous build left this unimplemented and dimmed the canvas instead — that is text-over-a-dimmed-object, which the client already rejected. Compose it away rather than mitigating it.
- Type: Instrument Serif and Inter are both loaded and working. on.energy's headlines are a *light-weight grotesque*, not a serif. If the design director wants to move the display face to Inter Light for that read, that is their call to make and to justify.

- [ ] **Step 4: Run the suite, build, and commit**

Run: `npx vitest run && npm run build`

```bash
git add src/styles index.html tests/visual-language.test.js
git commit -m "feat: four room patterns in the on.energy language"
```

---

### Task 6: Verification

Report only what you observe. Where the environment cannot produce a condition, say so and label any stand-in synthetic. Every item below is measurable, because this project has shipped three defects that passed a fully green suite: a tautological orbit-radius assertion, a light spill pinned at 50%, and a clearance test that sampled only the six points where clearance held.

- [ ] **Step 1: Build and serve**

```bash
npm run build && npx vite preview --port 4173
```

- [ ] **Step 2: The object is unlit and drawn in lines**

```js
const vd = window.__vd;
const out = { materials: [], edges: {} };
vd.stage.tilt.traverse((o) => {
  if (o.material && !Array.isArray(o.material)) {
    out.materials.push({ type: o.material.type,
      pbr: ['envMap', 'transmission', 'clearcoat', 'roughness', 'metalness']
        .filter((p) => o.material[p] !== undefined) });
  }
  if (o.type === 'LineSegments') {
    out.edges[o.parent?.parent?.name ?? '?'] = o.geometry.attributes.position.count / 2;
  }
});
console.log(JSON.stringify(out, null, 1));
```

Every material must be `MeshBasicMaterial` or `LineBasicMaterial` with an empty `pbr` list. Edge counts must land near the measured 48–204 per part and 780 total. Record the real numbers.

- [ ] **Step 3: The rooms are distinct and the explosion is contained**

```js
const tl = vd.choreography.timeline;
const at = (f) => { tl.seek(tl.duration * f); return {
  cupTop: +vd.stage.parts.cupTop.position.y.toFixed(3),
  tiltX: +vd.stage.tilt.rotation.x.toFixed(2),
  objX: +vd.stage.tilt.position.x.toFixed(2),
  camZ: +vd.stage.camera.position.z.toFixed(2),
  spin: +vd.stage.state.spinRate.toFixed(2),
  opacity: +vd.stage.state.objectOpacity.toFixed(2),
}; };
console.log(JSON.stringify([0.12, 0.30, 0.55, 1.0].map(at), null, 1));
```

`cupTop` must sit at its rest height at 0.12, 0.30 and 1.0, and at its exploded height only at 0.55.

- [ ] **Step 4: The panel actually covers the object**

Scroll into the panel room and confirm the object is not visible through it: sample a pixel where the object would otherwise be and check it matches the panel's background rather than the canvas.

- [ ] **Step 5: The nav works**

Every pill's `href` resolves to an element in the DOM, and clicking one moves the scroll position. Report both.

- [ ] **Step 6: No spill survives**

`document.querySelector('.light-spill')` is null, no stylesheet mentions `--spill-x`, and no module imports `spill.js`.

- [ ] **Step 7: Appearance, contrast, responsiveness, links, size**

Framebuffer readback for the object's dominant colours; contrast measured against live canvas pixels; 375 / 768 / 1440; every outbound link; final bundle size. The bundle should *drop* — `RoomEnvironment` and the PMREM path are gone.

- [ ] **Step 8: Rewrite `docs/VERIFICATION.md`**

Replace it with this run's results. Keep the honest structure: a status per claim, and an explicit outstanding-work list. **Carry forward no number you did not re-measure**, and mark anything checked at a single frozen frame as such — that caveat is exactly what the label-orbit defect hid behind.

```bash
git add docs/VERIFICATION.md
git commit -m "test: record wireframe and four-room verification"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §2 flat unlit material, edge lines | Task 1 |
| §2 low-poly requirement and measured counts | Task 1 |
| §2 flat colour per part, red accent | Task 1 |
| §2 what this deletes (PBR, env map, gradient, tier setting) | Task 1 |
| §2 addendum: how animejs actually does it | no task — recorded in the spec as context |
| §2 the light spill goes | Task 2 |
| §3 four rooms and their spans | Task 3 |
| §3 explosion contained in the Showcase room | Task 3 |
| §3 room patterns in layout | Tasks 4, 5 |
| §4 navigation | Task 4 |
| §5 placeholder imagery | Task 5 — the Panel room uses the existing `PHOTOS` exports |
| §6 ownership | Tasks 1, 3 |
| §7 what carries over | no task — nothing to do, by design |
| §8 verification | Task 6 |

Every spec requirement has a task.

**Placeholder scan:** no TBD, no TODO, no "add appropriate error handling", no "similar to Task N". Every code step carries complete code.

**Type consistency:** `PART_COLORS`, `EDGE_COLORS`, `ACCENT`, `createMaterials`, `disposeMaterials`, `PROFILE_POINTS`, `RADIAL_SEGMENTS`, `EDGE_THRESHOLD`, `buildDiabolo`, `ROOMS`, `SHOWCASE_ID`, `partYAt`, `explodedY`, `LATERAL_OFFSET`, `LATERAL_SETTLE`, `NAV_LINKS`, `CTA`, `buildNav`, `SECTION_FOR_ROOM`, `data-room` and `state.objectOpacity` are spelled identically at every definition and use site. `GRADIENT_STOPS`, `createGradientTexture`, `createEnvironment`, `ACTS`, `SECTION_FOR_ACT` and `createSpill` are deleted and must not survive anywhere.

**Ordering:** Task 3 renames `ACTS` → `ROOMS`, which `src/ui/layout.js` imports, so Task 3 must land before Task 4 touches `sections.js`. Tasks 1 and 2 are independent of each other and of the rest.

**Verified while planning, not assumed:**
- `EdgesGeometry(g, 1)` includes every facet boundary: a 24 × 128 cup yields **5120** lines and reads as solid; 8 × 12 yields **204**.
- Raising the threshold instead is a trap — at 20° a smooth lathe drops to **40** lines and the wireframe disappears.
- `hubConeProfile` is a linear taper whose endpoints are **identical at any subdivision**: 24 points gives 312 lines, 2 points gives 48, same cone.
- Per-part range at the chosen counts is 48–204; total 780.
- `build.js`'s `Math.max(24, …)` floor silently overrides any lower radial request — the segment change is a no-op until that floor is removed.
- animejs.com uses **no line geometry at all**: triangles only, 3,890 of them, with vertex colours; its look comes from a rim/contour shader plus a post-processed outline pass. Recorded in the spec so this plan's approach reads as a deliberate divergence rather than a failed imitation.
