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

export function createChoreography({ parts, state, stageEl }) {
  const timeline = createTimeline({
    defaults: { ease: 'inOutQuad', duration: BEAT_DURATION },
    autoplay: onScroll({
      target: stageEl,
      sync: 0.15,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  SCROLL_BEATS.forEach((beat, index) => {
    const group = parts[beat.part];
    const target = beatTarget(beat);
    const at = index * BEAT_STAGGER;

    timeline.add(group.position, target.position, at);
    timeline.add(group.rotation, target.rotation, at);

    if (beat.spinRate !== 1) {
      timeline
        .add(state, { spinRate: beat.spinRate }, at)
        .add(state, { spinRate: 1 }, at + BEAT_DURATION);
    }
  });

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
