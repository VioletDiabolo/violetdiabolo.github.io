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
