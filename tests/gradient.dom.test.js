// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createGradient } from '../src/gradient/gradient.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../src/gradient/shader.js';

/**
 * A WebGL context recording enough to assert plumbing without a GPU.
 *
 * `failShaderCompile` fails only the *second* shader compiled — createGradient
 * compiles the vertex shader then the fragment shader, so this reproduces "a sibling
 * already succeeded, then this one failed," the exact leak scenario under test.
 * `failProgramLink` lets both shaders compile fine and fails linkProgram instead.
 * Defaults reproduce the original always-succeeds stub for the rest of the suite.
 */
function stubGL({ failShaderCompile = false, failProgramLink = false } = {}) {
  const calls = { uniforms: {}, draws: 0, shaders: [], created: [], deleted: [] };
  let shaderCompileCount = 0;
  return {
    calls,
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
    createShader: () => { calls.created.push('shader'); return {}; },
    shaderSource: (s, src) => calls.shaders.push(src),
    compileShader: () => { shaderCompileCount += 1; },
    getShaderParameter: () => !(failShaderCompile && shaderCompileCount === 2),
    getShaderInfoLog: () => 'shader boom',
    createProgram: () => { calls.created.push('program'); return {}; },
    attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => !failProgramLink,
    getProgramInfoLog: () => 'link boom', useProgram: () => {},
    createBuffer: () => { calls.created.push('buffer'); return {}; },
    bindBuffer: () => {}, bufferData: () => {},
    getAttribLocation: () => 0, enableVertexAttribArray: () => {}, vertexAttribPointer: () => {},
    getUniformLocation: (p, name) => ({ name }),
    uniform1f: (l, v) => { calls.uniforms[l.name] = v; },
    uniform2f: (l, a, b) => { calls.uniforms[l.name] = [a, b]; },
    uniform3f: (l, a, b, c) => { calls.uniforms[l.name] = [a, b, c]; },
    viewport: () => {},
    drawArrays: () => { calls.draws += 1; },
    deleteShader: () => calls.deleted.push('shader'),
    deleteProgram: () => calls.deleted.push('program'),
    deleteBuffer: () => calls.deleted.push('buffer'),
  };
}

const withCanvas = (glOptions) => {
  const gl = stubGL(glOptions);
  const canvas = document.createElement('canvas');
  canvas.getContext = () => gl;
  return { gl, canvas };
};

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

  it('advances u_time by the delta it is given', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.render(0.5);
    expect(gl.calls.uniforms.u_time).toBeCloseTo(0.5, 6);
    g.render(0.25);
    expect(gl.calls.uniforms.u_time).toBeCloseTo(0.75, 6);
  });

  it('owns u_time alone — nothing else can set it', () => {
    // The deleted choreography's most valuable invariant, carried forward: one owner
    // per animated value. A second writer is how such a system desynchronises.
    const g = createGradient({ canvas: withCanvas().canvas });
    expect(g.setTime).toBeUndefined();
  });

  it('passes the velocity it was given to the shader', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(2.5);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeCloseTo(2.5, 6);
  });

  it('clamps velocity, so a flung scroll cannot strobe the gradient', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(9999);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeLessThanOrEqual(4);
  });

  it('clamps a negative fling too', () => {
    const { gl, canvas } = withCanvas();
    const g = createGradient({ canvas });
    g.setVelocity(-9999);
    g.render(0.016);
    expect(gl.calls.uniforms.u_velocity).toBeGreaterThanOrEqual(-4);
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
