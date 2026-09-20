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
  const fill = (key, extra = {}) =>
    new MeshBasicMaterial({ color: new Color(PART_COLORS[key]), ...extra });

  return {
    cup: fill('cup', { side: DoubleSide }),
    hub: fill('hub'),
    bearing: fill('bearing'),
    gasket: fill('gasket'),
    edge: Object.fromEntries(
      Object.keys(PART_COLORS).map((key) => [
        key,
        new LineBasicMaterial({ color: new Color(EDGE_COLORS[key]) }),
      ]),
    ),
  };
}

export function disposeMaterials(materials) {
  for (const value of Object.values(materials)) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
  for (const value of Object.values(materials.edge ?? {})) {
    if (value && typeof value.dispose === 'function') value.dispose();
  }
}
