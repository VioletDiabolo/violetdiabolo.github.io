import { describe, it, expect } from 'vitest';
import { createFrameCap, renderSize, TARGET_FPS, RENDER_SCALE } from '../src/render/budget.js';

describe('createFrameCap', () => {
  it('skips frames that arrive faster than the target', () => {
    const tick = createFrameCap(30);
    expect(tick(1 / 60)).toBe(0);
  });

  it('renders once the interval has accumulated, and hands over the whole elapsed time', () => {
    // Handing over the accumulated delta rather than the last one is what keeps the
    // animation running at real-time speed instead of at half speed.
    const tick = createFrameCap(30);
    tick(1 / 60);
    expect(tick(1 / 60)).toBeCloseTo(1 / 30, 6);
  });

  it('does not bank time across a render', () => {
    const tick = createFrameCap(30);
    tick(1 / 60);
    tick(1 / 60);
    expect(tick(1 / 60)).toBe(0);
  });

  it('renders immediately on a long frame rather than swallowing it', () => {
    const tick = createFrameCap(30);
    expect(tick(0.5)).toBeCloseTo(0.5, 6);
  });

  it('caps below 60, or it is not a cap', () => {
    expect(TARGET_FPS).toBeLessThan(60);
  });
});

describe('renderSize', () => {
  it('halves the work on a retina screen', () => {
    // dpr 2 x 0.5 = 1, so the framebuffer is one pixel per CSS pixel rather than four.
    expect(renderSize(800, 600, 2)).toEqual({ width: 800, height: 600 });
  });

  it('never renders below one pixel per CSS pixel', () => {
    // 1 x 0.5 would be 0.5, which would look soft on a non-retina screen for no gain.
    expect(renderSize(800, 600, 1)).toEqual({ width: 800, height: 600 });
  });

  it('still scales down on a dpr-3 screen', () => {
    expect(renderSize(800, 600, 3)).toEqual({ width: 1200, height: 900 });
  });

  it('scales by less than the device pixel ratio', () => {
    expect(RENDER_SCALE).toBeLessThan(1);
  });
});
