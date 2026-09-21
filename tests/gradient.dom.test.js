// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createGradient } from '../src/gradient/gradient.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../src/gradient/shader.js';

/** A WebGL context recording enough to assert plumbing without a GPU. */
function stubGL() {
  const calls = { uniforms: {}, draws: 0, shaders: [], deleted: [] };
  return {
    calls,
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
    createShader: () => ({}), shaderSource: (s, src) => calls.shaders.push(src),
    compileShader: () => {}, getShaderParameter: () => true, getShaderInfoLog: () => '',
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => true, getProgramInfoLog: () => '', useProgram: () => {},
    createBuffer: () => ({}), bindBuffer: () => {}, bufferData: () => {},
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

const withCanvas = () => {
  const gl = stubGL();
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
});
