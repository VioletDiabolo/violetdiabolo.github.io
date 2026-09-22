/**
 * The verdict a frame-cost measurement gets.
 *
 * WHY THIS IS A MODULE AND NOT THREE EXPRESSIONS IN check-shader.html.
 *
 * The guard that was supposed to keep the shader bench honest was a string grep: it
 * asserted that the page contained the text `controlIsNegligible` and the text
 * `body(false)`. Both are true of a bench that measures a control, prints it, and then
 * reports a pass anyway -- which is the exact failure the control exists to catch. A
 * grep cannot tell a number that is USED from a number that is merely PRESENT.
 *
 * So the decision lives here, as a function the bench calls and the suite can actually
 * run. `npx vitest run` now falsifies it directly: feed it a control as large as its
 * busy pass and `ok` must be false even though ms/frame is far under budget.
 *
 * WHAT THE CONTROL IS FOR. An earlier measurement on this branch reported 0.0002
 * ms/frame. That was the cost of QUEUEING a draw call, not of drawing anything: the
 * loop returned before the GPU had done the work. The control runs the identical loop
 * with no `drawArrays`, so whatever it returns is the floor of what the measurement can
 * see. If the busy pass is not comfortably above that floor, the difference between
 * them is noise and `msPerFrame` means nothing -- no matter how small it is.
 */

/** The per-frame budget from Task 3. Not this module's to change. */
export const FRAME_BUDGET_MS = 4;

/**
 * The control has to be well under the busy pass for the difference to be signal. A
 * quarter is the threshold the bench has used since the control was added; it is a
 * judgement, but it is a judgement in one place instead of inline in a template string.
 */
export const CONTROL_CEILING = 0.25;

/**
 * @param {{busyTotalMs: number, controlTotalMs: number, draws: number, budgetMs?: number}} pass
 * @returns {{msPerFrame: number, controlMsPerFrame: number, controlIsNegligible: boolean,
 *            ok: boolean, message: string}}
 *
 * Throws on a measurement that cannot mean anything rather than returning NaN and
 * letting it be printed as a result -- the same call `worstCase()` makes in
 * src/gradient/contrast.js, and for the same reason: a reported number that is quietly
 * garbage is worse than no number at all.
 */
export function costVerdict({ busyTotalMs, controlTotalMs, draws, budgetMs = FRAME_BUDGET_MS }) {
  for (const [name, value] of [['busyTotalMs', busyTotalMs], ['controlTotalMs', controlTotalMs],
    ['draws', draws], ['budgetMs', budgetMs]]) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `costVerdict got a non-finite ${name} (${value}); refusing to report a verdict on it`,
      );
    }
  }
  if (draws <= 0) throw new Error('costVerdict needs at least one draw per pass');
  if (budgetMs <= 0) throw new Error('costVerdict needs a positive budget');

  const msPerFrame = (busyTotalMs - controlTotalMs) / draws;
  const controlMsPerFrame = controlTotalMs / draws;
  const controlIsNegligible = controlTotalMs < busyTotalMs * CONTROL_CEILING;
  const underBudget = msPerFrame < budgetMs;
  // Both, and in this order: a pass needs a measurement that MEANS something before it
  // needs that measurement to be small. An `ok` that ignored the control would be the
  // 0.0002 ms/frame reading all over again.
  const ok = controlIsNegligible && underBudget;

  let message;
  if (!controlIsNegligible) {
    message = 'WARNING: the control is not far below the busy pass. This measured queueing, '
      + 'not drawing — treat ms/frame as meaningless.';
  } else if (!underBudget) {
    message = `OVER BUDGET: ${msPerFrame.toFixed(4)} ms/frame against ${budgetMs.toFixed(1)}.`;
  } else {
    message = 'control is well under the busy pass, so the busy pass measured real work.';
  }

  return { msPerFrame, controlMsPerFrame, controlIsNegligible, ok, message };
}
