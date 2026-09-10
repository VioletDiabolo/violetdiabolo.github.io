import { describe, it, expect } from 'vitest';
import { Group } from 'three';
import { buildDiabolo, HOME } from '../src/diabolo/build.js';
import { PART_IDS, DIMS } from '../src/diabolo/profiles.js';

const stubMaterials = { cup: {}, gasket: {}, hub: {}, bearing: {} };
const build = () => buildDiabolo({ materials: stubMaterials, segments: 32 });

describe('buildDiabolo', () => {
  it('creates exactly one group per declared part', () => {
    const { parts } = build();
    expect(Object.keys(parts).sort()).toEqual([...PART_IDS].sort());
    for (const id of PART_IDS) expect(parts[id]).toBeInstanceOf(Group);
  });

  it('parents every part to root', () => {
    const { root, parts } = build();
    expect(root.children).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) expect(parts[id].parent).toBe(root);
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
});
