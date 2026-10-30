import { DECAY_OUTSIDE_RATE } from '../decay/decayField';

/** Tiles over which one tile card turns over, behind the front. */
export const TURN_BAND = 3;

/**
 * The season turn, as one full-screen pass over two rendered worlds (the cleared level,
 * the next season).
 *
 * 1. Light down the corridors: a geodesic field from the last dot; as its head and the
 *    ripples behind it pass, a bead of light flares on every corridor tile (where the
 *    eaten dots were) over a faint corridor glow (corridor mask: B channel of uDist).
 * 2. Tile cards: every tile of the world (maze and meadow alike) is a card. It reads the
 *    warped front at its centre (plus a little jitter) and turns over about the axis
 *    across its direction of travel: seen from above it narrows to a line (|cos θ|) and
 *    shows the next season on its back. The pass inverts the turn per pixel inside the
 *    tile; where the narrowed card leaves the tile uncovered, the next season shows
 *    through, shaded, under a warm rim.
 * 3. A soft bloom on the fresh side right behind the front.
 */
export const SEASON_TURN_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uOld;
uniform sampler2D uNew;
uniform sampler2D uDist;
uniform vec2 uSizePx;
uniform vec2 uScenePx;
uniform vec4 uWorld;      // board origin (css px), world scale, tile size in world units
uniform vec2 uDistSize;
uniform float uMargin;
uniform float uDMax;
uniform float uGlow;      // head of the corridor light, tiles (< -50: off)
uniform float uFront;     // turning front, tiles (< -50: not started)
uniform float uTime;
uniform vec2 uEpic;       // last dot, tile coords
uniform vec3 uLight;      // corridor light and edge glints
uniform vec3 uGap;        // light through the seams
out vec4 outColor;

const float BAND = ${TURN_BAND.toFixed(2)};
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
// x: distance, y: corridor mask
vec2 texel(ivec2 c) {
  vec4 v = texelFetch(uDist, c, 0);
  return vec2((floor(v.r * 255.0 + 0.5) + v.g) / 255.0 * uDMax, v.b);
}
vec2 geo(vec2 t) {
  vec2 g = t + uMargin - 0.5, mx = uDistSize - 1.0, gc = clamp(g, vec2(0.0), mx);
  float extra = length(g - gc) * OUTSIDE;
  vec2 i = min(floor(gc), mx - 1.0), f = gc - i;
  ivec2 a = ivec2(i);
  vec2 d00 = texel(a), d10 = texel(a + ivec2(1, 0)), d01 = texel(a + ivec2(0, 1)), d11 = texel(a + ivec2(1, 1));
  vec2 v = mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y);
  return vec2(v.x + extra, extra > 0.0 ? 0.0 : v.y);
}
float warp(vec2 t) { return 1.4 * (fbm(t * 0.33 + vec2(5.2, 1.3)) - 0.5); }
vec3 sceneOld(vec2 w) { return texture(uOld, (w * uWorld.z + uWorld.xy) / uScenePx).rgb; }
vec3 sceneNew(vec2 w) { return texture(uNew, (w * uWorld.z + uWorld.xy) / uScenePx).rgb; }

void main() {
  vec2 css = vec2(gl_FragCoord.x, uSizePx.y - gl_FragCoord.y) / uSizePx * uScenePx;
  float T = uWorld.w;
  vec2 w = (css - uWorld.xy) / uWorld.z;
  vec2 t = w / T;
  vec2 g = geo(t);
  float f = g.x + warp(t);

  // how far the turn has got here (the light only runs over the old world)
  float turned = clamp((uFront - f) / BAND, 0.0, 1.0);

  vec3 col;
  if (f > uFront + 4.5) {
    col = sceneOld(w);
  } else if (f < uFront - BAND - 4.5) {
    col = sceneNew(w);
  } else {
    vec2 k = floor(t);
    vec2 c = k + 0.5;
    vec2 rn = h22(k + 7.1);
    float fc = geo(c).x + warp(c) + (rn.x - 0.5) * 0.9;
    float p = clamp((uFront - fc) / BAND, 0.0, 1.0);
    p = p * p * (3.0 - 2.0 * p);
    if (p <= 0.0) {
      col = sceneOld(w);
    } else if (p >= 1.0) {
      col = sceneNew(w);
    } else {
      // turn across the main direction of travel: about a vertical or horizontal axis
      vec2 away = c - uEpic;
      bool alongX = abs(away.x) > abs(away.y);
      float sgn = alongX ? sign(away.x + 1e-4) : sign(away.y + 1e-4);
      float th = 3.14159 * p;
      float cs = cos(th), sn = sin(th);
      vec2 rel = t - c;
      float a = alongX ? rel.x : rel.y;   // compressed coordinate
      float src = a / max(abs(cs), 1e-3);
      vec3 card;
      if (abs(src) > 0.5) {
        // the narrowed card no longer covers this part: the next season, in its shadow
        float rim = exp(-(abs(a) - 0.5 * abs(cs)) * 14.0);
        card = sceneNew(w) * (0.5 + 0.3 * (1.0 - sn)) + uGap * rim * 0.35 * sn;
      } else {
        vec2 q = c + (alongX ? vec2(src, rel.y) : vec2(rel.x, src));
        bool back = th > 1.5708;
        card = back ? sceneNew(q * T) : sceneOld(q * T);
        // the leading half tips down, the trailing half rises into the light
        float tilt = clamp(a * 2.0 * sgn, -1.0, 1.0) * sn;
        card *= 0.82 + 0.18 * abs(cs) + 0.28 * tilt * (back ? -1.0 : 1.0);
        float edge = 1.0 - smoothstep(0.0, 0.08, 0.5 - abs(src));
        card += uLight * (edge * 0.22 * sn + pow(sn, 6.0) * 0.08);
      }
      col = card;
    }
  }

  if (uGlow > -50.0) {
    // one bead per corridor tile, lit by the wave at that tile
    vec2 tk = floor(t);
    vec2 tc = tk + 0.5;
    float lane = texelFetch(uDist, ivec2(tk + uMargin), 0).b;
    float d = geo(tc).x + warp(tc) - uGlow;
    float head = exp(-d * d / 0.8);
    float ripples = d < 0.0 ? exp(d * 0.22) * pow(0.5 + 0.5 * cos(d * 2.4), 3.0) : 0.0;
    float wave = head + ripples * 0.55;
    vec2 r = t - tc;
    float rr = dot(r, r);
    float bead = exp(-rr / 0.012) + 0.35 * exp(-rr / 0.09);
    float wash = 0.12 * head * smoothstep(0.3, 0.9, g.y);
    col += uLight * (lane * bead * wave * 1.1 + wash) * (1.0 - turned);
  }
  if (uFront > -50.0) {
    float b = f - (uFront - BAND);
    col += uGap * 0.1 * exp(-b * b / 1.2) * turned;
  }
  outColor = vec4(col, 1.0);
}`;
