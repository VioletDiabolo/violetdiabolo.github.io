import { createTimeline, onScroll } from 'animejs';
import { HOME } from '../diabolo/build.js';

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

/** How far the object slides off centre so the reading column has clear space. */
export const LATERAL_OFFSET = 1.6;

/** The orbit swings the camera around the object at a constant radius; it does not dolly. */
const ORBIT_RADIUS = 7;
const ORBIT_ANGLE = 40 * (Math.PI / 180);

/**
 * The six acts, as target states reached at the END of each `end` fraction. The timeline
 * tweens from one act's state to the next, so this table is the whole choreography — data
 * rather than timeline calls, so it can be tuned and tested without a browser.
 *
 * `explode` 0 = assembled, 1 = fully apart. `textSide` records where the reading column
 * sits, so a test can assert the object is always on the other side of it.
 */
export const ACTS = Object.freeze([
  { id: 'arrival',   end: 0.10, explode: 0, tiltX: FACE_ON_X,        tiltZ: 0,    x: 0,               camX: 0, camZ: 5.4, spin: 1.0, labels: 0, textSide: 'center' },
  { id: 'apart',     end: 0.32, explode: 1, tiltX: FACE_ON_X * 0.45, tiltZ: 0,    x:  LATERAL_OFFSET, camX: 0, camZ: 10,  spin: 0.4, labels: 1, textSide: 'left'   },
  { id: 'recombine', end: 0.52, explode: 0, tiltX: PROFILE_X,        tiltZ: 0,    x: -LATERAL_OFFSET, camX: 0, camZ: 7,   spin: 1.2, labels: 0, textSide: 'right'  },
  { id: 'spin',      end: 0.70, explode: 0, tiltX: PROFILE_X,        tiltZ: 0.14, x:  LATERAL_OFFSET, camX: 0, camZ: 7,   spin: 4.0, labels: 0, textSide: 'left'   },
  { id: 'orbit',     end: 0.88, explode: 0, tiltX: PROFILE_X,        tiltZ: 0.14, x: -LATERAL_OFFSET,
    camX: ORBIT_RADIUS * Math.sin(ORBIT_ANGLE), camZ: ORBIT_RADIUS * Math.cos(ORBIT_ANGLE),
    spin: 1.2, labels: 0, textSide: 'right' },
  { id: 'settle',    end: 1.00, explode: 0, tiltX: FACE_ON_X,        tiltZ: 0,    x: 0,               camX: 0, camZ: 6,   spin: 0.5, labels: 0, textSide: 'center' },
]);

/**
 * Pure: a part's Y at a given explode fraction. anime.js writes part positions directly
 * (never a scalar the render loop reads back), so the timeline needs a concrete Y per act
 * rather than one shared scalar.
 */
export function partYAt(partId, explode) {
  const rest = HOME[partId].y;
  return rest + (explodedY(partId) - rest) * explode;
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
    defaults: { ease: 'inOutSine' },
    autoplay: onScroll({
      target: scrollTarget,
      sync: 0.2,
      enter: 'top top',
      leave: 'bottom bottom',
    }),
  });

  // Generated from ACTS rather than hand-written. Each act tweens from wherever the
  // previous one left off, so transitions carry state forward instead of resetting.
  let previousEnd = 0;
  for (const act of ACTS) {
    const at = previousEnd * SCRUB_DURATION;
    const duration = (act.end - previousEnd) * SCRUB_DURATION;
    if (duration <= 0) continue;

    for (const partId of Object.keys(PART_RANK)) {
      timeline.add(parts[partId].position, { y: partYAt(partId, act.explode), duration }, at);
    }
    timeline.add(tilt.rotation, { x: act.tiltX, z: act.tiltZ, duration }, at);
    timeline.add(tilt.position, { x: act.x, duration }, at);
    timeline.add(camera.position, { x: act.camX, z: act.camZ, duration }, at);
    timeline.add(state, { spinRate: act.spin, labelOpacity: act.labels, duration }, at);

    previousEnd = act.end;
  }

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
