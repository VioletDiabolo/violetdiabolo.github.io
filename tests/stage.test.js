import { describe, it, expect } from 'vitest';
import { resolveQualityTier, TIER_SETTINGS, rotationDeltas, resolveViewport } from '../src/diabolo/stage.js';

const HIGH_END = { pointerFine: true, viewportWidth: 1440, deviceMemory: 16 };

describe('resolveQualityTier', () => {
  it('selects high for a wide fine-pointer device with ample memory', () => {
    expect(resolveQualityTier(HIGH_END)).toBe('high');
  });

  it('selects high when deviceMemory is unreported, since many browsers omit it', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: undefined })).toBe('high');
  });

  it('drops to base for a coarse pointer regardless of width', () => {
    expect(resolveQualityTier({ ...HIGH_END, pointerFine: false })).toBe('base');
  });

  it('drops to base below 1024px', () => {
    expect(resolveQualityTier({ ...HIGH_END, viewportWidth: 1023 })).toBe('base');
  });

  it('drops to base on low reported memory', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: 4 })).toBe('base');
  });

  it('defaults to base when signals are missing entirely', () => {
    expect(resolveQualityTier({})).toBe('base');
    expect(resolveQualityTier(undefined)).toBe('base');
  });

  it('enables transmission only on the high tier', () => {
    expect(TIER_SETTINGS.high.transmission).toBe(true);
    expect(TIER_SETTINGS.base.transmission).toBe(false);
  });

  it('caps device pixel ratio lower on the base tier', () => {
    expect(TIER_SETTINGS.base.dpr).toBeLessThan(TIER_SETTINGS.high.dpr);
  });

  it('treats 1024px as wide enough, the exact threshold', () => {
    expect(resolveQualityTier({ ...HIGH_END, viewportWidth: 1024 })).toBe('high');
  });

  it('treats 8GB as enough memory, the exact threshold', () => {
    expect(resolveQualityTier({ ...HIGH_END, deviceMemory: 8 })).toBe('high');
  });
});

describe('rotationDeltas', () => {
  it('advances both rotations in the same direction', () => {
    const d = rotationDeltas(0.016, 1);
    expect(d.root).toBeGreaterThan(0);
    expect(d.bearing).toBeGreaterThan(0);
  });

  it('spins the bearing faster than the body', () => {
    const d = rotationDeltas(0.016, 1);
    expect(d.bearing).toBeGreaterThan(d.root);
  });

  it('scales only the bearing with spinRate', () => {
    const slow = rotationDeltas(0.016, 1);
    const fast = rotationDeltas(0.016, 4);
    expect(fast.root).toBeCloseTo(slow.root, 10);
    expect(fast.bearing).toBeCloseTo(slow.bearing * 4, 10);
  });

  it('produces no rotation for a zero delta', () => {
    const d = rotationDeltas(0, 1);
    expect(d.root).toBe(0);
    expect(d.bearing).toBe(0);
  });
});

describe('resolveViewport', () => {
  const BASE = { width: 800, height: 400, devicePixelRatio: 3, maxDpr: 2 };

  it('computes aspect as width over height', () => {
    expect(resolveViewport(BASE).aspect).toBeCloseTo(2, 10);
  });

  it('caps pixel ratio at the tier maximum', () => {
    expect(resolveViewport(BASE).pixelRatio).toBe(2);
  });

  it('uses the real pixel ratio when it is below the cap', () => {
    expect(resolveViewport({ ...BASE, devicePixelRatio: 1 }).pixelRatio).toBe(1);
  });

  it('returns null for an unmeasurable box rather than dividing by zero', () => {
    expect(resolveViewport({ ...BASE, width: 0 })).toBeNull();
    expect(resolveViewport({ ...BASE, height: 0 })).toBeNull();
  });
});
