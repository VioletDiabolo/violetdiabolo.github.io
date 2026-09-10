import { createTimeline } from 'animejs';
import { HOME } from '../diabolo/build.js';
import { FACE_ON_X } from './choreography.js';

/** How far out parts begin, comfortably beyond any exploded position. */
export const ENTRANCE_SCATTER = 4.5;
export const ENTRANCE_DURATION = 1400;

/**
 * Pure: where a part begins the entrance. The centre bearing gets a nudge too, so it
 * arrives with everything else rather than being the one piece that was always there.
 */
export function entranceStartY(partId) {
  const rest = HOME[partId].y;
  const direction = Math.sign(rest) || 1;
  return rest + direction * ENTRANCE_SCATTER;
}

/**
 * The load sequence: parts converge from scattered onto the assembled object, face-on.
 *
 * `onComplete` is where the caller creates the scroll timeline. It must not be created
 * before this fires — the entrance and the scroll timeline both write part positions,
 * and two live timelines on one property fight.
 */
export function createEntrance({ parts, tilt, onComplete }) {
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    onComplete();
  };

  // Establish the starting state synchronously, so the first painted frame is already
  // correct rather than flashing the assembled object for one frame.
  tilt.rotation.x = FACE_ON_X;
  for (const partId of Object.keys(HOME)) {
    parts[partId].position.y = entranceStartY(partId);
  }

  const timeline = createTimeline({
    defaults: { ease: 'outExpo', duration: ENTRANCE_DURATION },
    onComplete: finish,
  });

  for (const partId of Object.keys(HOME)) {
    timeline.add(parts[partId].position, { y: HOME[partId].y }, 0);
  }

  return {
    timeline,
    skip() {
      tilt.rotation.x = FACE_ON_X;
      for (const partId of Object.keys(HOME)) {
        parts[partId].position.y = HOME[partId].y;
      }
      timeline.pause();
      finish();
    },
  };
}
