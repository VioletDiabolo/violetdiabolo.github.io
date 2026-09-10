// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HOME } from '../src/diabolo/build.js';

// A minimal stand-in for createStage()'s return value. Real HOME part ids/shape (plain
// { position: { y } } is all entrance.js touches), but none of three.js: jsdom's canvas
// has no real WebGL context, so the actual createStage would throw trying to build a
// WebGLRenderer from it. Stubbing src/diabolo/stage.js sidesteps that entirely and lets
// this test focus on main.js's own wiring instead of the renderer.
function stubStage() {
  const parts = {};
  for (const id of Object.keys(HOME)) parts[id] = { position: { y: 0 } };
  return {
    parts,
    tilt: { rotation: { x: 0 } },
    state: { spinRate: 1 },
    render: vi.fn(),
    resize: vi.fn(),
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
  });
});
