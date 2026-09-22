// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  createGradient, RESTING_RATE, MAX_BOOST, SCROLL_REFERENCE,
} from '../src/gradient/gradient.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../src/gradient/shader.js';
import { withCanvas } from './helpers/webgl-stub.js';

describe('createGradient', () => {
  it('compiles both shaders', () => {
    const { gl, canvas } = withCanvas();
    createGradient({ canvas });
    expect(gl.calls.shaders).toContain(VERTEX_SHADER);
    expect(gl.calls.shaders).toContain(FRAGMENT_SHADER);
  });

  it('draws one quad per render, not one per anything else', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.render(0.016);
    g.render(0.016);
    expect(gl.calls.draws).toBe(2);
  });

  it('advances u_time at the resting rate when nothing is scrolling', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.render(0.5);
    expect(gl.calls.uniforms.u_time).toBeCloseTo(0.5 * RESTING_RATE, 6);
    g.render(0.25);
    expect(gl.calls.uniforms.u_time).toBeCloseTo(0.75 * RESTING_RATE, 6);
  });

  it('owns u_time alone — nothing else can set it', () => {
    // The deleted choreography's most valuable invariant, carried forward: one owner
    // per animated value. A second writer is how such a system desynchronises.
    const g = createGradient({ canvas: withCanvas().canvas });
    expect(g.setTime).toBeUndefined();
  });

  // ---- Scroll acceleration -------------------------------------------------
  //
  // The client's report was that scrolling did not accelerate the gradient: it "sticks
  // to a certain shape". It did not, and could not — the shader read
  // `t = u_time + u_velocity`, which is an OFFSET. Every test below is written to fail
  // against that model, not merely to pass against this one: an offset leaves u_time
  // advancing at exactly the resting rate no matter what setVelocity is handed, and
  // snaps the picture back when the scroll ends.

  /** One frame's worth of u_time, so the tests can compare RATES rather than totals. */
  const advanceOver = (gl, g, delta) => {
    const before = gl.calls.uniforms.u_time ?? 0;
    g.render(delta);
    return gl.calls.uniforms.u_time - before;
  };

  it('accelerates the clock while scrolling, rather than offsetting it', () => {
    const still = withCanvas();
    const stillG = createGradient({ canvas: still.canvas });

    const scrolled = withCanvas();
    const scrolledG = createGradient({ canvas: scrolled.canvas });
    scrolledG.setVelocity(SCROLL_REFERENCE);

    const restAdvance = advanceOver(still.gl, stillG, 0.1);
    const scrollAdvance = advanceOver(scrolled.gl, scrolledG, 0.1);

    // The offset model fails here: it advanced u_time by the delta either way and put
    // the velocity in a separate uniform, so these two numbers were identical.
    expect(scrollAdvance).toBeGreaterThan(restAdvance);
    expect(restAdvance).toBeCloseTo(0.1 * RESTING_RATE, 6);
  });

  it('speeds up for a scroll in either direction', () => {
    const up = withCanvas();
    const upG = createGradient({ canvas: up.canvas });
    upG.setVelocity(-SCROLL_REFERENCE);

    const down = withCanvas();
    const downG = createGradient({ canvas: down.canvas });
    downG.setVelocity(SCROLL_REFERENCE);

    expect(advanceOver(up.gl, upG, 0.1)).toBeCloseTo(advanceOver(down.gl, downG, 0.1), 6);
  });

  it('never runs the clock backwards, however hard the page is flung', () => {
    // The offset model DID run backwards: u_velocity fell from its clamp to 0 when the
    // scroll stopped, taking `t` with it, which is the snap-back the client saw.
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    let previous = 0;
    for (let i = 0; i < 40; i++) {
      g.setVelocity(i < 20 ? 9999 * (i % 2 ? 1 : -1) : 0);
      g.render(0.05);
      expect(gl.calls.uniforms.u_time).toBeGreaterThan(previous);
      previous = gl.calls.uniforms.u_time;
    }
  });

  it('caps the boost, so a flung scroll cannot strobe the gradient', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    const ceiling = 0.05 * RESTING_RATE * (1 + MAX_BOOST);
    for (let i = 0; i < 60; i++) {
      g.setVelocity(9e9);
      expect(advanceOver(gl, g, 0.05)).toBeLessThanOrEqual(ceiling + 1e-9);
    }
  });

  it('fades back to the resting rate once the scroll stops', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });

    for (let i = 0; i < 30; i++) { g.setVelocity(SCROLL_REFERENCE * 4); g.render(0.05); }
    const whileScrolling = advanceOver(gl, g, 0.05);

    // No further setVelocity: Lenis stops reporting the instant the scroll settles, so
    // a target left at its last value would hold the gradient at speed for good.
    for (let i = 0; i < 60; i++) g.render(0.05);
    const afterStopping = advanceOver(gl, g, 0.05);

    const resting = 0.05 * RESTING_RATE;
    expect(whileScrolling).toBeGreaterThan(afterStopping);
    // Three seconds after the last report, within 1% of resting — and still above it,
    // because the boost only ever decays toward zero and never past it.
    expect(afterStopping / resting).toBeLessThan(1.01);
    expect(afterStopping).toBeGreaterThanOrEqual(resting);
  });

  it('has no velocity uniform left to write', () => {
    // Deleted rather than left at 0: a uniform nothing reads is the kind of inert
    // constant this project has shipped before.
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(3);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeUndefined();
    expect(FRAGMENT_SHADER).not.toContain('u_velocity');
  });

  it('reports the resolution it was resized to', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.resize(800, 600);
    g.render(0.016);
    expect(gl.calls.uniforms.u_resolution).toEqual([800, 600]);
  });

  it('releases every GPU object it created', () => {
    const { gl, canvas } = withCanvas();
    createGradient({ canvas }).dispose();
    expect(gl.calls.deleted).toEqual(expect.arrayContaining(['program', 'buffer']));
  });

  it('returns null rather than throwing when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = () => null;
    expect(createGradient({ canvas })).toBeNull();
  });

  it('returns null and deletes every created object when a shader fails to compile', () => {
    const { gl, canvas } = withCanvas({ failShaderCompile: true });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = createGradient({ canvas });

    expect(result).toBeNull();
    // The vertex shader compiled fine before the fragment shader failed — both must
    // still be deleted; that sibling is exactly the leak this guards against.
    expect(gl.calls.created.filter((c) => c === 'shader')).toHaveLength(2);
    expect(gl.calls.deleted.filter((c) => c === 'shader')).toHaveLength(2);
    // Link never ran, so no program or buffer was ever created — nothing to leak there.
    expect(gl.calls.created).not.toContain('program');
    expect(gl.calls.created).not.toContain('buffer');

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0].join(' ')).toContain('shader boom');
    errorSpy.mockRestore();
  });

  it('returns null and deletes every created object when the program fails to link', () => {
    const { gl, canvas } = withCanvas({ failProgramLink: true });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = createGradient({ canvas });

    expect(result).toBeNull();
    // Both shaders compiled fine and the program was created before linking failed —
    // all three must be deleted.
    expect(gl.calls.created.filter((c) => c === 'shader')).toHaveLength(2);
    expect(gl.calls.deleted.filter((c) => c === 'shader')).toHaveLength(2);
    expect(gl.calls.created.filter((c) => c === 'program')).toHaveLength(1);
    expect(gl.calls.deleted.filter((c) => c === 'program')).toHaveLength(1);
    // The quad buffer is only created after a successful link — nothing to leak there.
    expect(gl.calls.created).not.toContain('buffer');

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0].join(' ')).toContain('link boom');
    errorSpy.mockRestore();
  });
});
