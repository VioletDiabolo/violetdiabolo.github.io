import { describe, it, expect } from 'vitest';
import { resolveQualityTier, TIER_SETTINGS } from '../src/diabolo/stage.js';

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
});
