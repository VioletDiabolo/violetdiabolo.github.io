export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * Ashima's 2D simplex noise, then domain warping, then a few soft ribbons.
 *
 * THE PICTURE THIS DRAWS, because a shader's look cannot be read off its source: a
 * near-black field with two or three bright violet ribbons swinging through it. Most of
 * the frame is the ground. Measured over twelve time steps at 16:10, **at least 85.43 %**
 * of pixels sit below WCAG relative luminance 0.02 in EVERY step (the worst is step 5;
 * the best is 93.24 %), and the median pixel is exactly `u_deep`; see
 * scripts/check-shader.html, which computes that histogram from real framebuffer reads.
 *
 * The worst step, not the pooled figure. Pooling the same run gives a friendlier 89.17 %,
 * and that is the number this comment used to quote — but a pooled average is exactly
 * what hides a single bright frame, which is the only thing the darkness constraint is
 * about. check-shader.html reports per step for that reason and docs/VERIFICATION.md §3
 * certifies the minimum; this now says the same thing they do.
 *
 * The ribbons come from warping: a low-frequency noise displaces the coordinate the
 * ribbon function reads, which turns straight bands into swirls. Raising the warp
 * amplitudes makes it more turbulent; adding bands makes it busier.
 *
 * There is no velocity uniform. Scroll acceleration lives entirely in how fast
 * `u_time` is advanced (src/gradient/gradient.js) rather than in a second term added to
 * it here. The version this replaces did the latter -- `t = u_time + u_velocity`, with
 * u_velocity clamped to +/-4 -- and it could not work: the clamp is four seconds of
 * motion, real scroll velocities saturate it instantly, so the picture jumped forward,
 * froze at the offset for the length of the scroll, and snapped back at the end.
 *
 * The coefficients below (0.055, 0.031) are therefore RATIOS, not speeds. They set how
 * the two warp octaves move relative to each other; the pace they share is
 * RESTING_RATE in gradient.js. Changing one here changes the character of the motion,
 * changing RESTING_RATE changes its speed.
 *
 * TWO DEFECTS THIS REPLACES, both in the constants as first written:
 *
 *   1. The rotation ran backwards. `mat2(cos(a), -sin(a), sin(a), cos(a))` looks like
 *      R(a) written out row by row, but GLSL's mat2 constructor fills COLUMNS, so that
 *      literal is R(-a) and `a = -0.9` rotated the ribbons by +0.9 radians. The literal
 *      below is transposed to a real R(a), and `a` is stated as the angle it now means.
 *
 *   2. The bands saturated. Three `band +=` terms weighted 1, 0.7 and 0.5 summed to as
 *      much as 2.2 before a single `clamp(band, 0.0, 1.0)`, so every region where two
 *      bands overlapped flattened onto a plateau of solid `u_mid`. Sampled pixels came
 *      back as literally (122, 69, 204) -- the mid stop, unmixed -- across wide areas.
 *      `max()` replaces the sum: the combined value cannot exceed the largest single
 *      gain, so there is no plateau to clamp, and the clamp is gone with the defect
 *      rather than left in as a load-bearing rescue.
 */
export const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_deep;
uniform vec3 u_mid;
uniform vec3 u_bright;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

/**
 * One ribbon: a bright core inside a soft, wide falloff to black.
 *
 * f is a linear-ish distance ramp, 1 at the centre and 0 at w. The return is
 * 0.42*f^2 + 0.58*f^6 -- two terms because one cannot be both. f^2 alone gives an even
 * band with no core; f^6 alone gives a core with no glow. Together the shoulder falls
 * away fast enough that the ground stays black at w wide enough for the glow to read.
 */
float ribbon(float d, float w) {
  float f = 1.0 - smoothstep(0.0, w, abs(d));
  float f2 = f * f;
  return f2 * (0.42 + 0.58 * f2 * f2);
}

void main() {
  // Centred before the aspect correction, so the composition does not slide sideways as
  // the viewport narrows: a phone sees fewer ribbons of the same pattern, not a
  // different part of it.
  vec2 p = gl_FragCoord.xy / u_resolution - 0.5;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time;

  // 0.95 rad, and the ribbons run along (sin a, cos a) -- about 36 degrees above
  // horizontal, bottom-left to top-right. mat2 fills columns, so this literal is R(a).
  float a = 0.95;
  mat2 rot = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 q = rot * p;

  // Two warp octaves. The first is broad and slow and does most of the swirling; the
  // second is finer and drifts the other way, which keeps the ribbons from bending in
  // lockstep.
  float w1 = snoise(q * 0.80 + vec2(0.0, t * 0.055));
  float w2 = snoise(q * 1.90 - vec2(t * 0.031, 0.0));
  float warped = q.x + w1 * 0.32 + w2 * 0.14;

  // Three ribbons, combined with max() rather than summed -- see the header comment.
  // Spaced about 0.7 apart in warped units against a visible span of roughly 2.5, so two
  // or three are on screen at 16:10 and one or two on a phone.
  float band = 0.0;
  band = max(band, ribbon(warped + 0.62, 0.30) * 0.85);
  band = max(band, ribbon(warped - 0.02, 0.34) * 1.00);
  band = max(band, ribbon(warped - 0.72, 0.26) * 0.62);

  // Ribbons swell and fade along their length rather than glowing evenly end to end.
  // Reusing w1 rather than sampling a third noise keeps this free: it also ties the
  // dimming to the bend, so a ribbon goes quiet where it turns away.
  band *= 0.52 + 0.48 * (0.5 + 0.5 * w1);

  // Continuous ramp, no flat step between the two mixes: at band = 1 the first mix is
  // fully u_mid and the second is fully u_bright, and every value between moves.
  vec3 col = mix(u_deep, u_mid, smoothstep(0.0, 1.0, band));
  col = mix(col, u_bright, smoothstep(0.45, 1.0, band));

  gl_FragColor = vec4(col, 1.0);
}
`;
