import { DECAY_BAND, REBUILD_BAND } from './decayTimeline';
import { DECAY_OUTSIDE_RATE } from './decayField';

export const DECAY_VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/**
 * The level decay, as one full-screen pass over the rendered world layer.
 *
 * 1. Geodesic fronts: two Dijkstra fields packed in uDist (RG: from the death tile,
 *    BA: from the respawn tile), read with a manual bilinear filter.
 * 2. Domain warp: one fbm + noise offset added to both fields, so the fronts are ragged.
 * 3. Ice shards: a jittered Voronoi mosaic (half a tile). Each shard reads its decay at its
 *    centre, then lifts, turns, drifts away from the epicentre and shrinks; the pass
 *    inverts that motion per pixel (q = c + R(-θ)(p - c - Δ)/σ, accepted if q stays in
 *    the cell) over the 3×3 neighbouring cells.
 * 4. Frost and seam cracks ahead of the front; an abyss of warped fbm with wisps and stars
 *    behind the shards; a refracting shock ring at the moment of death; a rebuild front
 *    that flies the shards back in from the respawn point.
 */
export const DECAY_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uDist;
uniform vec2 uSizePx;
uniform vec2 uScenePx;
uniform vec4 uWorld;      // board origin (css px), world scale, tile size in world units
uniform vec2 uDistSize;
uniform float uMargin;
uniform vec2 uDMax;       // death field max, respawn field max
uniform float uFront;     // decay front (death field), < -50: off
uniform float uRebuild;   // rebuild front (respawn field), < -50: off
uniform float uTime;
uniform float uShock;     // 0..1, < 0: off
uniform vec2 uEpic;       // death tile centre, tile coords
uniform vec3 uDeep;       // abyss palette
uniform vec3 uMid;
uniform vec3 uWisp;
uniform vec3 uIce;        // frost, seams, glints
uniform vec3 uRim;        // decay front glow
uniform vec3 uWarm;       // rebuild front glow
out vec4 outColor;

const float CS = 12.0;
const float BAND = ${DECAY_BAND.toFixed(2)};
const float RB = ${REBUILD_BAND.toFixed(2)};
const float OUTSIDE = ${DECAY_OUTSIDE_RATE.toFixed(2)};

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n + 17.17)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
  return s;
}
vec2 texel(ivec2 c) {
  vec4 v = texelFetch(uDist, c, 0);
  return vec2(floor(v.r * 255.0 + 0.5) + v.g, floor(v.b * 255.0 + 0.5) + v.a) / 255.0 * uDMax;
}
// x: death field, y: respawn field
vec2 geo(vec2 t) {
  vec2 g = t + uMargin - 0.5, mx = uDistSize - 1.0, gc = clamp(g, vec2(0.0), mx);
  float extra = length(g - gc) * OUTSIDE;
  vec2 i = min(floor(gc), mx - 1.0), f = gc - i;
  ivec2 a = ivec2(i);
  vec2 d00 = texel(a), d10 = texel(a + ivec2(1, 0)), d01 = texel(a + ivec2(0, 1)), d11 = texel(a + ivec2(1, 1));
  return mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y) + extra;
}
vec2 field(vec2 t) {
  return geo(t) + 1.8 * (fbm(t * 0.38 + vec2(3.1, 7.7)) - 0.5) + 0.5 * (noise(t * 1.7) - 0.5);
}
// x: shard decay (0 intact .. 1 gone), y: death distance, z: frost, w: respawn distance
vec4 state(vec2 t) {
  vec2 f = field(t);
  float a = clamp((uFront - f.x) / BAND, 0.0, 1.0);
  float r = clamp((uRebuild - f.y) / RB, 0.0, 1.0);
  float frost = uFront > -50.0 ? (1.0 - r) * clamp(1.0 - (f.x - uFront) / 3.2, 0.0, 1.0) : 0.0;
  return vec4(a * (1.0 - r), f.x, frost, f.y);
}
vec2 cellCenter(vec2 k) { return (k + 0.15 + 0.7 * h22(k)) * CS; }
vec3 vor(vec2 w) {
  vec2 g = floor(w / CS), best = g;
  float d1 = 1e9, d2 = 1e9;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 k = g + vec2(x, y);
    float d = length(w - cellCenter(k));
    if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
  }
  return vec3(best, 0.5 * (d2 - d1));
}
vec4 scene(vec2 w) {
  vec2 css = w * uWorld.z + uWorld.xy;
  return texture(uScene, css / uScenePx);
}
vec3 abyss(vec2 t) {
  vec2 q = t * 0.22;
  float n = fbm(q + vec2(uTime * 0.03, -uTime * 0.02) + 1.5 * fbm(q * 1.7 - uTime * 0.05));
  vec3 c = mix(uDeep, uMid, n) + uWisp * pow(n, 5.0) * 1.2;
  vec2 sc = floor(t * 6.0);
  float s = step(0.996, h21(sc)) * (0.5 + 0.5 * sin(uTime * 3.0 + h21(sc + 3.3) * 40.0));
  return c + s * uIce * 0.85;
}
void main() {
  vec2 css = vec2(gl_FragCoord.x, uSizePx.y - gl_FragCoord.y) / uSizePx * uScenePx;
  float T = uWorld.w;
  vec2 w = (css - uWorld.xy) / uWorld.z;
  vec2 t = w / T;

  vec2 shockOff = vec2(0.0);
  float shockGlow = 0.0;
  if (uShock >= 0.0 && uShock < 1.0) {
    float rad = (1.0 - pow(1.0 - uShock, 2.0)) * 20.0;
    float sb = exp(-pow((length(t - uEpic) - rad) / 1.2, 2.0)) * (1.0 - uShock);
    shockOff = normalize(w - uEpic * T + 1e-4) * sb * 7.0;
    shockGlow = sb;
  }

  vec4 here = state(t);
  bool rebuilding = uRebuild > -50.0;
  bool intact = here.y > uFront + 8.2 || (rebuilding && here.w < uRebuild - RB - 5.0);
  bool gone = here.y < uFront - BAND - 5.0 && !(rebuilding && here.w < uRebuild + 5.0);
  vec3 col;
  if (intact) {
    col = scene(w + shockOff).rgb;
  } else if (gone) {
    col = abyss(t);
  } else {
    vec2 g = floor(w / CS);
    float bestH = -1.0, bestA = 0.0;
    vec3 bestCol = vec3(0.0);
    for (int oy = -1; oy <= 1; oy++) for (int ox = -1; ox <= 1; ox++) {
      vec2 k = g + vec2(ox, oy);
      vec2 c = cellCenter(k);
      vec4 sh = state(c / T);
      float s = sh.x;
      vec2 rn = h22(k + 31.7);
      vec2 away = c / T - uEpic;
      away /= length(away) + 1e-3;
      vec2 dir = normalize(mix(rn * 2.0 - 1.0, away, 0.6) + 1e-4);
      float mv = smoothstep(0.1, 1.0, s);
      vec2 dsp = dir * CS * 0.75 * mv;
      float th = (rn.x - 0.5) * 3.4 * mv;
      float sig = (1.0 + 0.14 * sin(3.14159 * clamp(s * 1.6, 0.0, 1.0))) * (1.0 - smoothstep(0.5, 0.97, s));
      if (sig < 0.02) continue;
      vec2 rel = (w - c - dsp) / sig;
      float cs = cos(-th), sn = sin(-th);
      vec2 q = c + vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y);
      vec3 vq = vor(q);
      if (vq.x != k.x || vq.y != k.y) continue;
      float h = s + rn.y * 0.001;
      if (h <= bestH) continue;
      bestH = h;
      vec3 c3 = scene(q + shockOff).rgb;
      float frost = max(smoothstep(0.0, 0.45, s), sh.z * 0.55);
      c3 = mix(c3, c3 * 0.62 + uIce * 0.4, frost * 0.7);
      float seam = 1.0 - smoothstep(0.0, 1.4, vq.z);
      float glint = pow(max(0.0, sin(th * 5.0 + rn.y * 6.283 + uTime * 2.0)), 14.0) * mv;
      float sparkle = step(0.992, h21(floor(q * 1.3))) * frost * (0.5 + 0.5 * sin(uTime * 6.0 + rn.x * 30.0));
      c3 += uIce * (seam * (0.25 * step(0.001, s) + 0.75 * frost) + glint * 0.9 + sparkle * 0.8);
      c3 *= 1.0 + 0.25 * sin(th * 2.0 + rn.x * 3.0) * mv;
      bestCol = c3;
      bestA = 1.0 - smoothstep(0.72, 0.98, s);
    }
    vec3 vc = abyss(t);
    col = bestH < 0.0 ? vc : mix(vc, bestCol, bestA);
  }
  float rest = clamp((uRebuild - here.w) / RB, 0.0, 1.0);
  float rim1 = uFront > -50.0 ? exp(-pow((here.y - uFront) / 0.55, 2.0)) * (1.0 - rest) : 0.0;
  float rim2 = rebuilding ? exp(-pow((here.w - uRebuild) / 0.7, 2.0)) : 0.0;
  col += uRim * rim1 * (0.3 + 0.3 * noise(t * 3.0 + uTime * 2.0));
  col += uWarm * rim2 * 0.6;
  col += uIce * shockGlow * 0.3;
  outColor = vec4(col, 1.0);
}`;
