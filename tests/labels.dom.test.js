// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// CSS3DRenderer.render() computes real perspective/matrix CSS from camera.projectionMatrix
// and camera.matrixWorldInverse (see node_modules/three's CSS3DRenderer.js) — it throws on
// the plain `{}` stand-ins for scene/camera the opacity tests below use, since those exist
// only to exercise labels.js's own render() wrapper (the opacity/visibility assignment), not
// three.js's CSS projection math. CSS3DSprite/CSS3DObject are untouched (kept via
// importOriginal) — every other test in this file relies on the real ones for sprite
// placement.
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

const scene = () => buildDiabolo({ materials: { cup: {}, gasket: {}, hub: {}, bearing: {} }, segments: 16 });

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
  it('attaches one sprite to every part, so labels travel with the explosion', () => {
    const { parts } = scene();
    const { elements } = createLabels({ parts, container: document.createElement('div') });
    expect(Object.keys(elements)).toHaveLength(PART_IDS.length);
    for (const id of PART_IDS) {
      const sprite = parts[id].children.find((c) => c.element);
      expect(sprite, `${id} has no label sprite`).toBeDefined();
    }
  });

  it('offsets labels to the side so they do not sit on top of the part', () => {
    const { parts } = scene();
    createLabels({ parts, container: document.createElement('div') });
    const sprite = parts.cupTop.children.find((c) => c.element);
    expect(Math.abs(sprite.position.x)).toBeCloseTo(LABEL_OFFSET_X, 6);
  });

  it('alternates sides so stacked labels do not overlap once exploded', () => {
    const { parts } = scene();
    createLabels({ parts, container: document.createElement('div') });
    const sides = PART_IDS.map((id) => Math.sign(parts[id].children.find((c) => c.element).position.x));
    expect(new Set(sides).size).toBe(2);
  });

  it('renders real DOM, so the text stays selectable and screen-readable', () => {
    const { parts } = scene();
    const { elements } = createLabels({ parts, container: document.createElement('div') });
    const el = elements.cupTop;
    expect(el.textContent).toContain(PART_LABELS.cupTop.index);
    expect(el.textContent).toContain(PART_LABELS.cupTop.name);
    expect(el.dataset.part).toBe('cupTop');
  });

  it('keeps label text selectable, which is the reason this layer is real DOM', () => {
    // three's CSS3DObject constructor sets userSelect:'none' inline; if that is ever
    // left in place the accessibility payoff of CSS3D over a canvas overlay is lost.
    const { parts } = scene();
    const { elements } = createLabels({ parts, container: document.createElement('div'), state: { labelOpacity: 1 } });
    expect(elements.cupTop.style.userSelect).toBe('text');
  });

  it('mounts its renderer into the given container', () => {
    const { parts } = scene();
    const container = document.createElement('div');
    createLabels({ parts, container });
    expect(container.children.length).toBeGreaterThan(0);
  });
});

describe('label opacity', () => {
  it('hides labels while the object is face-on, when they would all project onto one point', () => {
    const { parts } = scene();
    const state = { spinRate: 1, labelOpacity: 0 };
    const labels = createLabels({ parts, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.opacity).toBe('0');
    expect(labels.elements.cupTop.style.visibility).toBe('hidden');
  });

  it('shows labels once anime.js raises the scalar it owns', () => {
    const { parts } = scene();
    const state = { spinRate: 1, labelOpacity: 1 };
    const labels = createLabels({ parts, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.opacity).toBe('1');
    expect(labels.elements.cupTop.style.visibility).toBe('visible');
  });

  it('never removes hidden labels from the accessibility tree', () => {
    const { parts } = scene();
    const state = { spinRate: 1, labelOpacity: 0 };
    const labels = createLabels({ parts, container: document.createElement('div'), state });
    labels.render({}, {});
    expect(labels.elements.cupTop.style.display).not.toBe('none');
    expect(labels.elements.cupTop.textContent.length).toBeGreaterThan(0);
  });
});
