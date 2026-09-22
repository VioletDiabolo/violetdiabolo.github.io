/**
 * How much the gradient is allowed to cost.
 *
 * Both numbers exist because the client's stated requirement was that the background
 * must not lag. The gradient's motion is slow, so neither is visible as a compromise.
 */

/** The gradient drifts; 30 reads identically to 60 and halves the frames drawn. */
export const TARGET_FPS = 30;

/** Fragment work scales with pixel count, so half the linear resolution is a quarter the work. */
export const RENDER_SCALE = 0.5;

/**
 * Returns a function that accumulates elapsed time and reports how much to render
 * with — 0 meaning "skip this frame".
 *
 * It hands back the ACCUMULATED delta rather than the last one, so the animation
 * advances at real time rather than at the fraction of it that survived the cap.
 */
export function createFrameCap(fps = TARGET_FPS) {
  const interval = 1 / fps;
  let accumulated = 0;
  return function tick(delta) {
    accumulated += delta;
    if (accumulated < interval) return 0;
    const elapsed = accumulated;
    accumulated = 0;
    return elapsed;
  };
}

/**
 * Framebuffer size for a canvas of the given CSS size.
 *
 * Clamped at 1 so a non-retina screen renders one framebuffer pixel per CSS pixel:
 * going below that would look soft and save nothing worth having.
 */
export function renderSize(cssWidth, cssHeight, dpr = 1) {
  const scale = Math.max(1, dpr * RENDER_SCALE);
  return { width: Math.round(cssWidth * scale), height: Math.round(cssHeight * scale) };
}
