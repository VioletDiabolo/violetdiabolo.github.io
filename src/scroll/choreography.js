import { createTimeline, onScroll } from 'animejs';
import { HOME } from '../diabolo/build.js';

/**
 * One beat per part, in scroll order. `offset` is added to the part's HOME position;
 * `spinRate` scales the bearing's local spin, which the render loop reads from state.
 * Frozen (array, each beat, each offset) so a later consumer — e.g. a task placing HTML
 * labels — can read this without an in-place mutation silently desyncing the 3D scene.
 */
export const SCROLL_BEATS = Object.freeze([
  Object.freeze({ section: 'about',   part: 'cupTop',        offset: Object.freeze([-1.55,  1.95, 0.15]), spinRate: 1.0 }),
  Object.freeze({ section: 'events',  part: 'gasketTop',     offset: Object.freeze([ 1.70,  1.30, 0.10]), spinRate: 1.0 }),
  Object.freeze({ section: 'events',  part: 'hubConeTop',    offset: Object.freeze([ 1.35,  0.62, 0.30]), spinRate: 1.0 }),
  Object.freeze({ section: 'media',   part: 'axleBearing',   offset: Object.freeze([-1.80,  0.05, 0.55]), spinRate: 4.5 }),
  Object.freeze({ section: 'board',   part: 'hubConeBottom', offset: Object.freeze([ 1.35, -0.62, 0.30]), spinRate: 1.0 }),
  Object.freeze({ section: 'board',   part: 'gasketBottom',  offset: Object.freeze([ 1.70, -1.30, 0.10]), spinRate: 1.0 }),
  Object.freeze({ section: 'contact', part: 'cupBottom',     offset: Object.freeze([-1.55, -1.95, 0.15]), spinRate: 1.0 }),
]);

export const BEAT_DURATION = 100;
// Deliberately shorter than BEAT_DURATION: beats overlap so parts cascade outward
// rather than moving one strictly after another. Raising this to BEAT_DURATION would
// silently kill the cascade.
export const BEAT_STAGGER = 68;
// Nothing moves for this long, so the hero shows an assembled diabolo before anything
// detaches. Without it cupTop's beat starts at 0 and the object is never seen whole.
export const HERO_HOLD = 90;
// The footer's reassembly beat: scheduled one stagger step after the last explode beat
// starts (beats overlap, so by the time the timeline reaches here every part is at least
// well underway). Every part returns to HOME here, so the page resolves fully assembled
// rather than ending in pieces (spec §5, footer: "snaps back together").
export const REASSEMBLE_AT = HERO_HOLD + SCROLL_BEATS.length * BEAT_STAGGER;
// Each part tilts in proportion to how far it travels, so the exploded view reads as a
// technical diagram rather than a rigid grid. Tuned by eye; no physical meaning.
const ROTATION_TILT_Z = 0.35; // from the part's z offset
const ROTATION_TILT_X = 0.18; // from the part's x offset

/**
 * Pure: the absolute target transform for one beat, resolved against its HOME rest
 * position. Extracted from the timeline so the offset arithmetic is testable without a
 * scroll container — an inverted sign here would otherwise be invisible until runtime.
 */
export function beatTarget(beat) {
  const home = HOME[beat.part];
  return {
    position: { x: beat.offset[0], y: home.y + beat.offset[1], z: beat.offset[2] },
    rotation: { x: beat.offset[2] * ROTATION_TILT_Z, z: beat.offset[0] * ROTATION_TILT_X },
  };
}

/**
 * Builds the scroll-driven explode/reassemble timeline for the diabolo parts.
 *
 * `scrollTarget` must be an element that actually travels with the page as the user
 * scrolls — never the sticky `#stage`. anime.js's ScrollObserver derives progress from
 * how far `scrollTarget`'s bounding rect moves through the viewport; a `position: sticky`
 * (or `fixed`) element is pinned at the same viewport coordinates at every scroll offset,
 * so its rect never travels and progress can never advance past 0.
 */
export function createChoreography({ parts, state, scrollTarget }) {
  // A sticky or fixed element's rect never travels, so scroll progress can never
  // advance and the timeline would silently sit at 0. Fail loudly instead.
  if (typeof getComputedStyle === 'function' && scrollTarget) {
    const position = getComputedStyle(scrollTarget).position;
    if (position === 'sticky' || position === 'fixed') {
      throw new Error(
        `createChoreography: scrollTarget has position:${position}, so its rect never ` +
        `travels and scroll progress cannot advance. Pass an element that scrolls with the page.`
      );
    }
  }

  const timeline = createTimeline({
    defaults: { ease: 'inOutQuad', duration: BEAT_DURATION },
    autoplay: onScroll({
      target: scrollTarget,
      sync: 0.15,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  SCROLL_BEATS.forEach((beat, index) => {
    const group = parts[beat.part];
    const target = beatTarget(beat);
    const at = HERO_HOLD + index * BEAT_STAGGER;

    timeline.add(group.position, target.position, at);
    timeline.add(group.rotation, target.rotation, at);

    if (beat.spinRate !== 1) {
      timeline
        .add(state, { spinRate: beat.spinRate }, at)
        .add(state, { spinRate: 1 }, at + BEAT_DURATION);
    }
  });

  // The footer beat: everything snaps back together.
  for (const beat of SCROLL_BEATS) {
    const group = parts[beat.part];
    const home = HOME[beat.part];
    timeline.add(group.position, { x: 0, y: home.y, z: 0 }, REASSEMBLE_AT);
    timeline.add(group.rotation, { x: 0, z: 0 }, REASSEMBLE_AT);
  }

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
