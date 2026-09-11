import { describe, it, expect } from 'vitest';
import { Group } from 'three';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { PART_IDS, DIMS, bearingProfile, hubConeProfile, gasketProfile } from '../src/diabolo/profiles.js';

const stubMaterials = { cup: { id: 'cup' }, gasket: { id: 'gasket' }, hub: { id: 'hub' }, bearing: { id: 'bearing' } };
const build = () => buildDiabolo({ materials: stubMaterials, segments: 32 });

describe('buildDiabolo', () => {
  it('creates exactly one group per declared part', () => {
    const { parts } = build();
    expect(Object.keys(parts).sort()).toEqual([...PART_IDS].sort());
    for (const id of PART_IDS) expect(parts[id]).toBeInstanceOf(Group);
  });

  it('parents every part to spinner', () => {
    const { spinner, parts } = build();
    expect(spinner.children).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) expect(parts[id].parent).toBe(spinner);
  });

  it('tags each group with its part id', () => {
    const { parts } = build();
    for (const id of PART_IDS) expect(parts[id].userData.partId).toBe(id);
  });

  it('exposes the bearing spin mesh as a distinct object from its group', () => {
    const { parts } = build();
    const spinMesh = parts.axleBearing.userData.spinMesh;
    expect(spinMesh).toBeDefined();
    expect(spinMesh === parts.axleBearing).toBe(false);
    expect(spinMesh.parent).toBe(parts.axleBearing);
  });

  it('stacks assembled parts in strictly descending height', () => {
    const ys = PART_IDS.map((id) => HOME[id].y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it('is vertically symmetric at rest', () => {
    expect(HOME.cupTop.y).toBeCloseTo(-HOME.cupBottom.y, 6);
    expect(HOME.gasketTop.y).toBeCloseTo(-HOME.gasketBottom.y, 6);
    expect(HOME.hubConeTop.y).toBeCloseTo(-HOME.hubConeBottom.y, 6);
    expect(HOME.axleBearing.y).toBeCloseTo(0, 6);
  });

  it('flips exactly the bottom half', () => {
    const flipped = PART_IDS.filter((id) => HOME[id].flip);
    expect(flipped).toEqual(['hubConeBottom', 'gasketBottom', 'cupBottom']);
  });

  it('places every part group at its home position', () => {
    const { parts } = build();
    for (const id of PART_IDS) expect(parts[id].position.y).toBeCloseTo(HOME[id].y, 6);
  });

  it('builds real geometry with vertex positions', () => {
    const { parts } = build();
    for (const id of PART_IDS) {
      const mesh = parts[id].children.find((c) => c.geometry);
      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0);
    }
  });

  it('keeps the assembly within a sane bounding height', () => {
    const total = HOME.cupTop.y - HOME.cupBottom.y + 2 * DIMS.cupHeight;
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(6);
  });

  it('assigns each part its intended material', () => {
    const { parts } = build();
    const materialIdOf = (id) => parts[id].children.find((c) => c.geometry).material.id;
    expect(materialIdOf('cupTop')).toBe('cup');
    expect(materialIdOf('cupBottom')).toBe('cup');
    expect(materialIdOf('gasketTop')).toBe('gasket');
    expect(materialIdOf('gasketBottom')).toBe('gasket');
    expect(materialIdOf('hubConeTop')).toBe('hub');
    expect(materialIdOf('hubConeBottom')).toBe('hub');
    expect(materialIdOf('axleBearing')).toBe('bearing');
  });
});

describe('seam continuity', () => {
  // The bug this guards: a profile authored in the opposite direction to the assembly
  // mounts its part inverted, leaving a visible radius step where two parts meet.
  const SEAM_TOLERANCE = 0.02;

  it('meets the bearing and the hub cone at a comparable radius', () => {
    const bearingMax = Math.max(...bearingProfile().map((p) => p.x));
    const hubAtBearing = hubConeProfile()[0].x;
    expect(Math.abs(hubAtBearing - bearingMax)).toBeLessThan(SEAM_TOLERANCE);
  });

  it('meets the hub cone and the gasket bore at a comparable radius', () => {
    const hubAtNeck = hubConeProfile().at(-1).x;
    const gasketBore = gasketProfile()[0].x;
    expect(Math.abs(hubAtNeck - gasketBore)).toBeLessThan(SEAM_TOLERANCE);
  });
});

describe('scene graph nesting', () => {
  it('wraps the spinner in a tilt group so the turn and the spin never share an object', () => {
    const { tilt, spinner } = build();
    expect(tilt).toBeInstanceOf(Group);
    expect(spinner).toBeInstanceOf(Group);
    expect(spinner.parent).toBe(tilt);
    expect(tilt.parent).toBeNull();
  });

  it('gives tilt exactly one child, so nothing else is caught by the turn', () => {
    const { tilt, spinner } = build();
    expect(tilt.children).toEqual([spinner]);
  });

  // 'parents every part to spinner', identical in body to this one, already covers this
  // in the `buildDiabolo` describe block above -- not duplicated here.

  it('names both groups, so a debugger shows which owns what', () => {
    const { tilt, spinner } = build();
    expect(tilt.name).toBe('diaboloTilt');
    expect(spinner.name).toBe('diaboloSpinner');
  });
});
