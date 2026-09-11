// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HOME } from '../src/diabolo/build.js';
// Read once, from the real module, before it gets wholesale-mocked below — so the
// mock re-exports the same camera constants entrance.js and choreography.js import,
// instead of a second, driftable copy of the numbers.
import { CAMERA_FOV, CAMERA_NEAR_Z, CAMERA_FAR_Z } from '../src/diabolo/stage.js';
import { PROFILE_X } from '../src/scroll/choreography.js';

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
    // would throw the moment boot() wires the labels up.
    tilt: { rotation: { x: 0 }, add: vi.fn() },
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
      '<div id="stage"><canvas id="renderer"></canvas><div id="spill-layer"></div><div id="label-layer"></div></div>' +
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
      '<div id="stage"><canvas id="renderer"></canvas><div id="spill-layer"></div><div id="label-layer"></div></div>' +
      '<main id="content"></main>';

    await import('../src/main.js');

    expect(window.__vd.stage.state.labelOpacity).toBe(1);
    expect(window.__vd.stage.tilt.rotation.x).toBe(PROFILE_X);
  });
});
