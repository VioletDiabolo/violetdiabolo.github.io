import { PALETTE } from './palette.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shader.js';

/** Above this the ribbons move fast enough to read as flicker rather than motion. */
const MAX_VELOCITY = 4;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader failed to compile: ${log}`);
  }
  return shader;
}

/**
 * Owns the WebGL state for one fullscreen gradient and nothing else — no scroll
 * knowledge, no DOM beyond the canvas it was handed.
 *
 * Returns null rather than throwing when WebGL is unavailable, so the caller can fall
 * back without a try/catch: content is never gated behind the graphics.
 */
export function createGradient({ canvas, palette = PALETTE }) {
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`program failed to link: ${gl.getProgramInfoLog(program)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);

  // Two triangles covering clip space. This is the whole geometry.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uTime = u('u_time');
  const uResolution = u('u_resolution');
  const uVelocity = u('u_velocity');

  gl.uniform3f(u('u_deep'), ...palette.deep);
  gl.uniform3f(u('u_mid'), ...palette.mid);
  gl.uniform3f(u('u_bright'), ...palette.bright);

  // This module owns time. Nothing else writes it, and no setter is exposed.
  let time = 0;
  let velocity = 0;
  let width = canvas.width;
  let height = canvas.height;

  return {
    render(delta = 0) {
      time += delta;
      gl.uniform1f(uTime, time);
      gl.uniform1f(uVelocity, velocity);
      gl.uniform2f(uResolution, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    setVelocity(v) {
      velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v || 0));
    },
    resize(w, h) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    },
    dispose() {
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    },
  };
}
