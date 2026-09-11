import { createTimeline, onScroll } from 'animejs';
import { HOME } from '../diabolo/build.js';
import { CAMERA_FAR_Z } from '../diabolo/stage.js';

/**
 * Distance from the centre in assembly order. The bearing is the reference part and
 * does not move; everything else travels outward in proportion to its rank, which is
 * what produces the even spacing of a technical exploded view.
 */
export const PART_RANK = Object.freeze({
  axleBearing: 0,
  hubConeTop: 1,
  hubConeBottom: 1,
  gasketTop: 2,
  gasketBottom: 2,
  cupTop: 3,
  cupBottom: 3,
});

/** Scene units between adjacent parts when fully exploded. The one number to retune. */
export const SPACING = 0.55;

/** Looking straight down the axle: the object reads as concentric circles. */
export const FACE_ON_X = -Math.PI / 2;
/** The familiar hourglass silhouette. */
export const PROFILE_X = 0;

/** Arbitrary timeline length; scroll progress maps onto it, so only ratios matter. */
export const SCRUB_DURATION = 1000;

/**
 * Pure: where a part sits when fully exploded. Extracted from the timeline so the
 * spacing arithmetic is testable without a scroll container.
 */
export function explodedY(partId) {
  // A function of rank alone, not of the rest position. Adding SPACING to HOME would
  // inherit the assembly's own uneven gaps (0.045 / 0.120 / 0.070) and the exploded
  // view would not read as a measured diagram. Measured gaps here: exactly 0.550.
  const direction = Math.sign(HOME[partId].y);
  return direction * PART_RANK[partId] * SPACING;
}

export function createChoreography({ parts, tilt, state, camera, scrollTarget }) {
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
    defaults: { ease: 'inOutQuad', duration: SCRUB_DURATION },
    autoplay: onScroll({
      target: scrollTarget,
      sync: 0.2,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  // Every part starts at the same instant. Position 0 for all of them is the whole
  // point: a staggered start reads as a queue, which is what this replaced.
  for (const partId of Object.keys(PART_RANK)) {
    timeline.add(parts[partId].position, { y: explodedY(partId) }, 0);
  }

  // The turn runs across the same span, so the object arrives in profile exactly as
  // the parts finish separating.
  timeline.add(tilt.rotation, { x: PROFILE_X }, 0);

  // The object roughly doubles its extent as it opens, so the camera withdraws to keep
  // it framed. Fixed at CAMERA_NEAR_Z the exploded cups fall outside the frustum.
  timeline.add(camera.position, { z: CAMERA_FAR_Z }, 0);

  // The bearing spins up as the object opens, then settles.
  timeline
    .add(state, { spinRate: 3.5, duration: SCRUB_DURATION * 0.5 }, 0)
    .add(state, { spinRate: 1, duration: SCRUB_DURATION * 0.5 }, SCRUB_DURATION * 0.5);

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
