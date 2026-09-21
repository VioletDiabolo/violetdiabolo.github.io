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
    // A silent no-op handler would also pass the "does not throw" check above --
    // pin down that velocity actually still gets reported, as 0, rather than dropped.
    expect(onVelocity).toHaveBeenCalledWith(0);
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
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a').dispatchEvent(event);
    expect(calls.scrollTo).toHaveLength(0);
    // Structurally identical to "leaves external links alone" above -- keep the two
    // consistent rather than letting a native jump go unchecked here.
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ['a cmd/meta click (open in new tab)', { metaKey: true }],
    ['a ctrl click (open in new tab on Windows/Linux)', { ctrlKey: true }],
    ['a shift click (open in new window)', { shiftKey: true }],
    ['an alt click (download, on some platforms)', { altKey: true }],
    ['a non-primary-button click', { button: 1 }],
  ])('leaves %s alone', (_label, init) => {
    // A visitor reaching for cmd/ctrl/shift/alt-click, or any button but the primary
    // one, is opting OUT of an in-page jump -- preventDefault() must not swallow that
    // gesture just because the href happens to resolve to a real target.
    const { calls, Stub } = stubLenis();
    document.body.innerHTML = '<a href="#events">Events</a><section id="events"></section>';
    createSmoothScroll({ reduced: false, LenisCtor: Stub });
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    document.querySelector('a').dispatchEvent(event);
    expect(calls.scrollTo).toHaveLength(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it('tears down what it installed', () => {
    const { calls, Stub } = stubLenis();
    createSmoothScroll({ reduced: false, LenisCtor: Stub }).destroy();
    expect(calls.destroyed).toBe(1);
  });

  it('stops intercepting anchor clicks once destroyed', () => {
    // Nothing previously committed proved destroy() actually detaches the click
    // listener rather than merely calling lenis.destroy(). Dispatch a real click on
    // the same in-page anchor afterward and confirm it falls through untouched.
    //
    // Uses an isolated Document (rather than the shared global `document` every other
    // test in this file dispatches on) so a listener left behind by an earlier,
    // never-destroyed instance elsewhere in this file can't fire on this click and
    // make the assertion below pass or fail for the wrong reason -- confirmed by
    // probing this exact scenario: with several stale listeners left on the shared
    // document, a click here reads `defaultPrevented: true` even though every
    // instance created in *this* test was destroyed, purely because an unrelated
    // earlier test's listener was still attached and caught the bubbling event.
    const { calls, Stub } = stubLenis();
    const isolatedDoc = document.implementation.createHTMLDocument('teardown');
    isolatedDoc.body.innerHTML = '<a href="#events">Events</a><section id="events"></section>';
    const smooth = createSmoothScroll({ reduced: false, LenisCtor: Stub, doc: isolatedDoc });
    smooth.destroy();
    const link = isolatedDoc.querySelector('a');
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(calls.scrollTo).toHaveLength(0);
    expect(event.defaultPrevented).toBe(false);
  });
});
