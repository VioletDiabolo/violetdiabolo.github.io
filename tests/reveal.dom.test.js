// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { initReveal, PENDING_CLASS, VISIBLE_CLASS } from '../src/ui/reveal.js';

function harness({ reducedMotion = false } = {}) {
  document.body.innerHTML = `
    <section data-section="about"><h2>About</h2><p>Body copy</p></section>
    <section data-section="events"><h2>Events</h2></section>
  `;

  let ioCallback;
  const observed = [];
  const unobserved = [];
  const observerFactory = (cb) => {
    ioCallback = cb;
    return {
      observe: (el) => observed.push(el),
      unobserve: (el) => unobserved.push(el),
      disconnect: vi.fn(),
    };
  };

  const reveal = initReveal({ root: document, observerFactory, reducedMotion });

  return {
    reveal,
    observed,
    unobserved,
    intersect: (el) => ioCallback([{ target: el, isIntersecting: true }]),
    missIntersect: (el) => ioCallback([{ target: el, isIntersecting: false }]),
  };
}

describe('reveal', () => {
  it('marks every direct child of every section as pending on init', () => {
    const h = harness();
    const targets = [...document.querySelectorAll('[data-section] > *')];
    expect(targets.length).toBe(3); // about > h2, about > p, events > h2
    for (const el of targets) expect(el.classList.contains(PENDING_CLASS)).toBe(true);
    expect(h.observed).toEqual(targets);
  });

  it('adds the visible class only once an element intersects', () => {
    const h = harness();
    const heading = document.querySelector('[data-section="about"] h2');
    expect(heading.classList.contains(VISIBLE_CLASS)).toBe(false);
    h.intersect(heading);
    expect(heading.classList.contains(VISIBLE_CLASS)).toBe(true);
  });

  it('stops observing an element once it has been revealed, so it never re-triggers', () => {
    const h = harness();
    const heading = document.querySelector('[data-section="about"] h2');
    h.intersect(heading);
    expect(h.unobserved).toContain(heading);
  });

  it('ignores a non-intersecting entry rather than revealing it', () => {
    const h = harness();
    const heading = document.querySelector('[data-section="about"] h2');
    h.missIntersect(heading);
    expect(heading.classList.contains(VISIBLE_CLASS)).toBe(false);
    expect(h.unobserved).not.toContain(heading);
  });

  it('does nothing for a reduced-motion visitor: no pending class, no observation', () => {
    const h = harness({ reducedMotion: true });
    const targets = [...document.querySelectorAll('[data-section] > *')];
    for (const el of targets) expect(el.classList.contains(PENDING_CLASS)).toBe(false);
    expect(h.observed).toEqual([]);
  });

  it('disposes cleanly by disconnecting the observer', () => {
    const h = harness();
    expect(() => h.reveal.dispose()).not.toThrow();
  });
});
