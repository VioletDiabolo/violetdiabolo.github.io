import { prefersReducedMotion } from '../fallback/detect.js';

/**
 * One reveal unit per direct child of a scroll section. Since the four room patterns
 * landed that is exactly one box per section -- `.room`, the wrapper holding the room's
 * head and body (src/ui/sections.js) -- so a room now arrives as one composition rather
 * than cascading in piece by piece. That is deliberate: each room is a single arranged
 * picture, and fading its parts in one after another announced the transition instead of
 * the content. The footer, which has no `.room`, still reveals its one line directly.
 */
const REVEAL_SELECTOR = '[data-section] > *';

/** Added synchronously, before the observer ever fires. */
export const PENDING_CLASS = 'reveal-pending';
/** Added once, the first time an element crosses the threshold; never removed again. */
export const VISIBLE_CLASS = 'reveal-visible';

/**
 * Fades + rises each section's direct children into place, once, via IntersectionObserver.
 * The CSS that actually hides `.reveal-pending` lives entirely inside a
 * `prefers-reduced-motion: no-preference` block (see sections.css), so a browser with no
 * JS at all -- or an observer that never fires -- leaves content fully visible. This
 * function goes one step further and skips the pending class altogether for a
 * reduced-motion visitor, so there is never even a themed no-op class on the element.
 *
 * Mirrors createLifecycle's dependency-injection shape (observerFactory/doc) so it is
 * testable without a real IntersectionObserver.
 */
export function initReveal({
  root = document,
  observerFactory = (cb) => new IntersectionObserver(cb, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }),
  reducedMotion = prefersReducedMotion(),
} = {}) {
  if (reducedMotion) return { dispose() {} };

  const targets = [...root.querySelectorAll(REVEAL_SELECTOR)];
  if (targets.length === 0) return { dispose() {} };

  for (const el of targets) el.classList.add(PENDING_CLASS);

  const observer = observerFactory((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add(VISIBLE_CLASS);
      // One-shot: once revealed, stop paying attention to this element.
      observer.unobserve(entry.target);
    }
  });

  for (const el of targets) observer.observe(el);

  return {
    dispose() {
      observer.disconnect();
    },
  };
}
