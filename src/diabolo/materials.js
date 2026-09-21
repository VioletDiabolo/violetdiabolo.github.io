import { Color, DoubleSide, LineBasicMaterial, MeshBasicMaterial } from 'three';

/**
 * Flat fills, one per part kind. The object is unlit, so nothing shades it — colour and
 * the edge overlay carry the whole of its form.
 *
 * Dark body, bright edges. Every fill but the gasket drops to a near-black a shade or
 * two off the page's own ground (--stage, #08060d), so a fill is no longer something you
 * see: it is the mass that hides the lines behind it. What you see is EDGE_COLORS. That
 * is the animejs.com reading the client asked for, and it is the opposite of the pale
 * lavender solid they rejected — #baa9d9 at luminance 176 with #e4dcf4 edges at 232 is a
 * solid whose wireframe cannot be made out at all.
 *
 * The three non-accent fills are deliberately not the same black: cup, hub and bearing
 * sit at luminance 11.0 / 7.6 / 19.7, which is enough for one mass to read in front of
 * another where they overlap, while none of them reads as a colour.
 */
export const PART_COLORS = Object.freeze({
  cup: '#0c0a12',
  hub: '#08070c',
  bearing: '#14131a',
  // The one part that is colour rather than mass, and the only colour in the object at
  // all. The PAGE's accent is violet and lives on the page furniture (src/styles/base.css
  // --accent); the two are separate scopes and must not be collapsed, or the red ring
  // that makes this object read as a diabolo goes with them.
  gasket: '#cf2f2a',
});

/**
 * Edges sit lighter than their fill so the wireframe reads against it — here, far
 * lighter: these lines are the object. Cup and bearing carry the faintest violet and
 * cool casts so the parts stay distinguishable as line alone; measured chroma is 0.055
 * and 0.024 against the accent edge's 0.616, so neither is a second hue.
 */
export const EDGE_COLORS = Object.freeze({
  cup: '#efeaf8',
  hub: '#b9b4c6',
  bearing: '#f2f4f8',
  gasket: '#ff6a62',
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
