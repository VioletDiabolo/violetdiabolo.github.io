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
    // A modified click (new tab/window/download) or a non-primary button is the
    // visitor opting out of an in-page jump; preventDefault() below would otherwise
    // swallow that gesture regardless of the modifier. Leave these to the browser.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
