import { describe, it, expect } from 'vitest';
import {
  ROOMS, SHOWCASE_ID, SPACING, PROFILE_X, LATERAL_OFFSET, explodedY, partYAt,
} from '../src/scroll/choreography.js';
import { HOME } from '../src/diabolo/build.js';
import { CAMERA_NEAR_Z, CAMERA_FAR_Z, CAMERA_FOV } from '../src/diabolo/stage.js';
import { DIMS, PART_IDS } from '../src/diabolo/profiles.js';

describe('ROOMS', () => {
  const byId = () => Object.fromEntries(ROOMS.map((r) => [r.id, r]));

  it('names the four rooms in order', () => {
    expect(ROOMS.map((r) => r.id)).toEqual(['hero', 'panel', 'showcase', 'grid']);
  });

  it('covers the whole scrub without gaps or overlap', () => {
    for (let i = 1; i < ROOMS.length; i++) expect(ROOMS[i].end).toBeGreaterThan(ROOMS[i - 1].end);
    expect(ROOMS.at(-1).end).toBe(1);
  });

  it('matches the spans the spec sets', () => {
    expect(ROOMS.map((r) => r.end)).toEqual([0.12, 0.30, 0.55, 1.00]);
  });

  // Carried over from the six-act table this replaces. The exact-span test above catches
  // drift; only this says what must be true of ANY valid table -- a room too short to
  // register reads as a cut rather than a transition.
  it('gives every room enough scroll to read as a transition rather than a cut', () => {
    let previous = 0;
    for (const room of ROOMS) {
      expect(room.end - previous, `${room.id} is too short to register`).toBeGreaterThanOrEqual(0.08);
      previous = room.end;
    }
  });

  it('explodes in exactly one room', () => {
    const exploding = ROOMS.filter((r) => r.explode > 0);
    expect(exploding).toHaveLength(1);
    expect(exploding[0].id).toBe(SHOWCASE_ID);
    expect(exploding[0].explode).toBe(1);
  });

  it('keeps the object assembled everywhere else', () => {
    for (const room of ROOMS) {
      if (room.id === SHOWCASE_ID) continue;
      expect(room.explode, `${room.id} is partly exploded`).toBe(0);
    }
  });

  it('shows the part labels only where the object is apart', () => {
    for (const room of ROOMS) {
      expect(room.labels, `${room.id}`).toBe(room.id === SHOWCASE_ID ? 1 : 0);
    }
  });

  // Carried over from the six-act table, where it guarded the `apart` act. The labels are
  // only legible if the thing carrying them is not whipping past.
  it('slows the spin while the labels are meant to be read', () => {
    const r = byId();
    expect(r.showcase.spin).toBe(Math.min(...ROOMS.map((room) => room.spin)));
  });

  it('holds the object still behind the panel, which covers it', () => {
    const r = byId();
    expect(r.panel.x).toBeCloseTo(r.hero.x, 6);
    expect(r.panel.camZ).toBeCloseTo(r.hero.camZ, 6);
    expect(r.panel.explode).toBe(r.hero.explode);
  });

  it('fades the object out by the grid room, where content takes over', () => {
    const r = byId();
    expect(r.hero.opacity).toBe(1);
    expect(r.showcase.opacity).toBe(1);
    expect(r.grid.opacity).toBeLessThan(0.2);
  });

  it('varies the spin between rooms, so scroll visibly drives it', () => {
    const rates = ROOMS.map((r) => r.spin);
    expect(new Set(rates).size).toBeGreaterThan(2);
    expect(Math.max(...rates)).toBeGreaterThan(2 * Math.min(...rates));
  });

  it('pulls the camera back for the explosion and nowhere else', () => {
    const r = byId();
    expect(r.showcase.camZ).toBeGreaterThan(r.hero.camZ);
    expect(r.showcase.camZ).toBeGreaterThan(r.grid.camZ);
  });

  it('keeps every room inside the camera frustum', () => {
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const assembledHalf = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    const explodedHalf = 3 * SPACING + DIMS.cupHeight;
    for (const room of ROOMS) {
      const reach = Math.abs(room.y) + (room.explode === 1 ? explodedHalf : assembledHalf);
      expect(visibleHalfHeight(room.camZ), `${room.id} clips`).toBeGreaterThan(reach * 1.1);
    }
  });

  it('starts the scrub at the distance the entrance seeds, so there is no opening dolly', () => {
    // entrance.js seeds camera.position.z to CAMERA_NEAR_Z synchronously before the scroll
    // timeline exists (see its own doc comment and frustum test). If the first room's camZ
    // ever drifts from that value, the very first scroll tick would dolly the camera to
    // that camZ, an opening jump nothing else here guards. Carried over from the six-act
    // table, where it pinned `arrival`; the defect it was written for is unchanged.
    expect(ROOMS[0].camZ).toBe(CAMERA_NEAR_Z);
  });

  it('keeps the camera between its near and far distances', () => {
    // Distance from the object, not raw camZ. No room sets camX any more -- the orbit act
    // is gone -- so hypot reduces to camZ throughout. It is kept because the bound being
    // checked is a DISTANCE, and the six-act table proved that matters: orbit swung camX
    // away from 0, and at 40 degrees off-axis its camZ alone (5.362) read as nearer than
    // CAMERA_NEAR_Z even though the camera sat exactly 7 units out. Anything that
    // reintroduces a camX is still guarded correctly, rather than passing by omission.
    for (const room of ROOMS) {
      const distance = Math.hypot(room.camX ?? 0, room.camZ);
      expect(distance, `${room.id} is too close`).toBeGreaterThanOrEqual(CAMERA_NEAR_Z - 0.01);
      expect(distance, `${room.id} is too far`).toBeLessThanOrEqual(CAMERA_FAR_Z + 0.01);
    }
  });

  it('puts the object on the opposite side from the reading column', () => {
    for (const room of ROOMS) {
      if (room.textSide === 'left') expect(room.x, room.id).toBeGreaterThan(0);
      if (room.textSide === 'right') expect(room.x, room.id).toBeLessThan(0);
      if (room.textSide === 'center') expect(room.x, room.id).toBe(0);
    }
  });

  it('moves the object far enough aside to clear a 38% reading column', () => {
    const offset = ROOMS.filter((r) => r.x !== 0);
    expect(offset.length).toBeGreaterThan(0);
    for (const room of offset) {
      const visibleWidth = 2 * room.camZ * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)) * (16 / 10);
      const nearEdgePct = 50 + (100 * (Math.abs(room.x) - DIMS.rimRadius)) / visibleWidth;
      expect(nearEdgePct, `${room.id} overlaps the reading column`).toBeGreaterThanOrEqual(42);
    }
  });

  /**
   * The lift exists for exactly one reason: to stop centred text being laid over the
   * object. A room at `opacity: 0` has no object to lay text over, so it is exempt -- not
   * because centred rooms stopped mattering, but because the hazard is gone with the
   * object. The two tests below are the only place that exemption applies, and it is
   * falsifiable: set `grid.opacity` to 1 and both fail, because grid is centred, unlifted
   * and would then be visible.
   */
  const centredAndVisible = () => ROOMS.filter((r) => r.textSide === 'center' && r.opacity > 0);

  it('lifts the object in the visible centred rooms, so the title is not laid over it', () => {
    // Rooms with the column on one side avoid overlap horizontally instead; they must not
    // be paying for a lift they have no use for.
    for (const room of ROOMS) {
      if (room.textSide !== 'center') expect(room.y, `${room.id} should not need a lift`).toBe(0);
    }
    for (const room of centredAndVisible()) {
      expect(room.y, `${room.id} centres text on a centred, visible object`).toBeGreaterThan(0.3);
    }
  });

  it('leaves room beneath the object in the visible centred rooms for the text to live', () => {
    const visibleHalfHeight = (z) => z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
    const half = DIMS.cupHeight + DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness;
    for (const room of centredAndVisible()) {
      const vh = visibleHalfHeight(room.camZ);
      // Percentage of the viewport, measured from the very bottom, still clear once the
      // object's own bottom edge (room.y - half) is accounted for.
      const clearBelowPct = 100 * ((vh + room.y - half) / (2 * vh));
      expect(clearBelowPct, `${room.id} leaves no room for the title`).toBeGreaterThan(25);
    }
  });

  it('pins every room state, so no field can drift unnoticed', () => {
    expect(ROOMS.map((r) => [r.id, r.end, r.explode, r.spin, r.labels, r.opacity])).toEqual([
      ['hero',     0.12, 0, 1.0, 0, 1],
      ['panel',    0.30, 0, 1.0, 0, 1],
      ['showcase', 0.55, 1, 0.5, 1, 1],
      ['grid',     1.00, 0, 1.6, 0, 0],
    ]);
  });

  it('pins each room orientation, framing and reading side', () => {
    // The pin above deliberately omits tiltX, x, y, camZ and textSide. Without this,
    // nothing catches those five drifting -- which is the exact gap that let `arrival`'s
    // camZ drift away from CAMERA_NEAR_Z under the six-act table.
    const r = byId();
    for (const id of ['hero', 'panel']) expect(r[id].tiltX, id).toBeCloseTo(-0.42, 10);
    for (const id of ['showcase', 'grid']) expect(r[id].tiltX, id).toBeCloseTo(PROFILE_X, 10);
    for (const id of ['hero', 'panel']) expect(r[id].x, id).toBeCloseTo(LATERAL_OFFSET * 0.55, 10);
    expect(r.showcase.x).toBeCloseTo(LATERAL_OFFSET * 0.5, 10);
    expect(r.grid.x).toBe(0);
    expect(ROOMS.map((room) => room.y)).toEqual([0, 0, 0, 0]);
    expect(ROOMS.map((room) => room.camZ)).toEqual([6.2, 6.2, 10, 7]);
    expect(ROOMS.map((room) => room.textSide)).toEqual(['left', 'left', 'left', 'center']);
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
