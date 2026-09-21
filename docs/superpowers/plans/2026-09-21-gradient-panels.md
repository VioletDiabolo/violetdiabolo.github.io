# Animated Gradient & Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D diabolo with an animated violet gradient rendered by a fullscreen WebGL fragment shader, turn the sections into self-contained panels that scroll over it with inertia, and remove every sticky element.

**Architecture:** One fullscreen quad, one fragment shader, no 3D library. `createGradient` owns WebGL and nothing else; `createLifecycle` — kept from the deleted 3D system, already generic — drives its frames and stops them when the tab is hidden; Lenis provides inertia and feeds its scroll velocity into a shader uniform. Sections become panels described by two attributes: `data-panel` for layout, `data-surface` for material.

**Tech Stack:** raw WebGL 1 · anime.js 4.5 (retained, for reveals) · Lenis 1.x · Vite 8 · Vitest 5

**Spec:** `docs/superpowers/specs/2026-09-21-gradient-panels-design.md`

**Starting state:** `main` at `0098395`, 280 tests across 19 files passing, `npm run build` clean.

## Global Constraints

Every task's requirements implicitly include this section.

- **One owner per uniform.** `gradient.js` advances `u_time` and nothing else writes it. `u_velocity` has exactly one writer (`main.js`, via `setVelocity`). This is the same invariant the deleted choreography carried, and it is why that system never desynchronised.
- **`gradient.js` knows nothing about scroll or the DOM** beyond its own canvas. It receives velocity; it does not read it.
- **Content is never gated behind the graphics.** Every section renders with no WebGL.
- **Never pause anime.js's global engine.** A test greps all of `src/`.
- **No second animation engine.** WebGL renders the gradient, Lenis drives scroll, anime.js does reveals. Nothing else animates.
- **Module boundaries:** `content/*` no markup, `ui/*` no WebGL, `gradient/*` and `scroll/*` no club copy.
- **Do not edit the copy in `src/content/index.js`.** Verbatim club text with a deliberate curly/ASCII apostrophe mix pinned by tests. New exports are fine.
- **No text is stroked. No grid overlay, no hairline rules, no CSS counters.** Existing guards; keep them passing.
- **`backdrop-filter` is permitted only on `[data-surface='glass']`.** The blanket ban is narrowed in Task 5, not deleted. Widening it further is out of scope.
- **`prefers-reduced-motion` gets no Lenis, no animation, and exactly one rendered frame.**
- **No `position: sticky` anywhere.** This is what removes both the locking headings and the about-section lock; they are the same mechanism.
- `npx vitest run` before every commit.

## File Map

| Path | Change |
|---|---|
| `src/diabolo/` | **deleted** (Task 1) — except `lifecycle.js`, which moves |
| `src/render/lifecycle.js` | **moved** from `src/diabolo/lifecycle.js`, unchanged (Task 1) |
| `src/scroll/choreography.js`, `entrance.js` | **deleted** (Task 1) |
| `src/ui/layout.js` | **deleted** (Task 1) |
| `src/gradient/palette.js` | **new** — violet ramp, exported for the contrast guard (Task 2) |
| `src/gradient/shader.js` | **new** — vertex + fragment GLSL (Task 2) |
| `src/gradient/gradient.js` | **new** — `createGradient` (Task 2) |
| `src/scroll/smooth.js` | **new** — Lenis wrapper (Task 4) |
| `src/main.js` | rewired (Tasks 1, 3, 4) |
| `src/ui/sections.js` | `data-panel` / `data-surface` (Task 5) |
| `index.html` | gradient canvas replaces the stage (Tasks 1, 3) |
| `src/styles/*.css` | sticky removed (Task 5), design pass (Task 7) |
| `package.json` | `three` out, `lenis` in (Tasks 1, 4) |

---

### Task 1: Strip the 3D system

Everything else builds on cleared ground, so this lands first. It is a large deletion and a small rewiring: the page must still render all its content, with a plain dark background where the object was.

**Files:**
- Delete: `src/diabolo/build.js`, `labels.js`, `materials.js`, `profiles.js`, `stage.js`; `src/scroll/choreography.js`, `src/scroll/entrance.js`; `src/ui/layout.js`
- Delete: `tests/build.test.js`, `choreography.test.js`, `choreography.dom.test.js`, `entrance.test.js`, `labels.dom.test.js`, `materials.dom.test.js`, `profiles.test.js`, `stage.test.js`
- Move: `src/diabolo/lifecycle.js` → `src/render/lifecycle.js` (contents unchanged)
- Modify: `src/main.js`, `index.html`, `package.json`, `tests/lifecycle.test.js` (import path only), `tests/main.dom.test.js`, `tests/sections-layout.dom.test.js`, `tests/visual-language.test.js`

**Interfaces:**
- Produces: `createLifecycle` from `src/render/lifecycle.js` — identical signature, `{ element, onFrame, observerFactory?, doc?, raf?, caf? }` returning `{ start, stop, isRunning, frameCount, dispose }`
- Removes: `createStage`, `createLabels`, `createChoreography`, `createEntrance`, `applySectionSides`, `SECTION_FOR_ROOM`, `ROOMS`, `HERO_ID`, `PROFILE_X`

- [ ] **Step 1: Write the failing test**

Add to `tests/visual-language.test.js`:

```js
describe('the 3D system is gone', () => {
  it('ships no three.js dependency', () => {
    const pkg = JSON.parse(read('../package.json'));
    expect(pkg.dependencies.three, 'three is still a dependency').toBeUndefined();
  });

  it('leaves no diabolo module behind', () => {
    expect(existsSync(new URL('../src/diabolo', import.meta.url))).toBe(false);
  });

  it('imports three nowhere in src', () => {
    // A stale import survives deletion of its subject and fails only at build time.
    for (const file of sourceFiles()) {
      expect(read(file), `${file} still imports three`).not.toMatch(/from ['"]three['"]/);
    }
  });

  it('sticks nothing to the viewport', () => {
    // The locking headings and the about-section lock were the same mechanism.
    expect(allCss()).not.toMatch(/position:\s*sticky/);
  });
});
```

`sourceFiles()` may not exist in this file yet. If not, add it — a recursive walk of `src/` returning `.js` paths. `tests/lifecycle.test.js` already walks `src/` for its engine-independence test; follow whatever convention that file uses rather than inventing a second one.

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/visual-language.test.js`
Expected: FAIL — `three` is still a dependency, `src/diabolo` still exists, and `sections.css` still declares `position: sticky`.

- [ ] **Step 3: Delete**

```bash
git rm -r src/diabolo/build.js src/diabolo/labels.js src/diabolo/materials.js \
         src/diabolo/profiles.js src/diabolo/stage.js \
         src/scroll/choreography.js src/scroll/entrance.js src/ui/layout.js
git rm tests/build.test.js tests/choreography.test.js tests/choreography.dom.test.js \
       tests/entrance.test.js tests/labels.dom.test.js tests/materials.dom.test.js \
       tests/profiles.test.js tests/stage.test.js
mkdir -p src/render && git mv src/diabolo/lifecycle.js src/render/lifecycle.js
npm uninstall three
```

`src/diabolo/` should now be empty; remove it if git left it.

- [ ] **Step 4: Rewire `src/main.js`**

Replace its imports and boot body with:

```js
import { buildNav } from './ui/nav.js';
import { renderSections } from './ui/sections.js';
import { initReveal } from './ui/reveal.js';
import { supportsWebGL, prefersReducedMotion } from './fallback/detect.js';

export const APP_NAME = 'violet-diabolo';

function boot() {
  const content = document.getElementById('content');
  renderSections(content);
  document.body.prepend(buildNav());
  // Mounted before any graphics branch: content must never wait on WebGL.
  initReveal();

  if (!supportsWebGL()) {
    document.documentElement.dataset.stage = 'unsupported';
    return;
  }
  // Task 3 mounts the gradient here.
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
```

`prefersReducedMotion` is imported but unused until Task 3. If your linter objects, leave the import out and add it in Task 3 rather than adding a suppression comment.

Keep `window.__vd` if `tests/main.dom.test.js` reads it; check before deleting.

- [ ] **Step 5: Strip `index.html` and the stylesheets**

Remove `#stage`, `#renderer`, `#label-layer` and the fallback SVG's diabolo markup from `index.html` — but **keep** the `[data-stage='unsupported']` hook, which Task 3 reuses. Delete `src/styles/stage.css` and its import. Remove every `position: sticky` rule and the `data-side` rules from `sections.css`.

Do not attempt to make the page look good yet. Task 7 owns that. It only has to render all its content and pass its guards.

- [ ] **Step 6: Split `tests/sections-layout.dom.test.js`**

Delete the tests whose subject is gone: anything asserting `applySectionSides`, `SECTION_FOR_ROOM`, `data-side`, the room/section boundary handover, or the media card hold-back.

**Keep** the `--type-title` specificity guard and the phone-width cascade guard. Both caught real defects, and neither has anything to do with the 3D object. If keeping them requires a fixture change, change the fixture, not the assertion.

Report how many tests you deleted and how many you kept.

- [ ] **Step 7: Run the full suite and commit**

Run: `npx vitest run && npm run build`
Expected: green. The spec predicts about 122 tests surviving; report the real number rather than adjusting anything to reach it.

```bash
git add -A
git commit -m "refactor: remove the 3D diabolo system"
```

- [ ] **Step 8: Report the bundle**

```bash
ls -l dist/assets/*.js
```

Record the size against the 600 KB it was. This number is the headline of the whole change; measure it, do not estimate it.

---

### Task 2: The gradient module

A pure module: it compiles a shader, draws one quad, and exposes three methods. No page integration — Task 3 does that. Keeping them apart means this can be tested without a layout.

**Files:**
- Create: `src/gradient/palette.js`, `src/gradient/shader.js`, `src/gradient/gradient.js`
- Test: `tests/palette.test.js`, `tests/gradient.dom.test.js`

**Interfaces:**
- Produces:
  - `PALETTE: { deep: [r,g,b], mid: [r,g,b], bright: [r,g,b] }` — components in 0–1, from `palette.js`
  - `VERTEX_SHADER: string`, `FRAGMENT_SHADER: string` from `shader.js`
  - `createGradient({ canvas, palette = PALETTE }): { render(deltaSeconds), setVelocity(v), resize(w, h), dispose() } | null` from `gradient.js`
- `render` advances `u_time` by `delta` and draws one frame. `setVelocity` stores a value the next `render` uses. Neither reads the DOM.

- [ ] **Step 1: Write the failing tests**

```js
// tests/palette.test.js
import { describe, it, expect } from 'vitest';
import { PALETTE } from '../src/gradient/palette.js';

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('PALETTE', () => {
  it('names three stops', () => {
    expect(Object.keys(PALETTE).sort()).toEqual(['bright', 'deep', 'mid']);
  });

  it('gives every stop three components in 0-1', () => {
    for (const [name, rgb] of Object.entries(PALETTE)) {
      expect(rgb, name).toHaveLength(3);
      for (const c of rgb) {
        expect(c, name).toBeGreaterThanOrEqual(0);
        expect(c, name).toBeLessThanOrEqual(1);
      }
    }
  });

  it('runs dark to light', () => {
    // The shader maps noise through these in order; out of order, the ribbons invert.
    expect(lum(PALETTE.deep)).toBeLessThan(lum(PALETTE.mid));
    expect(lum(PALETTE.mid)).toBeLessThan(lum(PALETTE.bright));
  });

  it('starts near black, so text has a ground to sit on', () => {
    expect(lum(PALETTE.deep)).toBeLessThan(0.05);
  });

  it('is violet, not blue', () => {
    // Red well above zero against a dominant blue is what separates violet from the
    // reference's blue, which has almost no red at all.
    const [r, g, b] = PALETTE.mid;
    expect(r).toBeGreaterThan(0.3);
    expect(b).toBeGreaterThan(r);
    expect(g).toBeLessThan(r);
  });
});
```

```js
// tests/gradient.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createGradient } from '../src/gradient/gradient.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../src/gradient/shader.js';

/** A WebGL context recording enough to assert plumbing without a GPU. */
function stubGL() {
  const calls = { uniforms: {}, draws: 0, shaders: [], deleted: [] };
  return {
    calls,
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
    createShader: () => ({}), shaderSource: (s, src) => calls.shaders.push(src),
    compileShader: () => {}, getShaderParameter: () => true, getShaderInfoLog: () => '',
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => true, getProgramInfoLog: () => '', useProgram: () => {},
    createBuffer: () => ({}), bindBuffer: () => {}, bufferData: () => {},
    getAttribLocation: () => 0, enableVertexAttribArray: () => {}, vertexAttribPointer: () => {},
    getUniformLocation: (p, name) => ({ name }),
    uniform1f: (l, v) => { calls.uniforms[l.name] = v; },
    uniform2f: (l, a, b) => { calls.uniforms[l.name] = [a, b]; },
    uniform3f: (l, a, b, c) => { calls.uniforms[l.name] = [a, b, c]; },
    viewport: () => {},
    drawArrays: () => { calls.draws += 1; },
    deleteShader: () => calls.deleted.push('shader'),
    deleteProgram: () => calls.deleted.push('program'),
    deleteBuffer: () => calls.deleted.push('buffer'),
  };
}

const withCanvas = () => {
  const gl = stubGL();
  const canvas = document.createElement('canvas');
  canvas.getContext = () => gl;
  return { gl, canvas };
};

describe('createGradient', () => {
  it('compiles both shaders', () => {
    const { gl, canvas } = withCanvas();
    createGradient({ canvas });
    expect(gl.calls.shaders).toContain(VERTEX_SHADER);
    expect(gl.calls.shaders).toContain(FRAGMENT_SHADER);
  });

  it('draws one quad per render, not one per anything else', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.render(0.016);
    g.render(0.016);
    expect(gl.calls.draws).toBe(2);
  });

  it('advances u_time by the delta it is given', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.render(0.5);
    expect(gl.calls.uniforms.u_time).toBeCloseTo(0.5, 6);
    g.render(0.25);
    expect(gl.calls.uniforms.u_time).toBeCloseTo(0.75, 6);
  });

  it('owns u_time alone — nothing else can set it', () => {
    // The deleted choreography's most valuable invariant, carried forward: one owner
    // per animated value. A second writer is how such a system desynchronises.
    const g = createGradient({ canvas: withCanvas().canvas });
    expect(g.setTime).toBeUndefined();
  });

  it('passes the velocity it was given to the shader', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(2.5);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeCloseTo(2.5, 6);
  });

  it('clamps velocity, so a flung scroll cannot strobe the gradient', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(9999);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeLessThanOrEqual(4);
  });

  it('clamps a negative fling too', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(-9999);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeGreaterThanOrEqual(-4);
  });

  it('reports the resolution it was resized to', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.resize(800, 600);
    g.render(0.016);
    expect(gl.calls.uniforms.u_resolution).toEqual([800, 600]);
  });

  it('releases every GPU object it created', () => {
    const { gl, canvas } = withCanvas();
    createGradient({ canvas }).dispose();
    expect(gl.calls.deleted).toEqual(expect.arrayContaining(['program', 'buffer']));
  });

  it('returns null rather than throwing when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = () => null;
    expect(createGradient({ canvas })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/palette.test.js tests/gradient.dom.test.js`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write `src/gradient/palette.js`**

```js
/**
 * The gradient's three stops, dark to light. The shader maps its noise through these
 * in order, so the ordering is load-bearing rather than decorative — a test pins it.
 *
 * Violet rather than the reference's blue: the club is Violet Diabolo, and a blue
 * backdrop would make the page's own accent a foreign colour on its own site.
 *
 * Components are 0-1 because that is what `gl.uniform3f` wants; the contrast guard
 * converts to 0-255 itself.
 */
export const PALETTE = Object.freeze({
  deep: Object.freeze([0.031, 0.024, 0.047]),
  mid: Object.freeze([0.478, 0.271, 0.800]),
  bright: Object.freeze([0.839, 0.706, 1.0]),
});
```

- [ ] **Step 4: Write `src/gradient/shader.js`**

```js
export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * Ashima's 2D simplex noise, then domain warping, then a few soft bands.
 *
 * The ribbons come from warping: a low-frequency noise displaces the coordinate the
 * banding function reads, which turns straight bands into swirls. Raising the warp
 * amplitudes makes it more turbulent; adding bands makes it busier.
 *
 * `u_velocity` is added to the time term rather than multiplied into it, so a fast
 * scroll pushes the animation forward instead of changing its speed permanently.
 */
export const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_velocity;
uniform vec3 u_deep;
uniform vec3 u_mid;
uniform vec3 u_bright;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time + u_velocity;

  // Rotate so the ribbons run diagonally, as the reference does.
  float a = -0.9;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 q = rot * p;

  float w1 = snoise(q * 0.9 + vec2(0.0, t * 0.05));
  float w2 = snoise(q * 1.7 - vec2(t * 0.03, 0.0));
  float warped = q.x + w1 * 0.45 + w2 * 0.22;

  float band = 0.0;
  band += smoothstep(0.35, 0.02, abs(warped - 0.15));
  band += smoothstep(0.55, 0.05, abs(warped + 0.55)) * 0.7;
  band += smoothstep(0.25, 0.01, abs(warped - 0.95)) * 0.5;

  float lum = clamp(band, 0.0, 1.0);

  vec3 col = mix(u_deep, u_mid, smoothstep(0.0, 0.7, lum));
  col = mix(col, u_bright, smoothstep(0.75, 1.0, lum));

  gl_FragColor = vec4(col, 1.0);
}
`;
```

**This shader compiles and produces diagonal violet ribbons, but its look has not been judged against the reference — nobody can tell how a shader reads without seeing it.** Task 7 tunes the constants (rotation angle, warp amplitudes, band offsets and widths) in the browser. Treat them as a starting point, not as values to preserve.

- [ ] **Step 5: Write `src/gradient/gradient.js`**

```js
import { PALETTE } from './palette.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shader.js';

/** Above this the ribbons move fast enough to read as flicker rather than motion. */
const MAX_VELOCITY = 4;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader failed to compile: ${log}`);
  }
  return shader;
}

/**
 * Owns the WebGL state for one fullscreen gradient and nothing else — no scroll
 * knowledge, no DOM beyond the canvas it was handed.
 *
 * Returns null rather than throwing when WebGL is unavailable, so the caller can fall
 * back without a try/catch: content is never gated behind the graphics.
 */
export function createGradient({ canvas, palette = PALETTE }) {
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program failed to link: ${gl.getProgramInfoLog(program)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);

  // Two triangles covering clip space. This is the whole geometry.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uTime = u('u_time');
  const uResolution = u('u_resolution');
  const uVelocity = u('u_velocity');

  gl.uniform3f(u('u_deep'), ...palette.deep);
  gl.uniform3f(u('u_mid'), ...palette.mid);
  gl.uniform3f(u('u_bright'), ...palette.bright);

  // This module owns time. Nothing else writes it, and no setter is exposed.
  let time = 0;
  let velocity = 0;
  let width = canvas.width;
  let height = canvas.height;

  return {
    render(delta = 0) {
      time += delta;
      gl.uniform1f(uTime, time);
      gl.uniform1f(uVelocity, velocity);
      gl.uniform2f(uResolution, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    setVelocity(v) {
      velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v || 0));
    },
    resize(w, h) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    },
    dispose() {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    },
  };
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/palette.test.js tests/gradient.dom.test.js`
Expected: PASS.

- [ ] **Step 7: Prove the one-owner guard bites**

Temporarily add a `setTime(t) { time = t; }` method to the returned object, re-run, and confirm `owns u_time alone` FAILS. Revert and confirm green. Report both runs. The deleted 3D system's single most valuable invariant was one owner per animated value; a test that cannot see a second owner appear is not carrying it forward.

- [ ] **Step 8: Commit**

```bash
git add src/gradient tests/palette.test.js tests/gradient.dom.test.js
git commit -m "feat: the gradient module, one quad and one shader"
```

---
### Task 3: Mount the gradient, within budget

The gradient goes behind the page and starts rendering. The four performance measures land with it, because a gradient that lags is the specific thing the client asked to avoid — retrofitting them later means measuring the wrong thing first.

**Files:**
- Create: `src/render/budget.js`
- Modify: `src/main.js`, `index.html`, `src/styles/base.css`
- Test: `tests/budget.test.js`, `tests/main.dom.test.js`

**Interfaces:**
- Consumes: `createGradient` (Task 2), `createLifecycle` from `src/render/lifecycle.js` (Task 1)
- Produces:
  - `TARGET_FPS = 30`, `RENDER_SCALE = 0.5` from `budget.js`
  - `createFrameCap(fps = TARGET_FPS): (delta: number) => number` — returns 0 to skip this frame, or the accumulated delta to render with
  - `renderSize(cssWidth, cssHeight, dpr): { width, height }`

- [ ] **Step 1: Write the failing tests**

```js
// tests/budget.test.js
import { describe, it, expect } from 'vitest';
import { createFrameCap, renderSize, TARGET_FPS, RENDER_SCALE } from '../src/render/budget.js';

describe('createFrameCap', () => {
  it('skips frames that arrive faster than the target', () => {
    const tick = createFrameCap(30);
    expect(tick(1 / 60)).toBe(0);
  });

  it('renders once the interval has accumulated, and hands over the whole elapsed time', () => {
    // Handing over the accumulated delta rather than the last one is what keeps the
    // animation running at real-time speed instead of at half speed.
    const tick = createFrameCap(30);
    tick(1 / 60);
    expect(tick(1 / 60)).toBeCloseTo(1 / 30, 6);
  });

  it('does not bank time across a render', () => {
    const tick = createFrameCap(30);
    tick(1 / 60);
    tick(1 / 60);
    expect(tick(1 / 60)).toBe(0);
  });

  it('renders immediately on a long frame rather than swallowing it', () => {
    const tick = createFrameCap(30);
    expect(tick(0.5)).toBeCloseTo(0.5, 6);
  });

  it('caps below 60, or it is not a cap', () => {
    expect(TARGET_FPS).toBeLessThan(60);
  });
});

describe('renderSize', () => {
  it('halves the work on a retina screen', () => {
    // dpr 2 x 0.5 = 1, so the framebuffer is one pixel per CSS pixel rather than four.
    expect(renderSize(800, 600, 2)).toEqual({ width: 800, height: 600 });
  });

  it('never renders below one pixel per CSS pixel', () => {
    // 1 x 0.5 would be 0.5, which would look soft on a non-retina screen for no gain.
    expect(renderSize(800, 600, 1)).toEqual({ width: 800, height: 600 });
  });

  it('still scales down on a dpr-3 screen', () => {
    expect(renderSize(800, 600, 3)).toEqual({ width: 1200, height: 900 });
  });

  it('scales by less than the device pixel ratio', () => {
    expect(RENDER_SCALE).toBeLessThan(1);
  });
});
```

Add to `tests/main.dom.test.js`:

```js
describe('the gradient mount', () => {
  it('gives the gradient a canvas behind the content', () => {
    const canvas = document.getElementById('gradient');
    expect(canvas, 'no gradient canvas').not.toBeNull();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('renders every section even with no WebGL', () => {
    // Content is never gated behind the graphics.
    expect(document.querySelectorAll('[data-section]').length).toBeGreaterThan(4);
  });
});
```

The existing file boots the app in a fixture; follow whatever setup it already uses rather than adding a second one, and use its existing WebGL-patching helper if it has one.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/budget.test.js tests/main.dom.test.js`
Expected: FAIL — `src/render/budget.js` does not resolve, and there is no `#gradient` canvas.

- [ ] **Step 3: Write `src/render/budget.js`**

```js
/**
 * How much the gradient is allowed to cost.
 *
 * Both numbers exist because the client's stated requirement was that the background
 * must not lag. The gradient's motion is slow, so neither is visible as a compromise.
 */

/** The gradient drifts; 30 reads identically to 60 and halves the frames drawn. */
export const TARGET_FPS = 30;

/** Fragment work scales with pixel count, so half the linear resolution is a quarter the work. */
export const RENDER_SCALE = 0.5;

/**
 * Returns a function that accumulates elapsed time and reports how much to render
 * with — 0 meaning "skip this frame".
 *
 * It hands back the ACCUMULATED delta rather than the last one, so the animation
 * advances at real time rather than at the fraction of it that survived the cap.
 */
export function createFrameCap(fps = TARGET_FPS) {
  const interval = 1 / fps;
  let accumulated = 0;
  return function tick(delta) {
    accumulated += delta;
    if (accumulated < interval) return 0;
    const elapsed = accumulated;
    accumulated = 0;
    return elapsed;
  };
}

/**
 * Framebuffer size for a canvas of the given CSS size.
 *
 * Clamped at 1 so a non-retina screen renders one framebuffer pixel per CSS pixel:
 * going below that would look soft and save nothing worth having.
 */
export function renderSize(cssWidth, cssHeight, dpr = 1) {
  const scale = Math.max(1, dpr * RENDER_SCALE);
  return { width: Math.round(cssWidth * scale), height: Math.round(cssHeight * scale) };
}
```

- [ ] **Step 4: Add the canvas**

In `index.html`, before `#content`:

```html
<canvas id="gradient" aria-hidden="true"></canvas>
```

`aria-hidden` because it carries no information — a screen reader announcing a decorative canvas is noise.

In `src/styles/base.css`:

```css
#gradient {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
  /* The canvas framebuffer is smaller than its CSS box (see render/budget.js);
     the browser scales it up, which is invisible on a gradient this smooth. */
}

/* No WebGL: a static approximation of the shader's resting state. Content is never
   gated behind the graphics, so this only has to stop the page being flat black. */
:root[data-stage='unsupported'] #gradient {
  background: linear-gradient(115deg, #08060c 0%, #2c1a4d 45%, #7a45cc 70%, #08060c 100%);
}
```

`#content` needs `position: relative; z-index: 1` so panels sit above the canvas.

- [ ] **Step 5: Mount it in `src/main.js`**

Replace the `// Task 3 mounts the gradient here.` comment with:

```js
  const canvas = document.getElementById('gradient');
  const gradient = createGradient({ canvas });
  if (!gradient) {
    document.documentElement.dataset.stage = 'unsupported';
    return;
  }

  const fit = () => {
    const { width, height } = renderSize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    gradient.resize(width, height);
  };
  fit();
  window.addEventListener('resize', fit);

  if (prefersReducedMotion()) {
    // Exactly one frame. No lifecycle, so nothing is ever scheduled again.
    gradient.render(0);
    return;
  }

  const cap = createFrameCap();
  const lifecycle = createLifecycle({
    element: canvas,
    onFrame: (delta) => {
      const elapsed = cap(delta);
      if (elapsed > 0) gradient.render(elapsed);
    },
  });
  lifecycle.start();

  window.__vd = { ...(window.__vd ?? {}), gradient, lifecycle };
```

Import `createGradient`, `createLifecycle`, `createFrameCap` and `renderSize` at the top, and `prefersReducedMotion` if Task 1 left it out.

- [ ] **Step 6: Run the suite and commit**

Run: `npx vitest run && npm run build`

```bash
git add src/render/budget.js src/main.js index.html src/styles/base.css tests/budget.test.js tests/main.dom.test.js
git commit -m "feat: mount the gradient behind the page, inside a frame budget"
```

- [ ] **Step 7: Measure the frame cost**

Build, serve with `preview_start` (name `violet-diabolo`, port 4173), and measure in the browser:

```js
const canvas = document.getElementById('gradient');
const gl = canvas.getContext('webgl');
const g = window.__vd.gradient;
const N = 200;
const t0 = performance.now();
for (let i = 0; i < N; i++) g.render(1 / 30);
gl.finish(); // time the work, not the queue
const ms = (performance.now() - t0) / N;
({ msPerFrame: ms, dpr: devicePixelRatio, size: [innerWidth, innerHeight] });
```

**The budget is under 4 ms at 1440×900. Report the number and name the GPU you measured on** — a frame cost from an unnamed machine is not a measurement. Get the GPU from `gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)`.

If it exceeds the budget, report that rather than adjusting the budget; the shader's constants are Task 7's to tune.

---

### Task 4: Inertia scrolling

Lenis provides the inertia, and its velocity is what feeds the gradient's one remaining uniform. Under reduced motion none of it is installed.

**Files:**
- Create: `src/scroll/smooth.js`
- Modify: `src/main.js`, `package.json`
- Test: `tests/smooth.dom.test.js`

**Interfaces:**
- Consumes: `gradient.setVelocity` (Task 2)
- Produces: `createSmoothScroll({ reduced, onVelocity, LenisCtor?, doc? }): { raf(time), scrollTo(target, options), destroy() } | null` — returns `null` under reduced motion

- [ ] **Step 1: Install Lenis**

```bash
npm install lenis
```

- [ ] **Step 2: Write the failing test**

```js
// tests/smooth.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSmoothScroll } from '../src/scroll/smooth.js';

/** A Lenis stand-in recording what it was constructed with and asked to do. */
function stubLenis() {
  const calls = { constructed: 0, options: null, handlers: {}, scrollTo: [], destroyed: 0, raf: [] };
  class Stub {
    constructor(options) { calls.constructed += 1; calls.options = options; }
    on(event, fn) { calls.handlers[event] = fn; }
    raf(t) { calls.raf.push(t); }
    scrollTo(target, opts) { calls.scrollTo.push([target, opts]); }
    destroy() { calls.destroyed += 1; }
  }
  return { calls, Stub };
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('createSmoothScroll', () => {
  it('installs nothing at all under reduced motion', () => {
    // Not "installs and disables" — a reduced-motion visitor must get native scrolling,
    // with nothing intercepting their wheel events.
    const { calls, Stub } = stubLenis();
    expect(createSmoothScroll({ reduced: true, LenisCtor: Stub })).toBeNull();
    expect(calls.constructed).toBe(0);
  });

  it('constructs Lenis otherwise', () => {
    const { calls, Stub } = stubLenis();
    createSmoothScroll({ reduced: false, LenisCtor: Stub });
    expect(calls.constructed).toBe(1);
  });

  it('reports scroll velocity to its caller', () => {
    const { calls, Stub } = stubLenis();
    const onVelocity = vi.fn();
    createSmoothScroll({ reduced: false, onVelocity, LenisCtor: Stub });
    calls.handlers.scroll({ velocity: 3.25 });
    expect(onVelocity).toHaveBeenCalledWith(3.25);
  });

  it('survives a scroll event that carries no velocity', () => {
    const { calls, Stub } = stubLenis();
    const onVelocity = vi.fn();
    createSmoothScroll({ reduced: false, onVelocity, LenisCtor: Stub });
    expect(() => calls.handlers.scroll({})).not.toThrow();
  });

  it('routes in-page anchors through Lenis rather than letting the browser jump', () => {
    // Lenis owns the scroll position; a native jump would fight it and land wrong.
    const { calls, Stub } = stubLenis();
    document.body.innerHTML = '<a href="#events">Events</a><section id="events"></section>';
    createSmoothScroll({ reduced: false, LenisCtor: Stub });
    const link = document.querySelector('a');
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(calls.scrollTo).toHaveLength(1);
    expect(event.defaultPrevented, 'the browser would jump as well').toBe(true);
  });

  it('leaves external links alone', () => {
    const { calls, Stub } = stubLenis();
    document.body.innerHTML = '<a href="https://example.com">Out</a>';
    createSmoothScroll({ reduced: false, LenisCtor: Stub });
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a').dispatchEvent(event);
    expect(calls.scrollTo).toHaveLength(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores an anchor pointing at nothing', () => {
    const { calls, Stub } = stubLenis();
    document.body.innerHTML = '<a href="#nowhere">Nowhere</a>';
    createSmoothScroll({ reduced: false, LenisCtor: Stub });
    document.querySelector('a').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(calls.scrollTo).toHaveLength(0);
  });

  it('tears down what it installed', () => {
    const { calls, Stub } = stubLenis();
    createSmoothScroll({ reduced: false, LenisCtor: Stub }).destroy();
    expect(calls.destroyed).toBe(1);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run tests/smooth.dom.test.js`
Expected: FAIL — `src/scroll/smooth.js` does not resolve.

- [ ] **Step 4: Write `src/scroll/smooth.js`**

```js
import Lenis from 'lenis';

/**
 * Inertia scrolling, and the source of the gradient's velocity uniform.
 *
 * Under reduced motion this installs NOTHING and returns null — not a disabled
 * instance. A visitor who asked for reduced motion should get the browser's own
 * scrolling, with nothing intercepting their wheel.
 *
 * `LenisCtor` and `doc` are injectable so this is testable without a real scroller.
 */
export function createSmoothScroll({
  reduced = false,
  onVelocity = () => {},
  LenisCtor = Lenis,
  doc = document,
} = {}) {
  if (reduced) return null;

  const lenis = new LenisCtor({ duration: 1.1, smoothWheel: true });

  lenis.on('scroll', (e) => onVelocity(e?.velocity ?? 0));

  // Lenis owns the scroll position, so a native anchor jump would fight it and land
  // at the wrong offset. Intercept in-page links and hand them to Lenis instead.
  const onClick = (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = doc.getElementById(id);
    if (!target) return;
    event.preventDefault();
    lenis.scrollTo(target, { offset: 0 });
  };
  doc.addEventListener('click', onClick);

  return {
    raf(time) { lenis.raf(time); },
    scrollTo(target, options) { lenis.scrollTo(target, options); },
    destroy() {
      doc.removeEventListener('click', onClick);
      lenis.destroy();
    },
  };
}
```

- [ ] **Step 5: Wire it in `src/main.js`**

Lenis needs driving every frame. The lifecycle already runs one, so reuse it rather than starting a second:

```js
  const smooth = createSmoothScroll({
    reduced: false, // this branch is already past the reduced-motion return
    onVelocity: (v) => gradient.setVelocity(v),
  });
```

and inside `onFrame`, before the cap:

```js
      if (smooth) smooth.raf(performance.now());
```

Lenis must be stepped on **every** frame, not only on the ones that survive the 30fps cap — capping it would make the inertia stutter. The cap applies to the gradient's draw call alone.

Add `smooth` to `window.__vd`.

- [ ] **Step 6: Run the suite and commit**

Run: `npx vitest run && npm run build`

```bash
git add src/scroll/smooth.js src/main.js package.json package-lock.json tests/smooth.dom.test.js
git commit -m "feat: inertia scrolling, and the velocity it feeds the gradient"
```

- [ ] **Step 7: Prove the reduced-motion path installs nothing**

Temporarily make `createSmoothScroll` construct Lenis before the `reduced` check, re-run, and confirm `installs nothing at all under reduced motion` FAILS. Revert and confirm green. Report both runs. "Installed but disabled" is the plausible-looking mistake here, and the test exists precisely to catch it.

---

### Task 5: Panels

Sections stop being rooms in a scroll choreography and become self-contained panels. Two attributes, one for layout and one for material.

**Files:**
- Modify: `src/ui/sections.js`, `src/styles/sections.css`, `tests/visual-language.test.js`
- Test: `tests/panels.dom.test.js`

**Interfaces:**
- Produces: every non-footer section carries `data-panel` ∈ {`hero`, `story`, `feature`, `grid`} and, except the hero, `data-surface` ∈ {`solid`, `glass`}

- [ ] **Step 1: Write the failing test**

```js
// tests/panels.dom.test.js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderSections } from '../src/ui/sections.js';

const PANELS = ['hero', 'story', 'feature', 'grid'];
const SURFACES = ['solid', 'glass'];

let content;
beforeEach(() => {
  document.body.innerHTML = '<main id="content"></main>';
  content = document.getElementById('content');
  renderSections(content);
});

const sections = () => [...content.querySelectorAll('[data-section]')]
  .filter((el) => el.dataset.section !== 'footer');

describe('panel patterns', () => {
  it('gives every section a layout pattern', () => {
    for (const el of sections()) {
      expect(PANELS, el.dataset.section).toContain(el.dataset.panel);
    }
  });

  it('uses every pattern at least once', () => {
    const used = new Set(sections().map((el) => el.dataset.panel));
    expect([...used].sort()).toEqual([...PANELS].sort());
  });

  it('gives every section but the hero a surface', () => {
    // The hero has no surface because the gradient itself is the hero.
    for (const el of sections()) {
      if (el.dataset.panel === 'hero') {
        expect(el.dataset.surface, 'the hero should not be plated').toBeUndefined();
        continue;
      }
      expect(SURFACES, el.dataset.section).toContain(el.dataset.surface);
    }
  });

  it('uses both surfaces, so the gradient is neither hidden nor unreadable', () => {
    const used = new Set(sections().map((el) => el.dataset.surface).filter(Boolean));
    expect([...used].sort()).toEqual([...SURFACES].sort());
  });

  it('names no rooms — they do not exist any more', () => {
    for (const el of sections()) expect(el.dataset.room).toBeUndefined();
  });
});
```

Add to `tests/visual-language.test.js`:

```js
describe('glass', () => {
  it('blurs only behind glass panels', () => {
    // The blanket ban existed because backdrop-filter was being used to rescue text
    // laid over the 3D object. That object is gone; glass panels are a deliberate
    // surface. The ban is narrowed, not lifted: still nothing blurred behind plain text.
    for (const rule of leafRules(allCss())) {
      if (!/backdrop-filter/.test(rule.body)) continue;
      expect(rule.selector, `${rule.selector} blurs without being glass`)
        .toMatch(/\[data-surface=['"]?glass/);
    }
  });

  it('styles both surfaces', () => {
    const css = read('../src/styles/sections.css');
    for (const surface of ['solid', 'glass']) {
      expect(css).toMatch(new RegExp(`\\[data-surface=["']?${surface}`));
    }
  });
});
```

Delete the existing blanket `applies no backdrop-filter anywhere` test — the rule above replaces it. Do not leave both; a contradicting pair is how a suite starts lying.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/panels.dom.test.js tests/visual-language.test.js`
Expected: FAIL — sections still carry `data-room`, and no `[data-surface]` rules exist.

- [ ] **Step 3: Stamp the attributes**

In `src/ui/sections.js`, change the `section()` helper so it takes a panel and a surface instead of a room:

```js
function section(id, headingText, panel, surface, level = 'h2') {
  const el = document.createElement('section');
  el.id = id;
  el.dataset.section = id;
  el.dataset.panel = panel;
  if (surface) el.dataset.surface = surface;
  el.className = `section section-${id}`;
  if (headingText) {
    const heading = document.createElement(level);
    heading.textContent = headingText;
    el.append(heading);
  }
  return el;
}
```

Assign, per the spec's table:

| Section | panel | surface |
|---|---|---|
| hero | `hero` | — |
| about | `story` | `glass` |
| events | `feature` | `glass` |
| media | `grid` | `solid` |
| board | `grid` | `solid` |
| contact | `grid` | `glass` |

The footer keeps `data-section` and gets neither.

- [ ] **Step 4: Replace the room rules in CSS**

Rename every `[data-room='…']` selector in `sections.css` to its `[data-panel='…']` equivalent — `panel` → `story`, `showcase` → `feature`, `hero` and `grid` unchanged. Add minimal `[data-surface='solid']` and `[data-surface='glass']` rules:

```css
[data-surface='solid'] {
  background: var(--surface);
}

[data-surface='glass'] {
  background: color-mix(in srgb, var(--surface) 55%, transparent);
  backdrop-filter: blur(18px) saturate(1.1);
}
```

Section heights collapse to content: delete the `min-height` block entirely and let each panel size itself, with margin between panels so the gradient shows through the gaps. Task 7 sets the actual spacing; give it something workable, not something final.

- [ ] **Step 5: Run the suite and commit**

Run: `npx vitest run && npm run build`

```bash
git add src/ui/sections.js src/styles/sections.css tests/panels.dom.test.js tests/visual-language.test.js
git commit -m "feat: sections become panels, with a layout and a surface"
```

- [ ] **Step 6: Prove the narrowed glass guard bites**

Temporarily add `backdrop-filter: blur(4px)` to a selector that is not a glass panel — `.teaser` will do — re-run, and confirm `blurs only behind glass panels` FAILS with that selector named. Revert and confirm green. Report both runs. A narrowed guard that no longer catches anything is worse than the blanket ban it replaced.

---
### Task 6: The moving-background contrast guard

The one genuinely new risk. Nearly every defect this project has shipped was text over something that moved, and an animated background makes a single-frame contrast check meaningless: the luminance under any given point changes over time.

The guard splits in two, because only half of it can run without a GPU. **Both halves are required** — the pure half alone proves nothing about the shader, and the GPU half alone has no tested arithmetic under it.

**Files:**
- Create: `src/gradient/contrast.js` (pure math, imported only by tests and the dev-time probe)
- Test: `tests/contrast.test.js`

**Interfaces:**
- Produces:
  - `TIME_STEPS = 12` — samples across one noise cycle
  - `relativeLuminance([r, g, b]): number` — components 0–255
  - `contrastRatio(a, b): number`
  - `worstCase(backgroundSamples, textRgb): { ratio, index }` — the lowest ratio across samples, and which sample produced it

- [ ] **Step 1: Write the failing test**

```js
// tests/contrast.test.js
import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio, worstCase, TIME_STEPS } from '../src/gradient/contrast.js';

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

describe('relativeLuminance', () => {
  it('matches the WCAG reference values', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 6);
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 6);
  });

  it('applies the sRGB transfer curve, not a linear one', () => {
    // Mid-grey is 0.2159, not 0.5. Getting this wrong inflates every dark-background
    // ratio and is the easiest way to ship an unreadable page that tests green.
    expect(relativeLuminance([128, 128, 128])).toBeCloseTo(0.2159, 3);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 2);
  });

  it('is 1:1 for a colour on itself', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 6);
  });

  it('does not care which argument is lighter', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(contrastRatio(BLACK, WHITE), 6);
  });
});

describe('worstCase', () => {
  it('reports the lowest ratio across the samples, not the average', () => {
    // Averaging is the mistake this function exists to prevent: a background that is
    // dark for eleven frames and bright for one still fails the reader on that frame.
    const samples = [BLACK, BLACK, BLACK, [240, 240, 240]];
    const { ratio, index } = worstCase(samples, WHITE);
    expect(index).toBe(3);
    expect(ratio).toBeLessThan(1.3);
  });

  it('names which sample failed, so a failure is actionable', () => {
    expect(worstCase([BLACK, WHITE], WHITE).index).toBe(1);
  });

  it('throws on an empty sample set rather than passing vacuously', () => {
    // A guard that silently succeeds when handed nothing is how this project shipped
    // a test that executed zero assertions.
    expect(() => worstCase([], WHITE)).toThrow();
  });
});

describe('TIME_STEPS', () => {
  it('samples enough of a cycle that a bright moment cannot hide between frames', () => {
    expect(TIME_STEPS).toBeGreaterThanOrEqual(12);
  });
});
```

Add to `tests/visual-language.test.js`:

```js
it('keeps the contrast helper out of the shipped bundle', () => {
  // It is test and probe tooling. If main.js ever imports it, it starts costing
  // every visitor bytes they gain nothing from.
  expect(read('../src/main.js')).not.toMatch(/gradient\/contrast/);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/contrast.test.js`
Expected: FAIL — `src/gradient/contrast.js` does not resolve.

- [ ] **Step 3: Write `src/gradient/contrast.js`**

```js
/**
 * Contrast arithmetic for text over a background that MOVES.
 *
 * Imported only by tests and by the dev-time probe in the verification task, never by
 * `main.js` — so Vite never bundles it and visitors never pay for it. A test asserts that.
 *
 * The moving part is why `worstCase` exists: the gradient's luminance under any given
 * point varies over time, so a single-frame reading says nothing about whether the
 * text was ever readable.
 */

/** Samples across one noise cycle. Twelve is enough that a bright band cannot slip between them. */
export const TIME_STEPS = 12;

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance. Components are 0-255. */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The lowest contrast the text reaches against any sampled frame of the background,
 * and which frame that was.
 *
 * Deliberately not an average: a background that is dark for eleven frames and bright
 * for one still fails the reader on that frame.
 */
export function worstCase(backgroundSamples, textRgb) {
  if (!backgroundSamples?.length) {
    throw new Error('worstCase needs at least one background sample');
  }
  let ratio = Infinity;
  let index = -1;
  backgroundSamples.forEach((sample, i) => {
    const r = contrastRatio(sample, textRgb);
    if (r < ratio) {
      ratio = r;
      index = i;
    }
  });
  return { ratio, index };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/contrast.test.js tests/visual-language.test.js`
Expected: PASS.

- [ ] **Step 5: Prove the sRGB curve is load-bearing**

Temporarily replace `channel` with the linear `(c) => c / 255`, re-run, and confirm `applies the sRGB transfer curve, not a linear one` FAILS. Revert and confirm green. Report both runs. A linear curve inflates every ratio on a dark background, which would make this entire guard report comfortable numbers for unreadable text.

- [ ] **Step 6: Commit**

```bash
git add src/gradient/contrast.js tests/contrast.test.js tests/visual-language.test.js
git commit -m "test: contrast arithmetic for a background that moves"
```

---

### Task 7: The design pass

**REQUIRED SUB-SKILL:** invoke the `frontend-design` skill and let it own the visual thesis, type scale, spacing and critique. What follows are constraints, not style.

This task also tunes the shader, because a shader's look cannot be judged from its source — only from seeing it.

**Files:**
- Modify: `src/gradient/shader.js`, `src/gradient/palette.js`, `src/styles/base.css`, `src/styles/sections.css`
- Test: `tests/visual-language.test.js`

- [ ] **Step 1: Tune the shader against the reference**

The client's reference is Framer's "Animated Gradient" — dark ground, bright diagonal ribbons with soft falloff, mostly black with a few bright bands. The constants in `FRAGMENT_SHADER` are a starting point that **has never been looked at**.

Serve the page and iterate on: the rotation angle `a`, the warp amplitudes (`0.45`, `0.22`), the noise frequencies (`0.9`, `1.7`), the time multipliers (`0.05`, `0.03`), and each band's offset, width and weight. Rewriting the band section outright is fair game if that reads better.

**Two constraints on the tuning:**
- Most of the frame stays near-black. The reference's ribbons read because the ground is dark; filling the screen with violet leaves nowhere for text to sit.
- Re-measure the frame cost after tuning. More noise octaves cost real time — the 4 ms budget from Task 3 still binds.

- [ ] **Step 2: Build the four panel patterns**

- **hero** — the gradient is the hero. A large thin headline and the teaser card over it, no plate.
- **story** — glass, carrying the ABOUT copy and an image.
- **feature** — glass, the events section.
- **grid** — media, board, contact. Solid for the first two, glass for contact.

Gaps between panels where only the gradient shows. Roughly 6–8 screens total.

- [ ] **Step 3: The nav**

Semi-transparent pills, like on.energy's bar, readable over both the gradient and the panels.

**The left-hand pills currently clip** (client screenshot). Find the actual cause — an overflow, a fixed width, a flex item that cannot shrink — and fix it. Verify at 320, 375, 768 and 1440 that the row does not overflow and nothing is cut off. Do not mask it with `overflow: hidden`.

- [ ] **Step 4: Constraints that bind**

- **No `position: sticky`.** Anywhere.
- **`backdrop-filter` only on `[data-surface='glass']`.**
- No grid overlay, no hairline rules, no stroked text, no CSS counters.
- `:focus-visible` on every interactive element, readable on **both** the gradient and a glass panel — a focus ring that vanishes on one of two grounds is the defect this project shipped last round.
- **Do not edit `src/content/index.js`.**
- Mobile: panels stack, nothing overlaps, no horizontal overflow.
- Do not change `TARGET_FPS`, `RENDER_SCALE`, or `MAX_VELOCITY`.

- [ ] **Step 5: Run the suite, build, commit**

Run: `npx vitest run && npm run build`

```bash
git add src/gradient src/styles tests/visual-language.test.js
git commit -m "feat: the gradient's look, and four panel patterns over it"
```

---

### Task 8: Verification

Report only what you observe. Where the environment cannot produce a condition, say so and label any stand-in synthetic.

**The preview pane reports `document.hidden === true`**, which throttles `requestAnimationFrame` — on the previous branch this measured 0 scroll events and 0 rAF callbacks — and **the screenshot pipeline returns stale frames** (a violet panel screenshotted solid black while geometry confirmed it filled the viewport). Prefer `getComputedStyle`, `getBoundingClientRect`, `elementFromPoint` and `gl.readPixels` over screenshots; treat a screenshot contradicting geometry as stale.

- [ ] **Step 1: Bundle and dependencies**

```bash
grep -c three package.json; ls -l dist/assets/*.js
```

Three.js absent from `package.json` and from the built bundle. Report the size against **600 KB**.

- [ ] **Step 2: Nothing sticks**

No `position: sticky` in any stylesheet. Confirm the about section scrolls immediately and no heading pins.

- [ ] **Step 3: Frame cost**

Measure as Task 3 did, after Task 7's tuning. Report ms/frame, the viewport, and **the GPU name** from `WEBGL_debug_renderer_info`. Budget: under 4 ms at 1440×900.

- [ ] **Step 4: The loop actually stops**

```js
const lc = window.__vd.lifecycle;
const before = lc.frameCount();
Object.defineProperty(document, 'hidden', { value: true, configurable: true });
document.dispatchEvent(new Event('visibilitychange'));
await new Promise((r) => setTimeout(r, 300));
({ running: lc.isRunning(), advanced: lc.frameCount() - before });
```

`running` must be false and `advanced` must stop growing. A loop that still schedules a no-op frame is not paused.

- [ ] **Step 5: Reduced motion**

With `prefers-reduced-motion: reduce` emulated: exactly one frame rendered (`frameCount()` is 1, or the lifecycle was never created), `window.__vd.smooth` is null, and no wheel listener intercepts scrolling.

- [ ] **Step 6: No WebGL**

Patch `HTMLCanvasElement.prototype.getContext` to return null, reload, and confirm every section renders, all content is reachable, `[data-stage='unsupported']` is set, and the static fallback gradient is visible.

- [ ] **Step 7: Worst-case contrast over the moving gradient**

The load-bearing check. For each text block, at 375 / 768 / 1440:

```js
// Import the tested helpers rather than reimplementing them inline.
const { worstCase, TIME_STEPS } = await import('/src/gradient/contrast.js');
const canvas = document.getElementById('gradient');
const gl = canvas.getContext('webgl');
const g = window.__vd.gradient;

function sampleUnder(el) {
  const r = el.getBoundingClientRect();
  const x = Math.round(((r.left + r.width / 2) / innerWidth) * canvas.width);
  const y = Math.round((1 - (r.top + r.height / 2) / innerHeight) * canvas.height);
  const px = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return [px[0], px[1], px[2]];
}

const results = [];
for (const el of document.querySelectorAll('h1, h2, p, a')) {
  const samples = [];
  for (let i = 0; i < TIME_STEPS; i++) { g.render(1.0); samples.push(sampleUnder(el)); }
  const ink = getComputedStyle(el).color.match(/\d+/g).slice(0, 3).map(Number);
  results.push({ el: el.tagName, ...worstCase(samples, ink) });
}
results.sort((a, b) => a.ratio - b.ratio).slice(0, 10);
```

Report the ten worst. **Body text needs 4.5:1, large text 3:1, measured at the worst sample — not the average and not the resting frame.**

State honestly what this does and does not establish: it reads the gradient's own pixels, so for text on a **solid** panel the panel's opaque fill is what actually sits behind the text and the gradient reading is irrelevant. For **glass** panels the gradient shows through, so blend the sampled colour with the panel's fill at its measured alpha before comparing. Say which method you used for each block.

- [ ] **Step 8: Navigation, overflow, and the rest**

Every nav anchor resolves and moves the scroll position. The nav pill row does not overflow at 320 / 375 / 768 / 1440 and nothing is cut off. Each of the four `data-panel` values and both `data-surface` values appears at least once. Report the page's total height in screens.

- [ ] **Step 9: Rewrite `docs/VERIFICATION.md`**

Replace it with this run's results. Keep the honest structure: a status per claim and an explicit list of what could not be verified. **Carry forward no number you did not re-measure**, and mark anything observed at a frozen frame as synthetic.

```bash
git add docs/VERIFICATION.md
git commit -m "test: record the gradient and panel verification"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §2 what goes (3D, Three.js, `layout.js`, sticky) | Task 1 |
| §2 `lifecycle.js` moves rather than dies | Task 1 |
| §2 `sections-layout.dom.test.js` split | Task 1 |
| §3 fullscreen quad, shader, module shape | Task 2 |
| §3 uniforms and the one-owner rule | Task 2 |
| §3 performance: half DPR, 30fps, pause, reduced motion | Task 3 |
| §3 frame budget measured with named hardware | Tasks 3, 8 |
| §3 scroll acceleration | Tasks 2, 4 |
| §3 no-WebGL fallback | Tasks 2, 3, 8 |
| §4 Lenis, reduced-motion opt-out, anchors, velocity | Task 4 |
| §5 `data-panel` / `data-surface`, the assignment table | Task 5 |
| §5 glass, and the narrowed `backdrop-filter` guard | Task 5 |
| §5 gaps between panels, 6–8 screens | Tasks 5, 7 |
| §6 nav pills, the clipping fix | Task 7 |
| §7 contrast over a moving background, ≥12 steps | Tasks 6, 8 |
| §8 what survives untouched | no task — nothing to do, by design |
| §9 out of scope | no task — deliberately |
| §10 verification, all ten items | Task 8 |

Every spec requirement has a task.

**Placeholder scan:** no TBD/TODO, no "add appropriate error handling", no "similar to Task N". Every code step carries complete code.

**Type consistency:** `PALETTE`, `VERTEX_SHADER`, `FRAGMENT_SHADER`, `createGradient`, `render`, `setVelocity`, `resize`, `dispose`, `MAX_VELOCITY`, `TARGET_FPS`, `RENDER_SCALE`, `createFrameCap`, `renderSize`, `createSmoothScroll`, `createLifecycle`, `TIME_STEPS`, `relativeLuminance`, `contrastRatio`, `worstCase`, `data-panel` and `data-surface` are spelled identically at every definition and use site. `createStage`, `createLabels`, `createChoreography`, `createEntrance`, `applySectionSides`, `SECTION_FOR_ROOM`, `ROOMS`, `data-room` and `data-side` are deleted and must not survive anywhere.

**Ordering:** Task 1 must land first — every later task builds on the cleared tree, and Task 3 imports `createLifecycle` from the path Task 1 creates. Task 3 needs Task 2's `createGradient`; Task 4 needs Task 2's `setVelocity`; Task 7 needs Tasks 5 and 6. Task 2 is otherwise independent of Task 1, but is sequenced after it so two agents never touch `package.json` at once.

**Known risk, stated rather than hidden:** the shader in Task 2 compiles and is structurally correct, but **nobody has seen it**. Its look is Task 7's to settle, and Task 7 may need to rewrite the band section substantially. That is expected, not a failure — a shader written blind is a starting point. Task 2's tests deliberately assert plumbing (compilation, uniforms, draw calls, clamping) rather than appearance, because appearance is not something a unit test can judge.

**Second known risk:** Task 8 Step 7's probe reads the gradient's pixels, which is the right measurement for glass panels and the wrong one for solid ones. The step says so and requires the method to be stated per block. If a reviewer finds the blending step skipped, the glass-panel numbers are wrong in the optimistic direction.
