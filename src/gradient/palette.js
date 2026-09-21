/**
 * The gradient's three stops, dark to light. The shader maps its ribbon function through
 * these in order, so the ordering is load-bearing rather than decorative — a test pins it.
 *
 * Violet rather than the reference's blue: the club is Violet Diabolo, and a blue
 * backdrop would make the page's own accent a foreign colour on its own site.
 *
 * Components are 0-1 because that is what `gl.uniform3f` wants; the contrast guard
 * converts to 0-255 itself.
 *
 * WHY THESE VALUES AND NOT BRIGHTER ONES. Every colour the shader can emit is a
 * component-wise mix along deep -> mid -> bright, and each stop is component-wise
 * greater than the one below it, so `bright` is a hard ceiling on the gradient's
 * luminance — not a sampled maximum but an arithmetic one. That ceiling is the page's
 * whole contrast strategy: at WCAG relative luminance 0.130, --ink (#f5f2fa) measures
 * 5.26:1 against the brightest pixel the gradient can ever draw, so body text sits on
 * the bare gradient at AA with margin and the hero needs no plate, no scrim and no
 * shader vignette to rescue it.
 *
 * The stops this replaces could not offer that. Their `bright`, a pale lilac at
 * (0.839, 0.706, 1.0), measures luminance 0.542 — 1.60:1 under --ink, which is text you
 * cannot read, and no amount of tuning the band section fixes a ceiling that high.
 *
 * `bright` is a SATURATED violet rather than a pale one on purpose. Held to the same
 * luminance budget, saturation is what buys apparent brightness: rgb(128, 36, 255) has a
 * blue channel at maximum and reads as a lit ribbon against rgb(8, 6, 13), while a
 * desaturated colour of the same luminance would read as grey. That is the whole trade —
 * the ribbons are vivid instead of pale, and in exchange text is legible everywhere.
 *
 * `deep` is exactly --stage (#08060d, base.css), so the gradient's ground and the page's
 * own ground are the same black and a solid panel's edge does not show against the
 * canvas behind it.
 */
export const PALETTE = Object.freeze({
  deep: Object.freeze([0.031, 0.024, 0.051]),
  mid: Object.freeze([0.322, 0.118, 0.620]),
  bright: Object.freeze([0.502, 0.141, 1.0]),
});
