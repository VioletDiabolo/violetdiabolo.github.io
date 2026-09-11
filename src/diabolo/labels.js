import { CSS3DRenderer, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { PART_IDS } from './profiles.js';

/**
 * Technical annotation of the object's own parts. Not club copy — no bios, dates or
 * event text belongs here, and a test asserts that.
 */
export const PART_LABELS = Object.freeze({
  cupTop:        { index: '01', name: 'UPPER CUP' },
  gasketTop:     { index: '02', name: 'GASKET' },
  hubConeTop:    { index: '03', name: 'HUB CONE' },
  axleBearing:   { index: '04', name: 'AXLE BEARING' },
  hubConeBottom: { index: '05', name: 'HUB CONE' },
  gasketBottom:  { index: '06', name: 'GASKET' },
  cupBottom:     { index: '07', name: 'LOWER CUP' },
});

/** How far to the side of its part a label sits, in scene units. */
export const LABEL_OFFSET_X = 1.15;
/** CSS3D works in CSS pixels; this brings a ~200px element down to scene scale. */
export const LABEL_SCALE = 0.006;

/**
 * A CSS3DRenderer layer sharing the WebGL camera.
 *
 * Sprites are parented to the part groups, so they travel with the explosion. CSS3DSprite
 * billboards toward the camera, so they stay readable through the face-on-to-profile turn
 * — a plain CSS3DObject would turn edge-on and vanish.
 *
 * The elements are real DOM: selectable, focusable, translatable, screen-readable. That is
 * what makes going full spectacle cost nothing in accessibility.
 */
export function createLabels({ parts, container }) {
  const renderer = new CSS3DRenderer();
  renderer.domElement.className = 'label-layer';
  container.append(renderer.domElement);

  const elements = {};

  PART_IDS.forEach((id, order) => {
    const meta = PART_LABELS[id];
    const el = document.createElement('div');
    el.className = 'part-label';
    el.dataset.part = id;

    const index = document.createElement('span');
    index.className = 'part-label-index';
    index.textContent = meta.index;

    const name = document.createElement('span');
    name.className = 'part-label-name';
    name.textContent = meta.name;

    el.append(index, name);

    const sprite = new CSS3DSprite(el);
    sprite.scale.setScalar(LABEL_SCALE);
    // Alternate sides so stacked labels never collide once the object is exploded.
    sprite.position.set(LABEL_OFFSET_X * (order % 2 === 0 ? 1 : -1), 0, 0);

    parts[id].add(sprite);
    elements[id] = el;
  });

  return {
    elements,
    render(scene, camera) {
      renderer.render(scene, camera);
    },
    setSize(width, height) {
      renderer.setSize(width, height);
    },
    dispose() {
      for (const id of PART_IDS) {
        const sprite = parts[id].children.find((c) => c.element);
        if (sprite) parts[id].remove(sprite);
      }
      renderer.domElement.remove();
    },
  };
}
