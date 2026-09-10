/** Longest delta handed to onFrame, so a resume after a long pause does not jump. */
const MAX_DELTA = 0.1;

/**
 * Owns the 3D render loop's existence.
 *
 * Runs only while the stage intersects the viewport AND the document is visible.
 * When either fails, the pending frame is CANCELLED and no further frame is
 * scheduled — a no-op frame that still gets scheduled is not a pause.
 *
 * Deliberately does not touch anime.js's global engine: `engine.pauseOnDocumentHidden`
 * already defaults to true, the engine self-idles with no active children, and other
 * visible content timelines share it.
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
    visible = entries.some((e) => e.isIntersecting);
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
