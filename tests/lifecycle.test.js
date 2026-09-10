import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLifecycle } from '../src/diabolo/lifecycle.js';

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

describe('engine independence', () => {
  // Built from a plain path, not `new URL(..., import.meta.url)`: some sibling test
  // files run under `@vitest-environment jsdom`, whose global URL shim resolves relative
  // file: URLs against http://localhost:3000 instead of the filesystem. This file does
  // not opt into that environment, but resolving by plain path costs nothing and stays
  // safe regardless.
  const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
  // The only module the spec's own boundary table (§10) lists as depending on anime.js.
  const ANIME_OWNER = path.join(SRC, 'scroll', 'choreography.js');

  it('keeps anime.js confined to the one module that owns the scrubbed timeline', () => {
    for (const file of listJsFiles(SRC)) {
      if (file === ANIME_OWNER) continue;
      const source = readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file);
      expect(source, `src/${rel} imports animejs; only scroll/choreography.js should`).not.toMatch(/from\s+['"]animejs['"]/);
      expect(source, `src/${rel} requires animejs; only scroll/choreography.js should`).not.toMatch(/require\(\s*['"]animejs['"]\s*\)/);
    }
  });

  it("never imports or calls animejs's global engine anywhere, not even in choreography.js", () => {
    // Pausing/resuming the shared engine would freeze every other visible anime.js
    // animation riding the same ticker (spec §6.2). createTimeline/onScroll are the
    // legitimate import; reaching for `engine` itself is not, in any file, including the
    // one file allowed to import animejs at all.
    for (const file of listJsFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      const rel = path.relative(SRC, file);
      expect(source, `src/${rel} imports animejs's global engine`).not.toMatch(/\{[^}]*\bengine\b[^}]*\}\s*from\s*['"]animejs['"]/);
      expect(source, `src/${rel} calls engine.pause()`).not.toMatch(/\bengine\.pause\(/);
      expect(source, `src/${rel} calls engine.resume()`).not.toMatch(/\bengine\.resume\(/);
    }
  });
});
