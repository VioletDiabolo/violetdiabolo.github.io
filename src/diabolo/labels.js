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
 *
 * `state` follows the same rule as stage.js's `state.spinRate`: anime.js (scroll/
 * choreography.js) owns `state.labelOpacity` and writes it; this module only reads it, in
 * render() below. At face-on and assembled (labelOpacity's initial 0) the parts' local Y
 * axis collapses into camera depth and every label would project onto nearly the same
 * screen point — not a scale or offset problem, a projection one — so labels stay hidden
 * until the choreography has turned and opened the object enough for them to mean anything.
 */
export function createLabels({ parts, container, state }) {
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
    // CSS3DObject's constructor sets element.style.userSelect = 'none' inline
    // (three/examples/jsm/renderers/CSS3DRenderer.js). That inline style beats any
    // stylesheet rule, and it would defeat the whole reason this layer is real DOM:
    // the text must stay selectable. Undo it after construction, not before.
    el.style.userSelect = 'text';
    sprite.scale.setScalar(LABEL_SCALE);
    // Alternate sides so stacked labels never collide once the object is exploded.
    sprite.position.set(LABEL_OFFSET_X * (order % 2 === 0 ? 1 : -1), 0, 0);

    parts[id].add(sprite);
    elements[id] = el;
  });

  return {
    elements,
    render(scene, camera) {
      // anime.js owns state.labelOpacity; this only reads it (see the module doc comment
      // above). Labels annotate the exploded diagram, so they stay hidden while the object
      // is face-on and stacked, and fade in as scroll/choreography.js turns and opens it.
      const opacity = String(state.labelOpacity);
      // Below a small threshold, also drop pointer/find-in-page hits on the now-invisible
      // text. Not display:none, which would pull the label out of the accessibility tree —
      // that would lose the very property (real, screen-readable DOM) this layer exists for.
      const visibility = state.labelOpacity < 0.02 ? 'hidden' : 'visible';
      for (const id of PART_IDS) {
        elements[id].style.opacity = opacity;
        elements[id].style.visibility = visibility;
      }
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
