import { Color, DoubleSide, LineBasicMaterial, MeshBasicMaterial } from 'three';

/**
 * Flat fills, one per part kind. The object is unlit, so nothing shades it — colour and
 * the edge overlay carry the whole of its form.
 */
export const PART_COLORS = Object.freeze({
  // #b9a6dc (the brief's literal value) measures saturation 0.435 against this same
  // module's own accent test, whose threshold (accent 0.663 x 0.6 = 0.398) it exceeds --
  // it would fail 'keeps the accent the only saturated colour' outright. This value holds
  // the identical hue (261.1 deg) and lightness (0.757) and only trims saturation to
  // 0.387, comfortably under threshold.
  cup: '#baa9d9',
  hub: '#15111b',
  bearing: '#9aa0ab',
  gasket: '#cf2f2a',
});

/** Edges sit lighter than their fill so the wireframe reads against it. */
export const EDGE_COLORS = Object.freeze({
  cup: '#e4dcf4',
  hub: '#6b6478',
  bearing: '#d6dae1',
  gasket: '#f2857f',
});

/** The single accent. Every other part stays low-chroma; a test enforces that. */
export const ACCENT = 'gasket';

/**
 * Unlit materials, so this needs neither a renderer nor a quality tier.
 *
 * Deleting the PBR path took RoomEnvironment, PMREMGenerator, the gradient canvas texture
 * and the transmission tier with it — including the render-target leak that machinery
 * needed two separate fixes for.
 */
export function createMaterials() {
  // `transparent: true` on every fill AND every edge: the scroll choreography fades the
  // whole object out in the grid room by animating state.objectOpacity, which stage.js's
  // render loop assigns to material.opacity. Three ignores opacity outright on an opaque
  // material, so without this flag that fade is a silent no-op -- nothing throws, the
  // object simply never disappears. It is not a lighting property; the object stays
  // flat and unlit (see this module's own doc comment and its tests).
  const fill = (key, extra = {}) =>
    new MeshBasicMaterial({ color: new Color(PART_COLORS[key]), transparent: true, ...extra });

  return {
    cup: fill('cup', { side: DoubleSide }),
    hub: fill('hub'),
    bearing: fill('bearing'),
    gasket: fill('gasket'),
    edge: Object.fromEntries(
      Object.keys(PART_COLORS).map((key) => [
        key,
        new LineBasicMaterial({ color: new Color(EDGE_COLORS[key]), transparent: true }),
      ]),
    ),
  };
}

/**
 * Every material in the structure, flat, whatever container key it sits under.
 *
 * Two places need the full set and must never disagree about it: stage.js's render loop,
 * which writes state.objectOpacity onto each one, and disposeMaterials below. Both used
 * to walk the shape themselves, hardcoding "the top level, plus `edge`" -- so a material
 * added under any new key would have been half-wired by one and leaked by the other, in
 * silence. That is the same shape as the edge-material defect this branch already
 * shipped: a seam built and then not connected, with nothing throwing.
 *
 * Recursion stops at anything Three marks as a material, so a material's own object-valued
 * properties are never walked; `seen` guards against a container that points back at one
 * of its own ancestors.
 */
export function flattenMaterials(materials) {
  const found = [];
  const seen = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (value.isMaterial) {
      found.push(value);
      return;
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(materials);
  return found;
}

export function disposeMaterials(materials) {
  for (const material of flattenMaterials(materials)) material.dispose();
}
