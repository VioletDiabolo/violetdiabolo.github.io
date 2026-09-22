/** Longest delta handed to onFrame, so a resume after a long pause does not jump. */
const MAX_DELTA = 0.1;

/**
 * Owns the gradient render loop's existence.
 *
 * Runs only while the observed element intersects the viewport AND the document is
 * visible. When either fails, the pending frame is CANCELLED and no further frame is
 * scheduled — a no-op frame that still gets scheduled is not a pause.
 *
 * ONE OF THOSE TWO GATES IS INERT IN PRODUCTION, and it is worth knowing which. main.js
 * observes `#gradient`, which is `position: fixed; inset: 0` — it covers the viewport at
 * every scroll position and can never stop intersecting, so the IntersectionObserver
 * reports `isIntersecting: true` at first delivery and never flips. `doc.hidden` is the
 * only gate that fires live. The observer half is defensive depth: it is exercised only
 * through an injected `observerFactory` in tests, and it is kept because `element` is a
 * parameter rather than a hardcoded `#gradient` — a caller observing something that does
 * scroll away gets a real pause out of it. The page this ships on is not that caller.
 *
 * (The 3D object this loop was written for is gone, and so is the animation engine that
 * used to share a ticker with it. There is no global engine left to coordinate with:
 * `tests/lifecycle.test.js` pins that nothing under `src/` imports one.)
 */
export function createLifecycle({
  element,
  onFrame,
  observerFactory = (cb) => new IntersectionObserver(cb, { threshold: 0 }),
  doc = document,
  raf = requestAnimationFrame,
  caf = cancelAnimationFrame,
}) {
  let rafId = null;
  let visible = false;
  let lastTime = null;
  let frames = 0;

  const active = () => visible && !doc.hidden;

  // Invariant: onFrame must not call start/stop/dispose synchronously. Between this
  // function nulling rafId and re-arming at its exit, a reentrant stop() would no-op
  // while the trailing re-arm still fires — leaving an orphaned loop running.
  function frame(now) {
    rafId = null;
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, MAX_DELTA);
    lastTime = now;
    frames += 1;
    onFrame(delta);
    if (active()) rafId = raf(frame);
  }

  function start() {
    if (rafId !== null || !active()) return;
    lastTime = null;
    rafId = raf(frame);
  }

  function stop() {
    if (rafId === null) return;
    caf(rafId);
    rafId = null;
    lastTime = null;
  }

  const sync = () => (active() ? start() : stop());

  const observer = observerFactory((entries) => {
    // Entries arrive in chronological order. Take the newest rather than `some()`, which
    // would latch onto a stale `true` if two entries were ever queued in one callback.
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  });
  observer.observe(element);

  doc.addEventListener('visibilitychange', sync);

  return {
    start,
    stop,
    isRunning: () => rafId !== null,
    frameCount: () => frames,
    dispose() {
      stop();
      observer.disconnect();
      doc.removeEventListener('visibilitychange', sync);
    },
  };
}
