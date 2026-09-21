// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// CSS3DRenderer.render() computes real perspective/matrix CSS from camera.projectionMatrix
// and camera.matrixWorldInverse (see node_modules/three's CSS3DRenderer.js) — it throws on
// the plain `{}` stand-ins for scene/camera the opacity tests below use, since those exist
// only to exercise labels.js's own render() wrapper (the opacity/pointerEvents assignment
// and the sprite-position tracking), not three.js's CSS projection math. CSS3DSprite/
// CSS3DObject are untouched (kept via importOriginal) — every other test in this file
// relies on the real ones for sprite placement.
vi.mock('three/examples/jsm/renderers/CSS3DRenderer.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CSS3DRenderer: class {
      constructor() {
        this.domElement = document.createElement('div');
      }
      render() {}
      setSize() {}
    },
  };
});

import { PART_LABELS, LABEL_OFFSET_X, createLabels } from '../src/diabolo/labels.js';
import { buildDiabolo } from '../src/diabolo/build.js';
import { PART_IDS } from '../src/diabolo/profiles.js';

const scene = () => buildDiabolo({
  materials: {
    cup: {}, gasket: {}, hub: {}, bearing: {},
    edge: { cup: {}, gasket: {}, hub: {}, bearing: {} },
  },
  segments: 16,
});

describe('PART_LABELS', () => {
  it('labels every part', () => {
    expect(Object.keys(PART_LABELS).sort()).toEqual([...PART_IDS].sort());
  });

  it('numbers them in assembly order, top to bottom', () => {
    const indices = PART_IDS.map((id) => PART_LABELS[id].index);
    expect(indices).toEqual(['01', '02', '03', '04', '05', '06', '07']);
  });

  it('carries no club copy — these annotate the object, not the site', () => {
    const text = Object.values(PART_LABELS).map((l) => l.name).join(' ');
    expect(text).not.toMatch(/NYU|Violet|Kimmel|Aaron|Jonathan/i);
  });
});

describe('createLabels', () => {
  it('creates one label sprite for every part, parented under labelRoot rather than the part itself', () => {
    const { tilt, parts } = scene();
    const { elements, sprites } = createLabels({ parts, tilt, container: document.createElement('div') });
    expect(Object.keys(elements)).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) {
      expect(sprites[id], `${id} has no label sprite`).toBeDefined();
      // Never a child of the part group itself — see labels.js's module doc comment
      // for why (CSS3DSprite billboards orientation only, never position).
      expect(parts[id].children.find((c) => c.element)).toBeUndefined();
    }
  });

  it('offsets labels to the side so they do not sit on top of the part', () => {
    const { tilt, parts } = scene();
    const { sprites } = createLabels({ parts, tilt, container: document.createElement('div') });
    expect(Math.abs(sprites.cupTop.position.x)).toBeCloseTo(LABEL_OFFSET_X, 6);
  });

  it('alternates sides so stacked labels do not overlap once exploded', () => {
    const { tilt, parts } = scene();
    const { sprites } = createLabels({ parts, tilt, container: document.createElement('div') });
    const sides = PART_IDS.map((id) => Math.sign(sprites[id].position.x));
    expect(new Set(sides).size).toBe(2);
  });

  it('renders real DOM, so the text stays selectable and screen-readable', () => {
    const { tilt, parts } = scene();
    const { elements } = createLabels({ parts, tilt, container: document.createElement('div') });
    const el = elements.cupTop;
    expect(el.textContent).toContain(PART_LABELS.cupTop.index);
    expect(el.textContent).toContain(PART_LABELS.cupTop.name);
    expect(el.dataset.part).toBe('cupTop');
  });

  it('keeps label text selectable, which is the reason this layer is real DOM', () => {
    // three's CSS3DObject constructor sets userSelect:'none' inline; if that is ever
    // left in place the accessibility payoff of CSS3D over a canvas overlay is lost.
    const { tilt, parts } = scene();
    const { elements } = createLabels({ parts, tilt, container: document.createElement('div'), state: { labelOpacity: 1 } });
    expect(elements.cupTop.style.userSelect).toBe('text');
  });

  it('mounts its renderer into the given container', () => {
    const { tilt, parts } = scene();
    const container = document.createElement('div');
    createLabels({ parts, tilt, container });
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('keeps labels out of the spinning group, so they never orbit onto the axis', () => {
    const { tilt, spinner, parts } = scene();
    createLabels({ parts, tilt, container: document.createElement('div'), state: { labelOpacity: 1 } });
    // No sprite may be a descendant of the group the render loop rotates.
    let found = 0;
    spinner.traverse((o) => { if (o.element) found += 1; });
    expect(found, 'a label sprite is parented under the spinning group').toBe(0);
  });

  it('tracks each part vertically without inheriting the spin', () => {
    const { tilt, spinner, parts } = scene();
    const labels = createLabels({ parts, tilt, container: document.createElement('div'), state: { labelOpacity: 1 } });
    parts.cupTop.position.y = 1.65;
    spinner.rotation.y = Math.PI / 2;   // a quarter turn, which used to swing labels to the axis
    tilt.updateMatrixWorld(true);
    labels.render({ isScene: true }, {});
    const sprite = labels.sprites.cupTop;
    expect(sprite.position.y).toBeCloseTo(1.65, 6);
    expect(Math.abs(sprite.position.x)).toBeCloseTo(LABEL_OFFSET_X, 6);
  });
});

describe('label opacity', () => {
  it('hides labels while the object is face-on, when they would all project onto one point', () => {
    const { tilt, parts } = scene();
    const state = { spinRate: 1, labelOpacity: 0 };
    const labels = createLabels({ parts, tilt, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.opacity).toBe('0');
    expect(labels.elements.cupTop.style.pointerEvents).toBe('none');
  });

  it('shows labels once anime.js raises the scalar it owns', () => {
    const { tilt, parts } = scene();
    const state = { spinRate: 1, labelOpacity: 1 };
    const labels = createLabels({ parts, tilt, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.opacity).toBe('1');
    expect(labels.elements.cupTop.style.pointerEvents).toBe('auto');
  });

  it('never outlives the object it annotates', () => {
    // The grid room fades the object out over a tenth of the room but ramps labelOpacity
    // down across the whole of it, so for most of that room the table says "labels 0.7,
    // object 0". A label floating over an object that is not there is a caption for
    // nothing -- and it lands squarely on the media section's card captions, which occupy
    // the same half of the screen by then. Measured live before this existed: four
    // separate part labels overlapping media/h3 boxes at scroll progress 0.64-0.65.
    const { tilt, parts } = scene();
    const state = { spinRate: 1, labelOpacity: 0.7, objectOpacity: 0 };
    const labels = createLabels({ parts, tilt, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.opacity, 'a label survived the object').toBe('0');
    expect(labels.elements.cupTop.style.pointerEvents).toBe('none');
  });

  it('still shows a label when only labelOpacity is supplied, rather than writing NaN', () => {
    // Every other caller passes the full state, but a partial one must degrade to the old
    // behaviour: `undefined` reaching the multiply would put opacity:"NaN" in the DOM,
    // which browsers ignore -- the labels would stay fully visible and nothing would throw.
    const { tilt, parts } = scene();
    const state = { spinRate: 1, labelOpacity: 1 };
    const labels = createLabels({ parts, tilt, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.opacity).toBe('1');
  });

  it('never removes hidden labels from the accessibility tree', () => {
    const { tilt, parts } = scene();
    const state = { spinRate: 1, labelOpacity: 0 };
    const labels = createLabels({ parts, tilt, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.display).not.toBe('none');
    expect(labels.elements.cupTop.textContent.length).toBeGreaterThan(0);
  });
});
