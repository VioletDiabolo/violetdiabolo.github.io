import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio, worstCase, TIME_STEPS } from '../src/gradient/contrast.js';

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

describe('relativeLuminance', () => {
  it('matches the WCAG reference values', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 6);
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 6);
  });

  it('applies the sRGB transfer curve, not a linear one', () => {
    // Mid-grey is 0.2159, not 0.5. Getting this wrong inflates every dark-background
    // ratio and is the easiest way to ship an unreadable page that tests green.
    expect(relativeLuminance([128, 128, 128])).toBeCloseTo(0.2159, 3);
  });

  it('weights the channels correctly — red, green and blue are not interchangeable', () => {
    // Every other sample in this file is achromatic (R=G=B), so a coefficient swap —
    // e.g. 0.0722*R + 0.7152*G + 0.2126*B instead of 0.2126*R + 0.7152*G + 0.0722*B —
    // produces identical output for all of them and would ship undetected. Pure red
    // exercises the red coefficient in isolation: channel(255) = 1 and channel(0) = 0
    // exactly, so relativeLuminance([255, 0, 0]) reduces to the bare red coefficient,
    // 0.2126. Swapped weights would report 0.0722 (blue's coefficient) instead.
    expect(relativeLuminance([255, 0, 0])).toBeCloseTo(0.2126, 6);
  });

  it('uses the linear low-end branch for a non-zero value, not just its zero fixed point', () => {
    // Every sample above maps to s = 0 for at least one channel (black), and 0 / 12.92 = 0
    // regardless of the divisor — a transcribed 12.92 -> 1.292 still passes both tests
    // above. c = 10 gives s = 10/255 = 0.039216, just inside the s <= 0.03928 linear
    // branch, so relativeLuminance([10, 10, 10]) reduces to channel(10) = s / 12.92
    // (the three WCAG weights sum to 1, so equal channels just return that shared value).
    // Computed independently: 10/255 = 0.0392156862745098; / 12.92 = 0.0030352698...
    expect(relativeLuminance([10, 10, 10])).toBeCloseTo(0.0030353, 6);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 2);
  });

  it('is 1:1 for a colour on itself', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 6);
  });

  it('does not care which argument is lighter', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(contrastRatio(BLACK, WHITE), 6);
  });
});

describe('worstCase', () => {
  it('reports the lowest ratio across the samples, not the average', () => {
    // Averaging is the mistake this function exists to prevent: a background that is
    // dark for eleven frames and bright for one still fails the reader on that frame.
    const samples = [BLACK, BLACK, BLACK, [240, 240, 240]];
    const { ratio, index } = worstCase(samples, WHITE);
    expect(index).toBe(3);
    expect(ratio).toBeLessThan(1.3);
  });

  it('names which sample failed, so a failure is actionable', () => {
    expect(worstCase([BLACK, WHITE], WHITE).index).toBe(1);
  });

  it('finds the minimum when it sits in the middle of the array, not just an end', () => {
    // Both tests above put the true minimum at the last index, so a stub with no
    // comparison logic at all — `{ ratio: contrastRatio(samples.at(-1), text), index:
    // samples.length - 1 }` — passes every other test in this file. Grey-128 text
    // against [BLACK, WHITE, BLACK] breaks that: contrastRatio(BLACK, grey128) ≈ 5.32
    // but contrastRatio(WHITE, grey128) ≈ 3.95 (computed independently, matching the
    // 0.2159 grey luminance from the test above), so the true worst sample is the one
    // in the middle. A last-index stub would report index 2 and ratio ≈5.32 instead.
    const GREY = [128, 128, 128];
    const { ratio, index } = worstCase([BLACK, WHITE, BLACK], GREY);
    expect(index).toBe(1);
    expect(ratio).toBeCloseTo(3.9494, 3);
  });

  it('keeps the first index on a tie between equal minima', () => {
    // Untested behaviour, low-impact but worth pinning: two samples with identical
    // ratios should blame the first occurrence, not the last.
    expect(worstCase([BLACK, BLACK], WHITE).index).toBe(0);
  });

  it('throws on an empty sample set rather than passing vacuously', () => {
    // A guard that silently succeeds when handed nothing is how this project shipped
    // a test that executed zero assertions.
    expect(() => worstCase([], WHITE)).toThrow();
  });

  it('throws rather than silently skipping a sample with a non-finite ratio', () => {
    // r < ratio is false whenever r is NaN, so a corrupted sample used to lose the
    // comparison and vanish rather than fail loudly. Before this guard,
    // worstCase([WHITE, [NaN, 128, 128], BLACK], WHITE) returned { ratio: 1, index: 0 }
    // — a perfectly plausible-looking result that silently dropped the NaN frame.
    expect(() => worstCase([WHITE, [NaN, 128, 128], BLACK], WHITE)).toThrow();
  });

  it('throws on a sample with too few channels instead of destructuring to NaN', () => {
    // An RGB/RGBA-length mismatch — here a 2-element sample — destructures its blue
    // channel to undefined; undefined / 255 is NaN, which used to be silently skipped.
    // Before this guard, worstCase([[10, 20]], WHITE) returned { ratio: Infinity,
    // index: -1 } — the single most comfortable, and most wrong, number available.
    expect(() => worstCase([[10, 20]], WHITE)).toThrow();
  });
});

describe('TIME_STEPS', () => {
  it('samples enough of a cycle that a bright moment cannot hide between frames', () => {
    expect(TIME_STEPS).toBeGreaterThanOrEqual(12);
  });
});
