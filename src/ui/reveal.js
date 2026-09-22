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
 * The real observer, hoisted to a named constant so `initReveal` can tell "nobody
 * injected a factory" from "somebody did". The guard below must apply only to this one:
 * an injected factory is the caller's own observer and needs no global to exist.
 */
const realObserverFactory = (cb) =>
  new IntersectionObserver(cb, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

/**
 * Fades + rises each section's direct children into place, once, via IntersectionObserver.
 *
 * WHAT HIDES THE CONTENT, AND WHAT IS ON THE HOOK TO SHOW IT AGAIN. `.reveal-pending` is
 * `opacity: 0` -- the rule is in **base.css** (search "Scroll reveal"), inside a
 * `prefers-reduced-motion: no-preference` block. Two consequences, and the second is the
 * reason the guard below exists:
 *
 *   - A browser that never runs this JS at all never gets the class, so it never hides
 *     anything. That path is safe by construction, and always was.
 *   - The class is added SYNCHRONOUSLY, here, and the only thing that ever takes it back
 *     off is an IntersectionObserver callback. So wherever the observer cannot exist,
 *     adding the class hides every room with nothing left that could reveal it. Since the
 *     panel patterns landed that is one `.room` per section at `min-height: 100dvh`: one
 *     missed element is a full viewport of blank page, and a missing constructor is all
 *     six at once. Measured, before this guard: six rooms at `opacity: 0`.
 *
 * So: no `IntersectionObserver`, no pending class. Content stays visible and this reduces
 * to a no-op, which is the right degradation for a decorative fade.
 *
 * This guards the constructor's EXISTENCE, which is NOT the same claim as "an observer
 * that never fires leaves content visible" -- an earlier version of this comment said
 * that, and it was false. An observer that exists but never delivers does leave the page
 * hidden. In a real browser a visitor cannot reach that: IntersectionObserver delivery is
 * a step of "update the rendering", so a browser that never delivers an entry is one that
 * never painted the frame the content would have appeared in. It IS reachable in
 * automation -- this branch's own verification host throttles both to zero until a paint
 * is forced -- which is why the distinction is written down rather than assumed.
 *
 * Mirrors createLifecycle's dependency-injection shape (observerFactory/doc) so it is
 * testable without a real IntersectionObserver.
 */
export function initReveal({
  root = document,
  observerFactory = realObserverFactory,
  reducedMotion = prefersReducedMotion(),
} = {}) {
  if (reducedMotion) return { dispose() {} };
  // Before the pending class, never after: the class is the hiding, so a bail-out that
  // ran later would already have blanked the page.
  if (observerFactory === realObserverFactory && typeof IntersectionObserver === 'undefined') {
    return { dispose() {} };
  }

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
