import { describe, it, expect, vi } from 'vitest';
import { createLifecycle } from '../src/diabolo/lifecycle.js';

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

  it('releases the observer and pending frame on dispose', () => {
    const h = harness();
    h.intersect(true);
    h.lifecycle.dispose();
    expect(h.scheduled.size).toBe(0);
    expect(h.lifecycle.isRunning()).toBe(false);
  });
});
