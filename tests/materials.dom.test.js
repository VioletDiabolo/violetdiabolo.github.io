// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { LineBasicMaterial, MeshBasicMaterial } from 'three';
import { PART_COLORS, EDGE_COLORS, ACCENT, createMaterials, disposeMaterials } from '../src/diabolo/materials.js';

// envMap is checked separately, in 'declares no lighting properties anywhere' below: three
// 0.186 gives MeshBasicMaterial (though not LineBasicMaterial) a nullable envMap slot
// unconditionally, so toBeUndefined() can never distinguish lit from unlit for that one
// property. These six, verified empirically against both material families this module
// actually returns (MeshBasicMaterial and LineBasicMaterial), are genuinely absent -- not
// merely null -- on both, so toBeUndefined() still means something for them.
const PBR = ['transmission', 'clearcoat', 'roughness', 'metalness', 'thickness', 'ior'];

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

    // Same guard for the edge palette, so a future edit can't introduce a second saturated
    // edge hue -- EDGE_COLORS was previously unchecked here. Edge tints are pale, which
    // inflates HSL saturation relative to the fills at the same perceptual chroma, so this
    // reuses the accent-ratio pattern above but with its own threshold rather than the
    // fills' 0.6. Measured: accent edge (gasket) saturation 0.816; the next highest (cup) is
    // 0.522, a ratio of 0.640; hub and bearing sit far lower, at 0.111 and 0.190. 0.7 clears
    // cup with an ~8.6% margin while still catching an intruder anywhere near the accent
    // edge's own saturation.
    const accentEdge = saturation(EDGE_COLORS[ACCENT]);
    for (const [key, hex] of Object.entries(EDGE_COLORS)) {
      if (key === ACCENT) continue;
      expect(saturation(hex), `${key} edge competes with the accent edge`).toBeLessThan(accentEdge * 0.7);
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
      // Three's MeshBasicMaterial constructor sets envMap = null unconditionally -- not
      // something a constructor argument can suppress, and not something production code
      // should delete just to satisfy this test (see materials.js history). null is the
      // correct "no environment map" value: every read site in three's renderer
      // (WebGLMaterials.js, WebGLProgram.js) treats null and undefined identically via a
      // truthy check. Asserting falsy, not toBeUndefined(), is what actually distinguishes
      // lit from unlit here.
      expect(mat.envMap, `${mat.type} carries a real envMap`).toBeFalsy();
    }
  });

  it('builds only flat material types, never a lit standard/physical material', () => {
    // toBeUndefined()/toBeFalsy() checks above only prove specific properties are absent;
    // they can't rule out some other lit material type that happens not to declare those
    // particular properties. This pins the actual constructors instead.
    const m = createMaterials();
    for (const key of Object.keys(PART_COLORS)) {
      expect(m[key], `${key} fill`).toBeInstanceOf(MeshBasicMaterial);
      expect(m.edge[key], `${key} edge`).toBeInstanceOf(LineBasicMaterial);
    }
    const all = [...Object.keys(PART_COLORS).map((k) => m[k]), ...Object.values(m.edge)];
    for (const mat of all) {
      // Catches MeshStandardMaterial and MeshPhysicalMaterial alike -- physical extends
      // standard, so this flag is true on both.
      expect(mat.isMeshStandardMaterial, `${mat.type} is a lit standard/physical material`).toBeFalsy();
    }
  });

  it('marks every material transparent, so the object can be faded out at all', () => {
    // scroll/choreography.js animates state.objectOpacity and diabolo/stage.js's render
    // loop assigns it to material.opacity every frame. Three ignores opacity entirely on
    // an opaque material, so without this flag the grid room's fade-out is a silent
    // no-op: nothing throws, nothing fails, the object simply never disappears.
    const m = createMaterials();
    const all = [...Object.keys(PART_COLORS).map((k) => m[k]), ...Object.values(m.edge)];
    for (const mat of all) {
      expect(mat.transparent, `${mat.type} ignores state.objectOpacity`).toBe(true);
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
