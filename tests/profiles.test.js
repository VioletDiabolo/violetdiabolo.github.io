import { describe, it, expect } from 'vitest';
import { PART_IDS, DIMS, cupProfile, gasketProfile, hubConeProfile, bearingProfile } from '../src/diabolo/profiles.js';

describe('part inventory', () => {
  it('names seven parts ordered top to bottom', () => {
    expect(PART_IDS).toEqual([
      'cupTop', 'gasketTop', 'hubConeTop', 'axleBearing', 'hubConeBottom', 'gasketBottom', 'cupBottom',
    ]);
  });

  it('is vertically symmetric about the bearing', () => {
    // Chained .replace(/Top$/...).replace(/Bottom$/...) would undo itself. Swap in one step.
    const swap = (id) =>
      id.endsWith('Top') ? id.slice(0, -3) + 'Bottom'
      : id.endsWith('Bottom') ? id.slice(0, -6) + 'Top'
      : id;
    expect(PART_IDS.map(swap).reverse()).toEqual([...PART_IDS]);
  });
});

describe('cupProfile', () => {
  it('returns the requested segment count plus the closing point', () => {
    expect(cupProfile(64)).toHaveLength(65);
  });

  it('runs from the axle neck up to the outer rim', () => {
    const p = cupProfile(64);
    expect(p[0].y).toBeCloseTo(0, 5);
    expect(p.at(-1).y).toBeCloseTo(DIMS.cupHeight, 5);
    expect(p[0].x).toBeCloseTo(DIMS.neckRadius, 5);
    expect(p.at(-1).x).toBeCloseTo(DIMS.rimRadius, 5);
  });

  it('widens monotonically — a diabolo cup never pinches back in', () => {
    const p = cupProfile(64);
    for (let i = 1; i < p.length; i++) {
      expect(p[i].x).toBeGreaterThanOrEqual(p[i - 1].x - 1e-9);
      expect(p[i].y).toBeGreaterThan(p[i - 1].y - 1e-9);
    }
  });

  it('flares like a bowl, not a cone: radius opens fastest at the neck, height climbs fastest at the rim', () => {
    const p = cupProfile(64);
    // Decelerating flare — near the rim the wall is close to vertical.
    expect(p[16].x - p[0].x).toBeGreaterThan(p[64].x - p[48].x);
    // Accelerating rise — the same fact seen on the other axis.
    expect(p[64].y - p[48].y).toBeGreaterThan(p[16].y - p[0].y);
  });

  it('never produces a negative radius at any segment count', () => {
    for (const n of [8, 16, 64, 128]) {
      for (const pt of cupProfile(n)) expect(pt.x).toBeGreaterThan(0);
    }
  });
});

describe('small parts', () => {
  it('keeps the gasket wider than the neck but far narrower than the rim', () => {
    expect(DIMS.gasketRadius).toBeGreaterThan(DIMS.neckRadius);
    expect(DIMS.gasketRadius).toBeLessThan(DIMS.rimRadius * 0.5);
    expect(gasketProfile().length).toBeGreaterThan(2);
  });

  it('runs the hub cone narrow-at-the-bearing to wide-at-the-neck, matching assembly order', () => {
    const p = hubConeProfile();
    expect(p[0].x).toBeCloseTo(DIMS.bearingRadius, 6);
    expect(p.at(-1).x).toBeCloseTo(DIMS.neckRadius, 6);
    expect(p[0].x).toBeLessThan(p.at(-1).x);
  });

  it('keeps the bearing the narrowest part of the assembly', () => {
    expect(DIMS.bearingRadius).toBeLessThan(DIMS.neckRadius);
    expect(bearingProfile().length).toBeGreaterThan(2);
  });
});

describe('hub cone density', () => {
  it('describes its taper with as few points as a straight line needs', () => {
    // A linear taper is exact at 2 subdivisions; subdividing 24 times only multiplies
    // edge lines. Measured: 312 lines at 24 points versus 48 at 2, identical endpoints.
    expect(hubConeProfile()).toHaveLength(3);
  });

  it('still spans the same radii, so the silhouette is unchanged', () => {
    const p = hubConeProfile();
    expect(p[0].x).toBeCloseTo(DIMS.bearingRadius, 6);
    expect(p.at(-1).x).toBeCloseTo(DIMS.neckRadius, 6);
    expect(p.at(-1).y).toBeCloseTo(DIMS.hubHeight, 6);
  });
});

describe('proportions', () => {
  it('keeps the black axle assembly a minor share of total height, as in the reference photo', () => {
    const totalHeight = 2 * (DIMS.bearingHeight / 2 + DIMS.hubHeight + DIMS.gasketThickness + DIMS.cupHeight);
    const blackHeight = 2 * DIMS.hubHeight + DIMS.bearingHeight;
    const share = blackHeight / totalHeight;
    expect(share).toBeGreaterThan(0.12);
    expect(share).toBeLessThan(0.22);
  });

  it('keeps the cups the dominant mass', () => {
    expect(DIMS.cupHeight).toBeGreaterThan(DIMS.hubHeight * 4);
  });
});
