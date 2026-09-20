// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HOME } from '../src/diabolo/build.js';
// Read once, from the real module, before it gets wholesale-mocked below — so the
// mock re-exports the same camera constants entrance.js and choreography.js import,
// instead of a second, driftable copy of the numbers.
import { CAMERA_FOV, CAMERA_NEAR_Z, CAMERA_FAR_Z } from '../src/diabolo/stage.js';
import { PROFILE_X, ROOMS, HERO_ID } from '../src/scroll/choreography.js';
import { SECTION_FOR_ROOM } from '../src/ui/layout.js';

// A minimal stand-in for createStage()'s return value. Real HOME part ids/shape (plain
// { position: { y }, add() } is all entrance.js and labels.js touch — add() is a no-op
// since createLabels() calls parts[id].add(sprite) to mount its CSS3DSprite, but this
// test only cares that boot() completes, not where the sprite ends up), but none of
// three.js: jsdom's canvas has no real WebGL context, so the actual createStage would
// throw trying to build a WebGLRenderer from it. Stubbing src/diabolo/stage.js sidesteps
// that entirely and lets this test focus on main.js's own wiring instead of the renderer.
function stubStage() {
  const parts = {};
  for (const id of Object.keys(HOME)) parts[id] = { position: { y: 0 }, add: vi.fn() };
  return {
    parts,
    // createLabels() (real, not mocked, in this test) attaches a labelRoot group to
    // `tilt` via tilt.add() -- see diabolo/labels.js. A plain object without `add`
    // would throw the moment boot() wires the labels up. `position` is here because
    // entrance.js seeds tilt.position.x/y (to the arrival act's target) alongside
    // tilt.rotation.x -- a real Three.js Group always has both.
    tilt: { rotation: { x: 0 }, position: { x: 0, y: 0 }, add: vi.fn() },
    state: { spinRate: 1 },
    camera: { position: { z: 0 } },
    render: vi.fn(),
    resize: vi.fn(),
    // main.js calls this once, right after createStage, to register the CSS3D label
    // overlay (see stage.js's addOverlay). A no-op here is enough: labels rendering is
    // covered by tests/labels.dom.test.js, not this file.
    addOverlay: vi.fn(),
  };
}

describe('reduced motion boot path', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  it('never attaches a scroll timeline when nothing will repaint the canvas', async () => {
    // Reduced motion means no render loop, so a scroll timeline would mutate the scene
    // against a canvas that never redraws. supportsWebGL is stubbed true purely to get
    // past the unrelated WebGL-unsupported early return in boot() and reach the motion
    // branch under test; prefersReducedMotion is the one that actually matters here.
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => true,
    }));
    // createStage is stubbed for the reason in the comment above; resolveQualityTier and
    // readSignals just need to not throw — their actual values are irrelevant to this path.
    vi.doMock('../src/diabolo/stage.js', () => ({
      resolveQualityTier: () => 'base',
      readSignals: () => ({}),
      createStage: () => stubStage(),
      CAMERA_FOV,
      CAMERA_NEAR_Z,
      CAMERA_FAR_Z,
    }));

    document.body.innerHTML =
      '<div id="stage"><canvas id="renderer"></canvas><div id="label-layer"></div></div>' +
      '<main id="content"></main>';

    await import('../src/main.js');

    // Confirms the reduced-motion branch was actually taken, not skipped.
    expect(document.documentElement.dataset.stage).toBe('static');
    // The single manual paint of the resolved (assembled, face-on) frame.
    expect(window.__vd.stage.render).toHaveBeenCalledTimes(1);
    expect(window.__vd.stage.render).toHaveBeenCalledWith(0);
    // No lifecycle exists to repaint, so a scroll timeline must never be attached: doing
    // so would mutate part positions and tilt.rotation.x against a canvas nothing ever
    // redraws again, permanently diverging the scene data from the pixels on screen.
    expect(window.__vd.lifecycle).toBeNull();
    expect(window.__vd?.choreography ?? null).toBeNull();
    // addOverlay was stubbed as a bare vi.fn() and never checked: main.js could stop
    // registering the CSS3D label layer and this test would stay green (labels.js is a
    // real, unmocked module in this file, so it would simply render nothing and, after
    // stage.dispose()'s own fix, never leak either — nothing would fail). Assert the
    // registration happens, with the right object: createLabels()'s return shape is the
    // one with `sprites`.
    expect(window.__vd.stage.addOverlay).toHaveBeenCalledTimes(1);
    const registered = window.__vd.stage.addOverlay.mock.calls.map(([overlay]) => overlay);
    const labelsOverlay = registered.find((o) => 'sprites' in o);
    expect(labelsOverlay, 'the labels overlay was never registered').toBeDefined();
  });

  it('shows the object in profile with labels visible, rather than face-on with labels hidden', async () => {
    // A static face-on view stacks every part on the camera axis and hides every label:
    // labelOpacity starts at 0, and reduced motion never attaches the scroll timeline that
    // would ever raise it (see the previous test), so face-on would leave the labels
    // permanently absent from the accessibility tree. Profile with labels visible is the
    // readable still of the same diagram.
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => true,
    }));
    vi.doMock('../src/diabolo/stage.js', () => ({
      resolveQualityTier: () => 'base',
      readSignals: () => ({}),
      createStage: () => stubStage(),
      CAMERA_FOV,
      CAMERA_NEAR_Z,
      CAMERA_FAR_Z,
    }));

    document.body.innerHTML =
      '<div id="stage"><canvas id="renderer"></canvas><div id="label-layer"></div></div>' +
      '<main id="content"></main>';

    await import('../src/main.js');

    expect(window.__vd.stage.state.labelOpacity).toBe(1);
    expect(window.__vd.stage.tilt.rotation.x).toBe(PROFILE_X);
  });

  it('reads every section against the one place the object is parked', async () => {
    // The object is frozen here: entrance.skip() leaves it at the hero room's x, at the
    // initial objectOpacity of 1, and no scroll timeline is ever attached to move or fade
    // it (see the first test in this block). Per-room sides describe a journey it never
    // makes -- media would keep the grid room's centred column, whose h2 sections.css
    // holds at top: 66vh, directly over an undimmed object that never leaves. One object
    // position, one reading side.
    vi.doMock('../src/fallback/detect.js', () => ({
      supportsWebGL: () => true,
      prefersReducedMotion: () => true,
    }));
    vi.doMock('../src/diabolo/stage.js', () => ({
      resolveQualityTier: () => 'base',
      readSignals: () => ({}),
      createStage: () => stubStage(),
      CAMERA_FOV,
      CAMERA_NEAR_Z,
      CAMERA_FAR_Z,
    }));

    document.body.innerHTML =
      '<div id="stage"><canvas id="renderer"></canvas><div id="label-layer"></div></div>' +
      '<main id="content"></main>';

    await import('../src/main.js');

    const hero = ROOMS.find((r) => r.id === HERO_ID);
    for (const room of ROOMS) {
      const el = document.querySelector(`[data-section="${SECTION_FOR_ROOM[room.id]}"]`);
      expect(el.dataset.side, SECTION_FOR_ROOM[room.id]).toBe(hero.textSide);
    }
    // The grid room's own side differs, so this is a real re-stamp rather than the
    // default path happening to agree.
    expect(document.querySelector('[data-section="media"]').dataset.side)
      .not.toBe(ROOMS.at(-1).textSide);
  });
});
