import { describe, it, expect } from 'vitest';
import { SCROLL_BEATS, beatTarget, BEAT_DURATION, BEAT_STAGGER } from '../src/scroll/choreography.js';
import { PART_IDS } from '../src/diabolo/profiles.js';
import { HOME } from '../src/diabolo/build.js';

describe('SCROLL_BEATS', () => {
  it('assigns every part exactly one beat', () => {
    const parts = SCROLL_BEATS.map((b) => b.part);
    expect(new Set(parts).size).toBe(parts.length);
    expect(parts.slice().sort()).toEqual([...PART_IDS].sort());
  });

  it('walks the documented section order', () => {
    expect(SCROLL_BEATS.map((b) => b.section)).toEqual([
      'about', 'events', 'events', 'media', 'board', 'board', 'contact',
    ]);
  });

  it('moves every part away from the origin', () => {
    for (const b of SCROLL_BEATS) {
      const distance = Math.hypot(b.offset[0], b.offset[1], b.offset[2]);
      expect(distance, `${b.part} never leaves home`).toBeGreaterThan(0.4);
    }
  });

  it('sends the top half up and the bottom half down', () => {
    const y = (part) => SCROLL_BEATS.find((b) => b.part === part).offset[1];
    expect(y('cupTop')).toBeGreaterThan(0);
    expect(y('gasketTop')).toBeGreaterThan(0);
    expect(y('hubConeTop')).toBeGreaterThan(0);
    expect(y('cupBottom')).toBeLessThan(0);
    expect(y('gasketBottom')).toBeLessThan(0);
    expect(y('hubConeBottom')).toBeLessThan(0);
  });

  it('spins the bearing up hardest at the media beat', () => {
    const bearing = SCROLL_BEATS.find((b) => b.part === 'axleBearing');
    expect(bearing.section).toBe('media');
    const fastest = Math.max(...SCROLL_BEATS.map((b) => b.spinRate));
    expect(bearing.spinRate).toBe(fastest);
    expect(bearing.spinRate).toBeGreaterThan(1);
  });

  it('separates parts laterally so labels do not collide', () => {
    const xs = SCROLL_BEATS.map((b) => b.offset[0]);
    expect(new Set(xs).size).toBeGreaterThan(1);
  });
});

describe('beatTarget', () => {
  it('adds each offset to its part HOME position rather than replacing or subtracting it', () => {
    for (const beat of SCROLL_BEATS) {
      expect(beatTarget(beat).position.y).toBeCloseTo(HOME[beat.part].y + beat.offset[1], 10);
    }
  });

  it('lifts the top half above its rest height and drops the bottom half below', () => {
    const targetFor = (id) => beatTarget(SCROLL_BEATS.find((b) => b.part === id));
    for (const id of ['cupTop', 'gasketTop', 'hubConeTop']) {
      expect(targetFor(id).position.y).toBeGreaterThan(HOME[id].y);
    }
    for (const id of ['cupBottom', 'gasketBottom', 'hubConeBottom']) {
      expect(targetFor(id).position.y).toBeLessThan(HOME[id].y);
    }
  });

  it('never lands two parts on the same exploded position', () => {
    const keys = SCROLL_BEATS.map((b) => {
      const p = beatTarget(b).position;
      return `${p.x},${p.y},${p.z}`;
    });
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives a part with no lateral offset no lateral tilt', () => {
    const flat = { part: 'axleBearing', offset: [0, 0, 0], spinRate: 1 };
    expect(beatTarget(flat).rotation.z).toBe(0);
    expect(beatTarget(flat).rotation.x).toBe(0);
  });
});

describe('timeline shape', () => {
  it('overlaps beats so parts cascade instead of moving one at a time', () => {
    expect(BEAT_STAGGER).toBeLessThan(BEAT_DURATION);
  });

  it('ends the bearing spin-down before the timeline runs out', () => {
    const bearingIndex = SCROLL_BEATS.findIndex((b) => b.spinRate !== 1);
    const spinDownEnds = bearingIndex * BEAT_STAGGER + 2 * BEAT_DURATION;
    const timelineEnds = (SCROLL_BEATS.length - 1) * BEAT_STAGGER + BEAT_DURATION;
    expect(spinDownEnds).toBeLessThanOrEqual(timelineEnds);
  });
});

describe('SCROLL_BEATS immutability', () => {
  it('cannot be mutated in place by a consumer', () => {
    const before = SCROLL_BEATS[0].offset[1];
    try { SCROLL_BEATS[0].offset[1] = 999; } catch { /* frozen throws in strict mode */ }
    expect(SCROLL_BEATS[0].offset[1]).toBe(before);
  });
});
