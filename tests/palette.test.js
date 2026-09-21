import { describe, it, expect } from 'vitest';
import { PALETTE } from '../src/gradient/palette.js';

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('PALETTE', () => {
  it('names three stops', () => {
    expect(Object.keys(PALETTE).sort()).toEqual(['bright', 'deep', 'mid']);
  });

  it('gives every stop three components in 0-1', () => {
    for (const [name, rgb] of Object.entries(PALETTE)) {
      expect(rgb, name).toHaveLength(3);
      for (const c of rgb) {
        expect(c, name).toBeGreaterThanOrEqual(0);
        expect(c, name).toBeLessThanOrEqual(1);
      }
    }
  });

  it('runs dark to light', () => {
    // The shader maps noise through these in order; out of order, the ribbons invert.
    expect(lum(PALETTE.deep)).toBeLessThan(lum(PALETTE.mid));
    expect(lum(PALETTE.mid)).toBeLessThan(lum(PALETTE.bright));
  });

  it('starts near black, so text has a ground to sit on', () => {
    expect(lum(PALETTE.deep)).toBeLessThan(0.05);
  });

  it('is violet, not blue', () => {
    // Red well above zero against a dominant blue is what separates violet from the
    // reference's blue, which has almost no red at all.
    const [r, g, b] = PALETTE.mid;
    expect(r).toBeGreaterThan(0.3);
    expect(b).toBeGreaterThan(r);
    expect(g).toBeLessThan(r);
  });
});
