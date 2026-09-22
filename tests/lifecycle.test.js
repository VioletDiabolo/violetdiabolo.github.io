import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLifecycle } from '../src/render/lifecycle.js';

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listJsFiles(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

function harness({ hidden = false } = {}) {
  let ioCallback;
  const scheduled = new Map();
  let nextId = 1;

  const raf = vi.fn((cb) => { const id = nextId++; scheduled.set(id, cb); return id; });
  const caf = vi.fn((id) => { scheduled.delete(id); });

  const listeners = {};
  const doc = {
    hidden,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
  };

  const observerFactory = (cb) => { ioCallback = cb; return { observe: vi.fn(), disconnect: vi.fn() }; };

  const onFrame = vi.fn();
  const lifecycle = createLifecycle({ element: {}, onFrame, observerFactory, doc, raf, caf });

  return {
    lifecycle, raf, caf, onFrame, scheduled,
    intersect: (isIntersecting) => ioCallback([{ isIntersecting }]),
    setHidden: (v) => { doc.hidden = v; listeners.visibilitychange?.(); },
    // Drain exactly one scheduled frame, mimicking the browser.
    tick: (at = performance.now()) => {
      const entry = [...scheduled.entries()][0];
      if (!entry) return false;
      scheduled.delete(entry[0]);
      entry[1](at);
      return true;
    },
  };
}

describe('lifecycle', () => {
  it('schedules no frame before the stage is ever visible', () => {
    const h = harness();
    expect(h.raf.mock.calls.length).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('starts running once the stage intersects', () => {
    const h = harness();
    h.intersect(true);
    expect(h.lifecycle.isRunning()).toBe(true);
    expect(h.raf.mock.calls.length).toBe(1);
  });

  it('keeps scheduling successive frames while visible', () => {
    const h = harness();
    h.intersect(true);
    h.tick(); h.tick(); h.tick();
    expect(h.onFrame.mock.calls.length).toBe(3);
    expect(h.scheduled.size).toBe(1);
  });

  it('cancels the pending frame when the stage leaves the viewport', () => {
    const h = harness();
    h.intersect(true);
    h.intersect(false);
    expect(h.caf.mock.calls.length).toBe(1);
    expect(h.scheduled.size).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('schedules nothing further after leaving, rather than running a no-op frame', () => {
    const h = harness();
    h.intersect(true);
    h.tick();
    h.intersect(false);
    const framesBefore = h.onFrame.mock.calls.length;
    expect(h.tick()).toBe(false);
    expect(h.onFrame.mock.calls.length).toBe(framesBefore);
  });

  it('stops when the document hides even though the stage is still onscreen', () => {
    const h = harness();
    h.intersect(true);
    h.setHidden(true);
    expect(h.lifecycle.isRunning()).toBe(false);
    expect(h.scheduled.size).toBe(0);
  });

  it('resumes when the document is shown again', () => {
    const h = harness();
    h.intersect(true);
    h.setHidden(true);
    h.setHidden(false);
    expect(h.lifecycle.isRunning()).toBe(true);
    expect(h.scheduled.size).toBe(1);
  });

  it('stays stopped if the document returns while the stage is offscreen', () => {
    const h = harness();
    h.intersect(true);
    h.intersect(false);
    h.setHidden(true);
    h.setHidden(false);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('never starts when the document is already hidden at first intersection', () => {
    const h = harness({ hidden: true });
    h.intersect(true);
    expect(h.lifecycle.isRunning()).toBe(false);
  });

  it('is idempotent: repeated intersect events schedule only one frame', () => {
    const h = harness();
    h.intersect(true);
    h.intersect(true);
    h.intersect(true);
    expect(h.scheduled.size).toBe(1);
    expect(h.raf.mock.calls.length).toBe(1);
  });

  it('passes a delta in seconds to onFrame', () => {
    const h = harness();
    h.intersect(true);
    h.tick(1000);
    h.tick(1016);
    const [delta] = h.onFrame.mock.calls[1];
    expect(delta).toBeCloseTo(0.016, 3);
  });

  it('clamps the delta across a long gap so nothing jumps on resume', () => {
    const h = harness();
    h.intersect(true);
    h.tick(1000);
    h.tick(6000);
    const [delta] = h.onFrame.mock.calls.at(-1);
    expect(delta).toBeLessThanOrEqual(0.1);
  });

  it('starts the frame after a resume at delta 0, not a huge jump', () => {
    const h = harness();
    h.intersect(true);
    h.tick(1000);
    h.tick(1016);
    h.setHidden(true);          // stop
    h.setHidden(false);         // resume
    h.tick(9000);               // 8 seconds of wall clock passed while stopped
    const [delta] = h.onFrame.mock.calls.at(-1);
    expect(delta).toBe(0);
  });

  it('releases the observer and pending frame on dispose', () => {
    const h = harness();
    h.intersect(true);
    h.lifecycle.dispose();
    expect(h.scheduled.size).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });
});

/* ---------------------------------------------------------------------------
 * No animation engine, anywhere.
 *
 * WHAT THIS USED TO SAY, AND WHY IT STOPPED BEING TRUE. Until this branch, anime.js was
 * the page's scroll choreographer and this block policed a boundary: exactly two modules
 * (`src/scroll/choreography.js` and `src/scroll/entrance.js`) were allowed to import it,
 * every other file was not, and nobody at all could touch its GLOBAL engine -- pausing
 * that would have frozen every other timeline riding the same ticker.
 *
 * Both owners were deleted at 15901a9 when the 3D object went. The guard was left with an
 * exception set naming two files that no longer exist, so its `continue` was unreachable,
 * the set was an inert constant, and its name and failure messages described a subject
 * that was gone. It passed -- but for a reason unrelated to what it claimed.
 *
 * What is true now is simpler and worth pinning, because it is the shape of the branch:
 * NOTHING imports an animation engine. The gradient is driven by `createLifecycle` above
 * plus `createFrameCap`; the only motion library left in the tree is Lenis, and it owns
 * scroll position, not timelines. So the exception set is gone rather than re-pointed --
 * there is no owner to except.
 *
 * The second test is the same claim one level up, at the manifest. It is what actually
 * keeps `three` out of `node_modules`: animejs declares a `three` adapter as an OPTIONAL
 * PEER and npm installs optional peers by default, so `three@0.186.0` sat in the tree of a
 * branch whose entire point was deleting Three.js, reachable only by
 * `violet-diabolo -> animejs -> three`. Dropping the dependency dropped both. A source
 * grep alone would not have caught that: no file imported animejs either, and the package
 * was still installed.
 * ------------------------------------------------------------------------- */

describe('no animation engine', () => {
  // Built from a plain path, not `new URL(..., import.meta.url)`: some sibling test
  // files run under `@vitest-environment jsdom`, whose global URL shim resolves relative
  // file: URLs against http://localhost:3000 instead of the filesystem. This file does
  // not opt into that environment, but resolving by plain path costs nothing and stays
  // safe regardless.
  const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const SRC = path.join(ROOT, 'src');

  it('imports animejs in no module under src/ -- there is no longer an owner to except', () => {
    const files = listJsFiles(SRC);
    // Non-vacuity: a guard that walks an empty list passes without reading anything.
    expect(files.length, 'listJsFiles found no sources to check').toBeGreaterThan(5);

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file);
      expect(source, `src/${rel} imports animejs; nothing on this branch may`)
        .not.toMatch(/from\s+['"]animejs['"]/);
      expect(source, `src/${rel} requires animejs; nothing on this branch may`)
        .not.toMatch(/require\(\s*['"]animejs['"]\s*\)/);
    }
  });

  it('does not declare animejs as a dependency, which is what keeps three out of node_modules', () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const declared = { ...manifest.dependencies, ...manifest.devDependencies };
    // Non-vacuity: the object really was read and really does hold this project's deps.
    expect(Object.keys(declared), 'package.json declares no dependencies at all')
      .toContain('lenis');

    expect(Object.keys(declared),
      'package.json declares animejs again; it pulls three@0.186.0 back in as an optional peer')
      .not.toContain('animejs');
    expect(Object.keys(declared), 'package.json declares three again').not.toContain('three');
  });
});
