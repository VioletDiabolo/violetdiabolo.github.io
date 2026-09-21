// Shared by gradient.dom.test.js and main.dom.test.js: a WebGL context recording enough
// to assert plumbing without a GPU. See createGradient (src/gradient/gradient.js) for
// the exact sequence of gl calls this stubs.

/**
 * A WebGL context recording enough to assert plumbing without a GPU.
 *
 * `failShaderCompile` fails only the *second* shader compiled — createGradient
 * compiles the vertex shader then the fragment shader, so this reproduces "a sibling
 * already succeeded, then this one failed," the exact leak scenario under test.
 * `failProgramLink` lets both shaders compile fine and fails linkProgram instead.
 * Defaults reproduce the original always-succeeds stub for the rest of the suite.
 */
export function stubGL({ failShaderCompile = false, failProgramLink = false } = {}) {
  const calls = { uniforms: {}, draws: 0, viewports: 0, shaders: [], created: [], deleted: [] };
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
    // Recorded (not a no-op) because main.dom.test.js's resize-wiring tests need to
    // observe that a resize actually reached the GL layer, on an existing DOM canvas
    // where creating a fresh withCanvas() isn't an option.
    viewport: () => { calls.viewports += 1; },
    drawArrays: () => { calls.draws += 1; },
    deleteShader: () => calls.deleted.push('shader'),
    deleteProgram: () => calls.deleted.push('program'),
    deleteBuffer: () => calls.deleted.push('buffer'),
  };
}

/**
 * A fresh <canvas> wired to a fresh stub GL context.
 *
 * For a test that owns its own canvas element. main.dom.test.js instead drives the
 * #gradient canvas main.js itself looks up via document.getElementById, so it calls
 * stubGL() directly against a getContext spy rather than using this.
 */
export const withCanvas = (glOptions) => {
  const gl = stubGL(glOptions);
  const canvas = document.createElement('canvas');
  canvas.getContext = () => gl;
  return { gl, canvas };
};
