import { describe, it, expect } from 'vitest';
import { SCROLL_BEATS } from '../src/scroll/choreography.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

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
