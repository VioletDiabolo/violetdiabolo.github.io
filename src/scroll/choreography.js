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

/**
 * Fraction of a room the object spends crossing to its new position. The rest of the
 * room it holds still, clear of the reading column. Tweening `x` across the whole room
 * means the object sits on the incoming text's side for most of it — which is the
 * obstruction this composition exists to remove.
 */
export const LATERAL_SETTLE = 0.22;

/**
 * Fraction of a room the object spends fading to its new opacity. Deliberately well
 * under LATERAL_SETTLE, and that ordering is the whole point of the constant.
 *
 * A room whose column is centred has no horizontal escape: once `x` reaches 0 the object
 * is under the text with nowhere left to go, and the only thing stopping it being laid
 * over the title is that there is nothing left to see. Fading across a room's full
 * duration makes that true at the final frame alone -- mid-room the object was still at
 * ~0.89 opacity, dead centre, spanning roughly a quarter to nine tenths of the viewport,
 * straight through a title held at 66vh. At 0.10 against LATERAL_SETTLE's 0.22 the fade
 * lands at 45% of the way to centre, so the object is gone before it ever arrives.
 *
 * Opacity alone rides this shorter duration. `spinRate` and `labelOpacity` keep the full
 * room, because neither is a thing the reading column can collide with.
 */
export const OPACITY_SETTLE = 0.10;

/** The one room the explosion plays in. Everywhere else the object is whole. */
export const SHOWCASE_ID = 'showcase';

/**
 * The room the object is parked in whenever the scrub never runs: reduced motion skips
 * the entrance to exactly this state and attaches no timeline (see main.js, entrance.js).
 * Named rather than spelled out at each site so the static reading side, the entrance's
 * seeding and the table itself cannot drift apart.
 */
export const HERO_ID = 'hero';

/** Lifted off profile so the hero reads as an object rather than a diagram. */
const HERO_TILT = -0.42;

/**
 * Four rooms, as target states reached at the END of each `end` fraction. Rooms have
 * edges, and the explosion PLAYS in one of them rather than being smeared across the
 * page, which is the substantive change from the six-act version this replaces.
 *
 * Said precisely, because the short version of it is not true and was written here for a
 * while: what is confined to the showcase room is the exploded TARGET STATE. The tween
 * out of it is not. Each room's tweens run its full duration, so the reassembly that
 * starts at the showcase's end runs the whole grid room -- measured, cupTop leaves rest
 * at f = 0.3014 and is still off it at f = 0.99, and spinRate only reaches its 1.6 at
 * f = 1.00. What keeps that from being a four-tenths-of-a-page reassembly on screen is
 * opacity, not position: objectOpacity rides OPACITY_SETTLE instead of the full room and
 * reaches 0 at f = 0.595, where the object is still 97.55% apart. So the object is gone
 * before any part of its reassembly can be seen, and everything after 0.595 is a scene
 * graph still moving behind an opacity of zero.
 *
 * That distinction is not pedantry -- it is what the page's section heights are sized
 * against (sections.css's derivation) and what docs/VERIFICATION.md reports as qualified
 * rather than verified, having measured the same 97.5-100% window independently.
 * tests/choreography.dom.test.js samples inside it rather than only at the endpoints.
 *
 * `explode` 0 = assembled, 1 = fully apart. `opacity` fades the whole object out (the
 * render loop reads it off `state`, see diabolo/stage.js). `textSide` records where the
 * reading column sits, so a test can assert the object is always on the other side of
 * it; `y` would lift the object clear of a centred column, but no room needs that now --
 * the three rooms with a column beside them separate horizontally instead, and the one
 * centred room has faded the object out entirely by the time its text arrives.
 */
export const ROOMS = Object.freeze([
  { id: 'hero',     end: 0.12, explode: 0, tiltX: HERO_TILT, x: LATERAL_OFFSET * 0.55, y: 0, camZ: 6.2, spin: 1.0, labels: 0, opacity: 1, textSide: 'left'   },
  { id: 'panel',    end: 0.30, explode: 0, tiltX: HERO_TILT, x: LATERAL_OFFSET * 0.55, y: 0, camZ: 6.2, spin: 1.0, labels: 0, opacity: 1, textSide: 'left'   },
  { id: 'showcase', end: 0.55, explode: 1, tiltX: PROFILE_X, x: LATERAL_OFFSET * 0.50, y: 0, camZ: 10,  spin: 0.5, labels: 1, opacity: 1, textSide: 'left'   },
  { id: 'grid',     end: 1.00, explode: 0, tiltX: PROFILE_X, x: 0,                     y: 0, camZ: 7,   spin: 1.6, labels: 0, opacity: 0, textSide: 'center' },
]);

/**
 * Pure: a part's Y at a given explode fraction. anime.js writes part positions directly
 * (never a scalar the render loop reads back), so the timeline needs a concrete Y per
 * room rather than one shared scalar.
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

  // Generated from ROOMS rather than hand-written. Each room tweens from wherever the
  // previous one left off, so transitions carry state forward instead of resetting.
  let previousEnd = 0;
  for (const room of ROOMS) {
    const at = previousEnd * SCRUB_DURATION;
    const duration = (room.end - previousEnd) * SCRUB_DURATION;
    if (duration <= 0) continue;

    for (const partId of Object.keys(PART_RANK)) {
      timeline.add(parts[partId].position, { y: partYAt(partId, room.explode), duration }, at);
    }
    timeline.add(tilt.rotation, { x: room.tiltX, duration }, at);
    // Settled over a fraction of the room, not the whole of it: see LATERAL_SETTLE.
    timeline.add(tilt.position, { x: room.x, y: room.y, duration: duration * LATERAL_SETTLE }, at);
    // camera.position.x is never animated -- there is no orbit room. It stays at 0.
    timeline.add(camera.position, { z: room.camZ, duration }, at);
    timeline.add(state, { spinRate: room.spin, labelOpacity: room.labels, duration }, at);
    // Opacity on its own, shorter duration -- see OPACITY_SETTLE. A separate add() on the
    // same target is how anime.js expresses that: different properties, so still exactly
    // one owner each, the same way tilt.position already runs shorter than tilt.rotation.
    timeline.add(state, { objectOpacity: room.opacity, duration: duration * OPACITY_SETTLE }, at);

    previousEnd = room.end;
  }

  return {
    timeline,
    dispose() {
      timeline.revert();
    },
  };
}
