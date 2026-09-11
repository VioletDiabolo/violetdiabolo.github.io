import { Group } from 'three';
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
/** CSS3D works in CSS pixels; this brings a ~200px element down to scene scale. Not
 *  exported: used only by createLabels() below, unlike LABEL_OFFSET_X above. */
const LABEL_SCALE = 0.006;

/**
 * A CSS3DRenderer layer sharing the WebGL camera.
 *
 * Sprites are parented to a dedicated `labelRoot` group attached to `tilt` — never to
 * the part groups, and never to `spinner`. CSS3DSprite billboards *orientation* only;
 * position still comes from matrixWorld. A sprite parented under the continuously-
 * spinning `spinner` group would therefore orbit the object with it, sweeping every
 * label onto the axis (and the sides collapsing into each other) four times per
 * revolution. Under `tilt` the labels inherit the face-on-to-profile turn — they are
 * annotating that diagram — but never the idle spin. Because the sprite no longer
 * lives inside the part group that actually explodes outward, render() below copies
 * each part's current Y offset onto its sprite every frame.
 *
 * CSS3DSprite billboards toward the camera, so they stay readable through the
 * face-on-to-profile turn — a plain CSS3DObject would turn edge-on and vanish.
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
export function createLabels({ parts, tilt, container, state }) {
  const renderer = new CSS3DRenderer();
  renderer.domElement.className = 'label-layer';
  container.append(renderer.domElement);

  // Attached to `tilt`, never to `spinner`. CSS3DSprite billboards orientation but not
  // position, so a sprite parented under the continuously-spinning group orbits the
  // object and every label collapses onto the axis four times per revolution.
  // Under `tilt` the labels inherit the face-on-to-profile turn and nothing else.
  const labelRoot = new Group();
  labelRoot.name = 'labelRoot';
  tilt.add(labelRoot);

  const elements = {};
  const sprites = {};
  const sides = {};

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
    // Recorded in `sides`, not re-derived from `order`, since render() needs it every
    // frame and the part/sprite pairing is otherwise the only place order is known.
    const side = order % 2 === 0 ? 1 : -1;
    sides[id] = side;
    sprite.position.set(LABEL_OFFSET_X * side, parts[id].position.y, 0);

    labelRoot.add(sprite);
    elements[id] = el;
    sprites[id] = sprite;
  });

  return {
    elements,
    sprites,
    render(scene, camera) {
      // Track each part's explosion offset. parts[id].position.y is in spinner-local
      // space and spinner only rotates, so it is directly usable in tilt-local space.
      for (const id of PART_IDS) {
        sprites[id].position.set(LABEL_OFFSET_X * sides[id], parts[id].position.y, 0);
      }
      // anime.js owns state.labelOpacity; this only reads it (see the module doc comment
      // above). Labels annotate the exploded diagram, so they stay faded out while the
      // object is face-on and stacked, and fade in as scroll/choreography.js turns and
      // opens it.
      const opacity = String(state.labelOpacity);
      // Below a small threshold, also drop pointer/find-in-page hits on the now-invisible
      // text. opacity:0 is what keeps it there: per ARIA, visibility:hidden removes an
      // element from the accessibility tree exactly as display:none does, so neither may
      // be used here — pointer-events only ever affects hit-testing, never a11y exposure.
      for (const id of PART_IDS) {
        elements[id].style.opacity = opacity;
        elements[id].style.pointerEvents = state.labelOpacity < 0.02 ? 'none' : 'auto';
      }
      renderer.render(scene, camera);
    },
    setSize(width, height) {
      renderer.setSize(width, height);
    },
    dispose() {
      tilt.remove(labelRoot);
      renderer.domElement.remove();
    },
  };
}
