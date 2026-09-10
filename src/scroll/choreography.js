import { createTimeline, onScroll } from 'animejs';
import { HOME } from '../diabolo/build.js';

/**
 * One beat per part, in scroll order. `offset` is added to the part's HOME position;
 * `spinRate` scales the bearing's local spin, which the render loop reads from state.
 */
export const SCROLL_BEATS = [
  { section: 'about',   part: 'cupTop',        offset: [-1.55,  1.95, 0.15], spinRate: 1.0 },
  { section: 'events',  part: 'gasketTop',     offset: [ 1.70,  1.30, 0.10], spinRate: 1.0 },
  { section: 'events',  part: 'hubConeTop',    offset: [ 1.35,  0.62, 0.30], spinRate: 1.0 },
  { section: 'media',   part: 'axleBearing',   offset: [-1.80,  0.05, 0.55], spinRate: 4.5 },
  { section: 'board',   part: 'hubConeBottom', offset: [ 1.35, -0.62, 0.30], spinRate: 1.0 },
  { section: 'board',   part: 'gasketBottom',  offset: [ 1.70, -1.30, 0.10], spinRate: 1.0 },
  { section: 'contact', part: 'cupBottom',     offset: [-1.55, -1.95, 0.15], spinRate: 1.0 },
];

const BEAT_DURATION = 100;
const BEAT_STAGGER = 68;

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
    const home = HOME[beat.part];
    const at = index * BEAT_STAGGER;

    timeline.add(group.position, {
      x: beat.offset[0],
      y: home.y + beat.offset[1],
      z: beat.offset[2],
    }, at);

    timeline.add(group.rotation, {
      x: beat.offset[2] * 0.35,
      z: beat.offset[0] * 0.18,
    }, at);

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
