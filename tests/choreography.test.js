import { describe, it, expect } from 'vitest';
import {
  ACTS, SPACING, FACE_ON_X, PROFILE_X, LATERAL_OFFSET, explodedY, partYAt,
} from '../src/scroll/choreography.js';
import { HOME } from '../src/diabolo/build.js';
import { CAMERA_NEAR_Z, CAMERA_FAR_Z, CAMERA_FOV } from '../src/diabolo/stage.js';
import { DIMS, PART_IDS } from '../src/diabolo/profiles.js';

const byId = () => Object.fromEntries(ACTS.map((a) => [a.id, a]));

describe('ACTS', () => {
  it('names the six acts in order', () => {
    expect(ACTS.map((a) => a.id)).toEqual(
      ['arrival', 'apart', 'recombine', 'spin', 'orbit', 'settle'],
    );
  });

  it('covers the whole scrub without gaps or overlap', () => {
    for (let i = 1; i < ACTS.length; i++) {
      expect(ACTS[i].end).toBeGreaterThan(ACTS[i - 1].end);
    }
    expect(ACTS.at(-1).end).toBe(1);
  });

  it('gives every act enough room to read as a transition rather than a cut', () => {
    let previous = 0;
    for (const act of ACTS) {
      expect(act.end - previous, `${act.id} is too short to register`).toBeGreaterThanOrEqual(0.08);
      previous = act.end;
    }
  });

  it('starts face-on and assembled', () => {
    expect(ACTS[0].explode).toBe(0);
    expect(ACTS[0].tiltX).toBeCloseTo(FACE_ON_X, 10);
  });

  it('explodes only in the apart act, then recombines', () => {
    const a = byId();
    expect(a.apart.explode).toBe(1);
    expect(a.recombine.explode).toBe(0);
    expect(a.spin.explode).toBe(0);
  });

  it('reaches profile at the recombine act and holds it through the spin', () => {
    const a = byId();
    expect(a.recombine.tiltX).toBeCloseTo(PROFILE_X, 10);
    expect(a.spin.tiltX).toBeCloseTo(PROFILE_X, 10);
  });

  it('returns face-on to close, so the page ends where it began', () => {
    expect(ACTS.at(-1).tiltX).toBeCloseTo(FACE_ON_X, 10);
    expect(ACTS.at(-1).explode).toBe(0);
  });

  it('tips the axle off vertical only while spinning, as a diabolo on a string does', () => {
    const a = byId();
    expect(a.arrival.tiltZ).toBe(0);
    expect(Math.abs(a.spin.tiltZ)).toBeGreaterThan(0.05);
  });

  it('varies the spin across acts, so scroll visibly drives it', () => {
    const rates = ACTS.map((a) => a.spin);
    expect(new Set(rates).size).toBeGreaterThan(3);
    expect(Math.max(...rates)).toBeGreaterThan(2 * Math.min(...rates));
  });

  it('slows the spin while the labels are meant to be read', () => {
    const a = byId();
    expect(a.apart.spin).toBeLessThan(a.spin.spin);
  });

  it('keeps every act inside the camera frustum', () => {
    // Distance from the object, not raw camZ: see "keeps the camera between its near and
    // far distances" below for why the orbit act needs hypot(camX, camZ) here.
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const assembledHalf = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    const explodedHalf = 3 * SPACING + DIMS.cupHeight;
    for (const act of ACTS) {
      const halfExtent = act.explode === 1 ? explodedHalf : assembledHalf;
      const distance = Math.hypot(act.camX, act.camZ);
      const reach = Math.abs(act.y) + halfExtent;
      expect(visibleHalfHeight(distance), `${act.id} clips`).toBeGreaterThan(reach * 1.1);
    }
  });

  it('keeps the camera between its near and far distances', () => {
    // Distance from the object, not raw camZ: the orbit act swings camX away from 0,
    // so at 40 degrees off-axis camZ alone (5.362) reads as nearer than CAMERA_NEAR_Z
    // even though the camera sits exactly ORBIT_RADIUS (7) units out. camZ and distance
    // coincide for every other act, whose camX is 0.
    for (const act of ACTS) {
      const distance = Math.hypot(act.camX, act.camZ);
      expect(distance).toBeGreaterThanOrEqual(CAMERA_NEAR_Z - 0.01);
      expect(distance).toBeLessThanOrEqual(CAMERA_FAR_Z + 0.01);
    }
  });

  it('orbits the camera in exactly one act, holding its distance', () => {
    const orbiting = ACTS.filter((a) => Math.abs(a.camX) > 0.01);
    expect(orbiting).toHaveLength(1);
    expect(orbiting[0].id).toBe('orbit');
    expect(
      Math.hypot(orbiting[0].camX, orbiting[0].camZ),
      'the orbit must swing the camera, not dolly it',
    ).toBeCloseTo(7, 1);
  });

  it('swings the camera far enough to read as an orbit, without passing the object', () => {
    // hypot(R·sinθ, R·cosθ) is R for any θ, so the radius test above says nothing about
    // the angle. This is the only assertion that does.
    const orbit = ACTS.find((a) => a.id === 'orbit');
    const degrees = Math.atan2(orbit.camX, orbit.camZ) * (180 / Math.PI);
    expect(degrees).toBeGreaterThan(25);
    expect(degrees).toBeLessThan(55);
  });

  it('puts the object on the opposite side from the reading column', () => {
    for (const act of ACTS) {
      if (act.textSide === 'left') expect(act.x, act.id).toBeGreaterThan(0);
      if (act.textSide === 'right') expect(act.x, act.id).toBeLessThan(0);
      if (act.textSide === 'center') expect(act.x, act.id).toBe(0);
    }
  });

  it('moves the object far enough aside to clear a 38% reading column', () => {
    // Distance from the object, not raw camZ: see "keeps the camera between its near and
    // far distances" above for why the orbit act needs hypot(camX, camZ) here.
    const offset = ACTS.filter((a) => a.x !== 0);
    expect(offset.length).toBeGreaterThan(0);
    for (const act of offset) {
      const distance = Math.hypot(act.camX, act.camZ);
      const visibleWidth = 2 * distance * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * (16 / 10);
      const nearEdgePct = 50 + (100 * (Math.abs(act.x) - DIMS.rimRadius)) / visibleWidth;
      expect(nearEdgePct, `${act.id} overlaps the reading column`).toBeGreaterThanOrEqual(42);
    }
  });

  it('lifts the object in the centred acts, so the title is not laid over it', () => {
    // The other acts avoid overlap by putting the object opposite the text. The centred
    // acts have no opposite side, so they separate vertically instead.
    for (const act of ACTS) {
      if (act.textSide === 'center') {
        expect(act.y, `${act.id} centres text on a centred object`).toBeGreaterThan(0.3);
      } else {
        expect(act.y, `${act.id} should not need a lift`).toBe(0);
      }
    }
  });

  it('leaves room beneath the object in the centred acts for the text to live', () => {
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const half = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    for (const act of ACTS.filter((a) => a.textSide === 'center')) {
      const vh = visibleHalfHeight(Math.hypot(act.camX, act.camZ));
      // Percentage of the viewport, measured from the very bottom, still clear once the
      // object's own bottom edge (act.y - half, lifted by the act's y) is accounted for.
      // (vh + act.y - half) is that bottom edge's distance up from the bottom of the
      // frustum; dividing by the full 2*vh span and scaling to 100 turns it into a percent.
      const clearBelowPct = 100 * ((vh + act.y - half) / (2 * vh));
      expect(clearBelowPct, `${act.id} leaves no room for the title`).toBeGreaterThan(25);
    }
  });

  it('pins every act state, so no field can drift unnoticed', () => {
    // The structural tests above say what must be true of any valid table. This says what
    // this particular table is. Both matter: invariants document intent, this catches drift.
    const actual = ACTS.map((a) => [a.id, a.end, a.explode, +a.tiltZ.toFixed(2), a.spin, a.labels, a.textSide]);
    expect(actual).toEqual([
      ['arrival',   0.10, 0, 0,    1.0, 0, 'center'],
      ['apart',     0.32, 1, 0,    0.4, 1, 'left'],
      ['recombine', 0.52, 0, 0,    1.2, 0, 'right'],
      ['spin',      0.70, 0, 0.14, 4.0, 0, 'left'],
      ['orbit',     0.88, 0, 0.14, 1.2, 0, 'right'],
      ['settle',    1.00, 0, 0,    0.5, 0, 'center'],
    ]);
  });

  it('pins each act orientation and lateral offset', () => {
    const byId = Object.fromEntries(ACTS.map((a) => [a.id, a]));
    expect(byId.arrival.tiltX).toBeCloseTo(FACE_ON_X, 10);
    expect(byId.apart.tiltX).toBeCloseTo(FACE_ON_X * 0.45, 10);
    expect(byId.recombine.tiltX).toBeCloseTo(PROFILE_X, 10);
    expect(byId.spin.tiltX).toBeCloseTo(PROFILE_X, 10);
    expect(byId.orbit.tiltX).toBeCloseTo(PROFILE_X, 10);
    expect(byId.settle.tiltX).toBeCloseTo(FACE_ON_X, 10);
    for (const id of ['apart', 'spin']) expect(byId[id].x).toBeCloseTo(LATERAL_OFFSET, 10);
    for (const id of ['recombine', 'orbit']) expect(byId[id].x).toBeCloseTo(-LATERAL_OFFSET, 10);
    for (const id of ['arrival', 'settle']) expect(byId[id].x).toBe(0);
  });
});

describe('explodedY', () => {
  it('leaves the centre bearing exactly where it rests, as the reference part', () => {
    expect(explodedY('axleBearing')).toBe(0);
  });

  it('orders the top half outward by rank', () => {
    const order = ['axleBearing', 'hubConeTop', 'gasketTop', 'cupTop'];
    for (let i = 1; i < order.length; i++) {
      expect(explodedY(order[i])).toBeGreaterThan(explodedY(order[i - 1]));
    }
  });

  it('stays symmetric about the centre', () => {
    expect(explodedY('cupTop')).toBeCloseTo(-explodedY('cupBottom'), 10);
    expect(explodedY('gasketTop')).toBeCloseTo(-explodedY('gasketBottom'), 10);
    expect(explodedY('hubConeTop')).toBeCloseTo(-explodedY('hubConeBottom'), 10);
  });

  it('spaces parts exactly evenly, which is what makes it read as a measured diagram', () => {
    const ladder = ['cupTop', 'gasketTop', 'hubConeTop', 'axleBearing'].map(explodedY);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i - 1] - ladder[i]).toBeCloseTo(SPACING, 10);
    }
  });

  it('derives from rank and SPACING alone, so retuning the spread needs one number', () => {
    expect(explodedY('cupTop')).toBeCloseTo(3 * SPACING, 10);
    expect(explodedY('gasketTop')).toBeCloseTo(2 * SPACING, 10);
    expect(explodedY('hubConeTop')).toBeCloseTo(1 * SPACING, 10);
  });
});

describe('partYAt', () => {
  it('returns the rest position when nothing is exploded', () => {
    for (const id of PART_IDS) expect(partYAt(id, 0)).toBeCloseTo(HOME[id].y, 10);
  });

  it('returns the exploded position when fully apart', () => {
    for (const id of PART_IDS) expect(partYAt(id, 1)).toBeCloseTo(explodedY(id), 10);
  });

  it('interpolates linearly in between', () => {
    for (const id of PART_IDS) {
      expect(partYAt(id, 0.5)).toBeCloseTo((HOME[id].y + explodedY(id)) / 2, 10);
    }
  });

  it('leaves the centre bearing still at every value', () => {
    for (const t of [0, 0.25, 0.5, 1]) expect(partYAt('axleBearing', t)).toBe(0);
  });
});

describe('lateral offset', () => {
  it('is large enough to be a composition, not a nudge', () => {
    expect(LATERAL_OFFSET).toBeGreaterThan(DIMS.rimRadius);
  });
});
