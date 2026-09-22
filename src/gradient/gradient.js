import { PALETTE } from './palette.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shader.js';

/**
 * How fast the ribbons drift with nobody touching the page, in shader time units per
 * second. The shader's own warp coefficients (0.055 and 0.031, src/gradient/shader.js)
 * set the RATIO between its two octaves; this sets the overall pace, so raising it
 * speeds both up together and leaves their counter-drift intact.
 *
 * 3, not the 1 this started at. At 1 the warp field advanced 0.055 units per second
 * against a noise feature roughly 1.25 units across -- one traversal every 23 seconds,
 * which is slow enough that the picture reads as a still image rather than a slow one.
 * That is the "it sticks to a certain shape" the client reported. At 3 a ribbon makes a
 * visible swing in about 3 seconds.
 */
export const RESTING_RATE = 3;

/**
 * Scrolling ACCELERATES the drift: the boost is a multiplier on the rate above, never
 * an offset added to the clock.
 *
 * This is the second half of the same client report, and the distinction is the whole
 * bug. The shader used to read `t = u_time + u_velocity` with u_velocity clamped to
 * +/-4 -- so any real scroll (Lenis reports 2 to 273 px/frame; a 2500px anchor jump
 * peaks at 273) pinned that term at the clamp instantly. The picture JUMPED four
 * seconds forward, held there for the whole scroll, and snapped back on release: a
 * step function wearing an acceleration's name. Multiplying the rate instead means
 * time only ever moves forward, and faster.
 *
 * MAX_BOOST is 3, so the fastest scroll runs at 4x RESTING_RATE. Above that the ribbons
 * cross the frame quickly enough to read as flicker rather than motion, which is the
 * accessibility limit the old clamp was reaching for and the one thing worth keeping
 * from it.
 */
export const MAX_BOOST = 3;

/** Lenis velocity, in px/frame, at which the boost saturates. Measured: an unhurried
 *  wheel scroll sits near 10, a brisk one near 60, a nav-anchor jump peaks near 273. */
export const SCROLL_REFERENCE = 60;

/** Seconds for the boost to cover ~63% of the distance to its target, in both
 *  directions -- the ramp when a scroll starts and the fade when it stops. */
const BOOST_TAU = 0.35;

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
 * Returns null rather than throwing on any failure — no WebGL context, a shader that
 * fails to compile, or a program that fails to link — so the caller can fall back
 * without a try/catch: content is never gated behind the graphics. Every GL object
 * created before the failure is deleted before returning, so a failed attempt leaves
 * nothing orphaned on the context. Compile and link failures are still reported via
 * `console.error` with the driver's info log, so a bad shader stays loud in the
 * console even though it is quiet to the caller.
 */
export function createGradient({ canvas, palette = PALETTE }) {
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return null;

  let vs;
  let fs;
  let program;
  try {
    vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program failed to link: ${gl.getProgramInfoLog(program)}`);
    }
  } catch (err) {
    // Loud on purpose: a swallowed compile/link error would make the next shader
    // edit (Task 7's job) miserable to debug.
    console.error('[gradient]', err.message);
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    if (program) gl.deleteProgram(program);
    return null;
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

  gl.uniform3f(u('u_deep'), ...palette.deep);
  gl.uniform3f(u('u_mid'), ...palette.mid);
  gl.uniform3f(u('u_bright'), ...palette.bright);

  // This module owns time. Nothing else writes it, and no setter is exposed.
  let time = 0;
  // The smoothed boost, and the value it is chasing. setVelocity only ever writes the
  // target; render owns both the chase and the decay, so there is still exactly one
  // place where the clock's rate is decided.
  let boost = 0;
  let boostTarget = 0;
  let width = canvas.width;
  let height = canvas.height;

  return {
    // Assumes the useProgram/buffer/attribute state bound above stays current for
    // this module's lifetime — true only because each instance owns its canvas
    // exclusively; a second instance sharing one canvas would need to re-bind.
    render(delta = 0) {
      // One exponential, applied twice. `boost` chases `boostTarget` so a flick ramps
      // instead of snapping; `boostTarget` decays toward 0 because scroll events stop
      // arriving the moment the scroll does, and a target left at its last reported
      // value would hold the gradient at speed forever. Lenis fires on every frame it
      // is scrolling, which re-raises the target faster than this drains it.
      const k = 1 - Math.exp(-delta / BOOST_TAU);
      boost += (boostTarget - boost) * k;
      boostTarget -= boostTarget * k;

      // boost is never negative, so the multiplier is never below 1: scrolling can only
      // ever speed the drift up. It cannot slow, stop or reverse it.
      time += delta * RESTING_RATE * (1 + boost);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uResolution, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    /** Scroll speed, signed, as Lenis reports it. Direction is discarded deliberately —
     *  scrolling up accelerates the drift exactly as scrolling down does. */
    setVelocity(v) {
      const speed = Math.abs(Number(v)) || 0;
      boostTarget = MAX_BOOST * Math.min(1, speed / SCROLL_REFERENCE);
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
