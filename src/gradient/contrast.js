/**
 * Contrast arithmetic for text over a background that MOVES.
 *
 * Imported only by tests and by the dev-time probe in the verification task, never by
 * `main.js` — so Vite never bundles it and visitors never pay for it. A test asserts that.
 *
 * The moving part is why `worstCase` exists: the gradient's luminance under any given
 * point varies over time, so a single-frame reading says nothing about whether the
 * text was ever readable.
 */

/** Samples across one noise cycle. Twelve is enough that a bright band cannot slip between them. */
export const TIME_STEPS = 12;

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance. Components are 0-255. */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The lowest contrast the text reaches against any sampled frame of the background,
 * and which frame that was.
 *
 * Deliberately not an average: a background that is dark for eleven frames and bright
 * for one still fails the reader on that frame.
 *
 * Throws on a non-finite ratio (NaN or Infinity) rather than skipping it. `r < ratio`
 * alone would let a malformed sample — a negative or NaN component from a float
 * framebuffer readback, or an RGB/RGBA-length mismatch destructuring to `undefined` —
 * silently lose the comparison and vanish from consideration, which is worse than
 * reporting nothing: it reports a *result*, just one that quietly excludes the corrupted
 * frame instead of flagging it.
 */
export function worstCase(backgroundSamples, textRgb) {
  if (!backgroundSamples?.length) {
    throw new Error('worstCase needs at least one background sample');
  }
  let ratio = Infinity;
  let index = -1;
  backgroundSamples.forEach((sample, i) => {
    const r = contrastRatio(sample, textRgb);
    if (!Number.isFinite(r)) {
      throw new Error(
        `worstCase got a non-finite contrast ratio at sample index ${i}; refusing to ` +
        'silently skip a malformed background sample',
      );
    }
    if (r < ratio) {
      ratio = r;
      index = i;
    }
  });
  return { ratio, index };
}
