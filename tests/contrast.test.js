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

  it('throws on an empty sample set rather than passing vacuously', () => {
    // A guard that silently succeeds when handed nothing is how this project shipped
    // a test that executed zero assertions.
    expect(() => worstCase([], WHITE)).toThrow();
  });
});

describe('TIME_STEPS', () => {
  it('samples enough of a cycle that a bright moment cannot hide between frames', () => {
    expect(TIME_STEPS).toBeGreaterThanOrEqual(12);
  });
});
