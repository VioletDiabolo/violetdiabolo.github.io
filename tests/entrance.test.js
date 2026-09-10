import { describe, it, expect, vi } from 'vitest';
import {
  ENTRANCE_SCATTER, entranceStartY, createEntrance,
} from '../src/scroll/entrance.js';
import { FACE_ON_X } from '../src/scroll/choreography.js';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

const scene = () => buildDiabolo({ materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16 });

describe('entranceStartY', () => {
  it('starts every part further out than it will ever travel', () => {
    for (const id of PART_IDS) {
      expect(Math.abs(entranceStartY(id))).toBeGreaterThan(Math.abs(HOME[id].y));
    }
  });

  it('scatters symmetrically about the centre', () => {
    expect(entranceStartY('cupTop')).toBeCloseTo(-entranceStartY('cupBottom'), 10);
  });

  it('gives even the centre bearing somewhere to come from', () => {
    expect(entranceStartY('axleBearing')).not.toBe(0);
  });

  it('derives from ENTRANCE_SCATTER, so the spread is one number', () => {
    expect(entranceStartY('cupTop')).toBeCloseTo(HOME.cupTop.y + ENTRANCE_SCATTER, 10);
  });
});

describe('createEntrance', () => {
  it('places parts scattered and face-on before it plays', () => {
    const { tilt, parts } = scene();
    createEntrance({ parts, tilt, onComplete: () => {} });
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 6);
    for (const id of PART_IDS) {
      expect(parts[id].position.y).toBeCloseTo(entranceStartY(id), 6);
    }
  });

  it('converges every part onto its rest position by the end', () => {
    const { tilt, parts } = scene();
    const { timeline } = createEntrance({ parts, tilt, onComplete: () => {} });
    timeline.seek(timeline.duration);
    for (const id of PART_IDS) {
      expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 4);
    }
  });

  it('leaves the object face-on when it finishes, so the turn has somewhere to go', () => {
    const { tilt, parts } = scene();
    const { timeline } = createEntrance({ parts, tilt, onComplete: () => {} });
    timeline.seek(timeline.duration);
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 4);
  });

  it('skip() lands the final state immediately and reports completion', () => {
    const { tilt, parts } = scene();
    const onComplete = vi.fn();
    const { skip } = createEntrance({ parts, tilt, onComplete });
    skip();
    for (const id of PART_IDS) expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 4);
    expect(tilt.rotation.x).toBeCloseTo(FACE_ON_X, 4);
    expect(onComplete.mock.calls.length).toBe(1);
  });

  it('reports completion exactly once, so the scroll timeline is never built twice', () => {
    const { tilt, parts } = scene();
    const onComplete = vi.fn();
    const { skip } = createEntrance({ parts, tilt, onComplete });
    skip();
    skip();
    expect(onComplete.mock.calls.length).toBe(1);
  });
});
