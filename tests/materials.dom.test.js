// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PART_COLORS, EDGE_COLORS, ACCENT, createMaterials, disposeMaterials } from '../src/diabolo/materials.js';

const PBR = ['envMap', 'transmission', 'clearcoat', 'roughness', 'metalness', 'thickness', 'ior'];

const saturation = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722;
};

describe('flat palette', () => {
  it('colours every part kind', () => {
    expect(Object.keys(PART_COLORS).sort()).toEqual(['bearing', 'cup', 'gasket', 'hub']);
    expect(Object.keys(EDGE_COLORS).sort()).toEqual(Object.keys(PART_COLORS).sort());
  });

  it('uses valid hex throughout', () => {
    for (const c of [...Object.values(PART_COLORS), ...Object.values(EDGE_COLORS)]) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('names a part that exists as the accent', () => {
    expect(PART_COLORS[ACCENT]).toBeDefined();
  });

  it('keeps the accent the only saturated colour', () => {
    const accent = saturation(PART_COLORS[ACCENT]);
    for (const [key, hex] of Object.entries(PART_COLORS)) {
      if (key === ACCENT) continue;
      expect(saturation(hex), `${key} competes with the accent`).toBeLessThan(accent * 0.6);
    }
  });

  it('draws edges lighter than their fill, so form reads without lighting', () => {
    for (const key of Object.keys(PART_COLORS)) {
      expect(luminance(EDGE_COLORS[key]), `${key} edges vanish into the fill`)
        .toBeGreaterThan(luminance(PART_COLORS[key]));
    }
  });
});

describe('createMaterials', () => {
  it('takes no renderer and no quality tier, because unlit needs neither', () => {
    expect(createMaterials.length).toBe(0);
  });

  it('builds a fill and an edge material for every part kind', () => {
    const m = createMaterials();
    for (const key of Object.keys(PART_COLORS)) {
      expect(m[key], `${key} fill`).toBeDefined();
      expect(m.edge[key], `${key} edge`).toBeDefined();
    }
  });

  it('declares no lighting properties anywhere', () => {
    const m = createMaterials();
    const all = [...Object.keys(PART_COLORS).map((k) => m[k]), ...Object.values(m.edge)];
    for (const mat of all) {
      for (const prop of PBR) {
        expect(mat[prop], `${mat.type} still declares ${prop}`).toBeUndefined();
      }
    }
  });

  it('disposes fills and edges alike', () => {
    const m = createMaterials();
    const disposed = [];
    for (const mat of [...Object.keys(PART_COLORS).map((k) => m[k]), ...Object.values(m.edge)]) {
      mat.dispose = () => disposed.push(mat);
    }
    disposeMaterials(m);
    expect(disposed).toHaveLength(Object.keys(PART_COLORS).length * 2);
  });
});
