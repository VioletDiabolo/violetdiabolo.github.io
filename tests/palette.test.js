import { describe, it, expect } from 'vitest';
import { PALETTE } from '../src/gradient/palette.js';

/**
 * The WCAG coefficients applied to RAW, non-linearised sRGB — so this is NOT relative
 * luminance and must not be read as one. Relative luminance gamma-expands each channel
 * first (`c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4`, which is what
 * src/gradient/contrast.js actually does); skipping that expansion overstates a dark
 * colour by an order of magnitude. `deep` scores 0.0274 here against a true relative
 * luminance of 0.0021 -- 13x too high. Both are far under the 0.05 threshold below, so
 * the test still means what it means; the NAME was the problem, not the arithmetic.
 *
 * It is kept because it is sufficient for what these tests ask of it — the expansion is
 * monotonic per channel, so an ordering of these three stops is the same either way — and
 * it is named `weightedSum` rather than `lum` because the previous name invited the
 * threshold below to be read as a WCAG figure, which it is not. The real contrast
 * arithmetic, and every number the design is certified against, lives in contrast.js and
 * docs/VERIFICATION.md §7.
 */
const weightedSum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

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
    expect(weightedSum(PALETTE.deep)).toBeLessThan(weightedSum(PALETTE.mid));
    expect(weightedSum(PALETTE.mid)).toBeLessThan(weightedSum(PALETTE.bright));
  });

  it('starts near black, so text has a ground to sit on', () => {
    // 0.05 on the weighted sum above, not on relative luminance -- see its comment.
    expect(weightedSum(PALETTE.deep)).toBeLessThan(0.05);
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
