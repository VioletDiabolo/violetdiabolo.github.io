import { describe, it, expect } from 'vitest';
import {
  PART_RANK, SPACING, FACE_ON_X, PROFILE_X, explodedY,
} from '../src/scroll/choreography.js';
import { HOME } from '../src/diabolo/build.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

describe('PART_RANK', () => {
  it('ranks every part by how far out it sits in the assembly', () => {
    expect(Object.keys(PART_RANK).sort()).toEqual([...PART_IDS].sort());
    expect(PART_RANK.axleBearing).toBe(0);
    expect(PART_RANK.hubConeTop).toBe(1);
    expect(PART_RANK.gasketTop).toBe(2);
    expect(PART_RANK.cupTop).toBe(3);
  });

  it('ranks mirrored parts identically, so the explosion stays symmetric', () => {
    expect(PART_RANK.hubConeTop).toBe(PART_RANK.hubConeBottom);
    expect(PART_RANK.gasketTop).toBe(PART_RANK.gasketBottom);
    expect(PART_RANK.cupTop).toBe(PART_RANK.cupBottom);
  });
});

describe('explodedY', () => {
  it('leaves the centre bearing exactly where it rests, as the reference part', () => {
    expect(explodedY('axleBearing')).toBe(0);
    expect(explodedY('axleBearing')).toBe(HOME.axleBearing.y);
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

  it('moves every part except the bearing away from home', () => {
    for (const id of PART_IDS) {
      if (id === 'axleBearing') continue;
      expect(Math.abs(explodedY(id))).toBeGreaterThan(Math.abs(HOME[id].y));
    }
  });

  it('derives from rank and SPACING alone, so retuning the spread needs one number', () => {
    expect(explodedY('cupTop')).toBeCloseTo(3 * SPACING, 10);
    expect(explodedY('gasketTop')).toBeCloseTo(2 * SPACING, 10);
    expect(explodedY('hubConeTop')).toBeCloseTo(1 * SPACING, 10);
  });
});

describe('orientation', () => {
  it('starts face-on, looking straight down the axle', () => {
    expect(FACE_ON_X).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('ends in profile', () => {
    expect(PROFILE_X).toBe(0);
  });

  it('turns a quarter turn in total', () => {
    expect(Math.abs(PROFILE_X - FACE_ON_X)).toBeCloseTo(Math.PI / 2, 10);
  });
});
