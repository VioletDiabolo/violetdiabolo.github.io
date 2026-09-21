export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * Ashima's 2D simplex noise, then domain warping, then a few soft bands.
 *
 * The ribbons come from warping: a low-frequency noise displaces the coordinate the
 * banding function reads, which turns straight bands into swirls. Raising the warp
 * amplitudes makes it more turbulent; adding bands makes it busier.
 *
 * `u_velocity` is added to the time term rather than multiplied into it, so a fast
 * scroll pushes the animation forward instead of changing its speed permanently.
 */
export const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_velocity;
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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time + u_velocity;

  // Rotate so the ribbons run diagonally, as the reference does.
  float a = -0.9;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 q = rot * p;

  float w1 = snoise(q * 0.9 + vec2(0.0, t * 0.05));
  float w2 = snoise(q * 1.7 - vec2(t * 0.03, 0.0));
  float warped = q.x + w1 * 0.45 + w2 * 0.22;

  float band = 0.0;
  band += smoothstep(0.35, 0.02, abs(warped - 0.15));
  band += smoothstep(0.55, 0.05, abs(warped + 0.55)) * 0.7;
  band += smoothstep(0.25, 0.01, abs(warped - 0.95)) * 0.5;

  float lum = clamp(band, 0.0, 1.0);

  vec3 col = mix(u_deep, u_mid, smoothstep(0.0, 0.7, lum));
  col = mix(col, u_bright, smoothstep(0.75, 1.0, lum));

  gl_FragColor = vec4(col, 1.0);
}
`;
