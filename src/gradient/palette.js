/**
 * The gradient's three stops, dark to light. The shader maps its noise through these
 * in order, so the ordering is load-bearing rather than decorative — a test pins it.
 *
 * Violet rather than the reference's blue: the club is Violet Diabolo, and a blue
 * backdrop would make the page's own accent a foreign colour on its own site.
 *
 * Components are 0-1 because that is what `gl.uniform3f` wants; the contrast guard
 * converts to 0-255 itself.
 */
export const PALETTE = Object.freeze({
  deep: Object.freeze([0.031, 0.024, 0.047]),
  mid: Object.freeze([0.478, 0.271, 0.800]),
  bright: Object.freeze([0.839, 0.706, 1.0]),
});
