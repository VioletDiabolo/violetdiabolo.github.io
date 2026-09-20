// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { LineBasicMaterial, MeshBasicMaterial } from 'three';
import {
  PART_COLORS, EDGE_COLORS, ACCENT, createMaterials, disposeMaterials, flattenMaterials,
} from '../src/diabolo/materials.js';

// envMap is checked separately, in 'declares no lighting properties anywhere' below: three
// 0.186 gives MeshBasicMaterial (though not LineBasicMaterial) a nullable envMap slot
// unconditionally, so toBeUndefined() can never distinguish lit from unlit for that one
// property. These six, verified empirically against both material families this module
// actually returns (MeshBasicMaterial and LineBasicMaterial), are genuinely absent -- not
// merely null -- on both, so toBeUndefined() still means something for them.
const PBR = ['transmission', 'clearcoat', 'roughness', 'metalness', 'thickness', 'ior'];

/**
 * Chroma: max channel minus min, un-normalised by lightness. The spec's words are "no
 * other saturated HUE", and chroma is what measures that. HSL saturation, which this
 * replaces, divides by lightness, so it reports a pale near-white tint as violently
 * saturated (#efeaf8 measures 0.50 there and 0.05 here) and inflates dark tints the
 * same way. That inflation is what forced two hand-fitted thresholds -- 0.6 for the
 * fills, a separate 0.7 for the edges -- and what made one palette value get nudged
 * from #b9a6dc to #baa9d9 purely to squeeze 2.7% under a number. One measure, one
 * multiplier, and the palette now clears it by 5x-20x instead of by a hair.
 */
const chroma = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
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

  it('keeps the accent the only saturated hue', () => {
    // One multiplier for both palettes now, because chroma treats a pale edge tint and a
    // dark fill tint on the same footing -- see the helper above for why two were needed
    // when this measured HSL saturation instead.
    const accent = chroma(PART_COLORS[ACCENT]);
    for (const [key, hex] of Object.entries(PART_COLORS)) {
      if (key === ACCENT) continue;
      expect(chroma(hex), `${key} competes with the accent`).toBeLessThan(accent * 0.6);
    }

    const accentEdge = chroma(EDGE_COLORS[ACCENT]);
    for (const [key, hex] of Object.entries(EDGE_COLORS)) {
      if (key === ACCENT) continue;
      expect(chroma(hex), `${key} edge competes with the accent edge`).toBeLessThan(accentEdge * 0.6);
    }
  });

  it('draws edges lighter than their fill, so form reads without lighting', () => {
    for (const key of Object.keys(PART_COLORS)) {
      expect(luminance(EDGE_COLORS[key]), `${key} edges vanish into the fill`)
        .toBeGreaterThan(luminance(PART_COLORS[key]));
    }
  });

  it('draws a dark body in bright line, which is the whole of the client\'s reference', () => {
    // "Dark body, bright edges": the fills drop to near-black so they read as mass that
    // hides the lines behind it, and the edges go bright so the object reads as a glowing
    // line drawing rather than a lavender solid. The previous palette failed both halves
    // -- a #baa9d9 cup fill against #e4dcf4 edges is a pale solid with edges nobody can
    // see -- and nothing in this file noticed, because "edges lighter than their fill"
    // above is satisfied by any two values a few percent apart.
    for (const key of Object.keys(PART_COLORS)) {
      if (key === ACCENT) continue; // the gasket is the one part that is colour, not mass
      expect(luminance(PART_COLORS[key]), `${key} fill does not read as dark mass`)
        .toBeLessThan(40);
      expect(luminance(EDGE_COLORS[key]), `${key} edge is not a bright line`)
        .toBeGreaterThan(150);
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

describe('flattenMaterials', () => {
  it('finds every material createMaterials returns, fills and edges alike', () => {
    // stage.js's render loop writes state.objectOpacity onto exactly this list every
    // frame. Anything it misses fades partway and then stops, which reads as a rendering
    // glitch rather than a missing entry in an array -- so the coverage is pinned here
    // rather than left to a hand-maintained list in a file that needs WebGL to run.
    const m = createMaterials();
    const flat = flattenMaterials(m);
    expect(flat).toHaveLength(Object.keys(PART_COLORS).length * 2);
    for (const key of Object.keys(PART_COLORS)) {
      expect(flat, `${key} fill`).toContain(m[key]);
      expect(flat, `${key} edge`).toContain(m.edge[key]);
    }
  });

  it('reaches a material added under a container key nobody knew about', () => {
    // The actual regression this guards: the old hardcoded walk knew about the top level
    // and `edge`, and nothing else. A future `glow: { rim }` would have been invisible to
    // both the fade and the disposal, with no error anywhere.
    const m = createMaterials();
    const buried = new MeshBasicMaterial();
    expect(flattenMaterials({ ...m, glow: { inner: { rim: buried } } })).toContain(buried);
  });

  it('never walks into a material\'s own properties', () => {
    // MeshBasicMaterial carries object-valued properties of its own (color, envMap slot,
    // userData). Recursing through them would return duplicates and, worse, make the
    // per-frame opacity write depend on three's internals.
    expect(flattenMaterials(createMaterials())).toHaveLength(Object.keys(PART_COLORS).length * 2);
  });

  it('returns nothing for an empty bag rather than throwing', () => {
    expect(flattenMaterials({})).toEqual([]);
    expect(flattenMaterials(null)).toEqual([]);
  });

  it('is what disposeMaterials disposes, so the two sets cannot diverge', () => {
    const m = createMaterials();
    const disposed = [];
    for (const mat of flattenMaterials(m)) mat.dispose = () => disposed.push(mat);
    disposeMaterials(m);
    expect(disposed).toEqual(flattenMaterials(m));
  });
});
