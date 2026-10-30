// GLSL for the characters: each actor and each trail is a quad whose fragment shader shades
// every pixel. Bodies are 2D signed distance fields lit as spheres (subsurface warmth, two
// speculars, rim light, a contact shadow); trails are distance fields to the actor's recent
// path, textured by flowing noise. Output is premultiplied alpha; alpha below the colour's
// strength makes a pixel partly additive (glow).

export const VERTEX = `#version 300 es
in vec2 aCorner;
uniform vec2 uRes;
uniform vec4 uBox;
void main() {
	vec2 pos = mix(uBox.xy, uBox.zw, aCorner * 0.5 + 0.5);
	gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform float uPow;
uniform float uKind;
out vec4 o;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}
float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
	float a = 0.5;
	float s = 0.0;
	for (int i = 0; i < 5; i++) {
		s += a * noise(p);
		p = p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return s;
}
vec4 over(vec4 top, vec4 under) {
	return top + under * (1.0 - top.a);
}
/** Canvas px, y down, like the 2D canvas. */
vec2 canvasPx() {
	return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
}
`;

export const CHARACTER = `${COMMON}
uniform vec2 uC;
uniform float uR;
uniform float uAng;
uniform float uFlip;
uniform float uMouth;
uniform float uEnd;

float sdPie(vec2 p, vec2 c, float r) {
	p.x = abs(p.x);
	float l = length(p) - r;
	float m = length(p - c * clamp(dot(p, c), 0.0, r));
	return max(l, m * sign(c.y * p.x - c.x * p.y));
}
float smax(float a, float b, float k) {
	float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0);
	return mix(b, a, h) + k * h * (1.0 - h);
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a;
	vec2 ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * h);
}
mat2 rot(float a) {
	float c = cos(a);
	float s = sin(a);
	return mat2(c, s, -s, c);
}
/** A soft four-pointed twinkle. */
float twinkle(vec2 s, float size) {
	s /= size;
	float core = exp(-dot(s, s) * 18.0);
	float rays = exp(-abs(s.y) * 40.0 - abs(s.x) * 5.0) + exp(-abs(s.x) * 40.0 - abs(s.y) * 5.0);
	return core + rays * 0.9;
}

/** The satin bow: two pinched loops and a knot; returns colour (premultiplied). */
vec4 bow(vec2 q, float aa, float glow) {
	vec2 p = rot(0.35) * (q - vec2(-0.33, -0.88)) / 0.47;
	float ax = abs(p.x);
	float pinch = 0.42 + 0.58 * clamp(ax / 0.75, 0.0, 1.0);
	vec2 lp = vec2(ax - 0.6, p.y + 0.04 * ax);
	float dLoop = (length(lp / vec2(0.62, 0.44 * pinch)) - 1.0) * 0.38;
	float dKnot = length(p * vec2(1.0, 0.85)) - 0.27;
	float d = min(dLoop, dKnot);
	float a = 1.0 - smoothstep(-aa * 2.2, aa * 2.2, d);
	if (a <= 0.0) return vec4(0);
	// satin: folds radiating from the knot, light from the top, a sheen band
	float fold = 0.78 + 0.22 * cos(atan(p.y, ax + 0.05) * 5.0 + ax * 3.0);
	float light = 0.75 + 0.35 * clamp(-p.y * 0.9 + 0.3, 0.0, 1.0);
	float sheen = exp(-pow((p.y + 0.22 - 0.18 * ax) * 5.5, 2.0)) * smoothstep(0.15, 0.5, ax);
	vec3 red = vec3(0.98, 0.13, 0.33);
	vec3 c = red * fold * light + vec3(1.0, 0.75, 0.82) * sheen * 0.75;
	if (dKnot < 0.0) {
		c = red * (0.85 + 0.3 * clamp(-p.y * 2.0 + 0.4, 0.0, 1.0)) + vec3(1.0, 0.8, 0.85) * exp(-dot(p + vec2(0.08, 0.1), p + vec2(0.08, 0.1)) * 40.0) * 0.6;
	}
	// polka dots on the loops
	vec2 g = vec2(ax, p.y) * 4.2;
	float pd = length(fract(g) - 0.5) - 0.14;
	float dots = (1.0 - smoothstep(-0.04, 0.04, pd)) * step(0.0, -dLoop) * step(0.3, ax);
	c = mix(c, vec3(1.0, 0.92, 0.94), dots * 0.85);
	c += vec3(1.0, 0.6, 0.8) * glow;
	// a dark rim so the bow reads at tile size
	float rim = smoothstep(-0.1, -0.02, d);
	c = mix(c, vec3(0.32, 0.02, 0.1), rim * 0.9);
	return vec4(c * a, a);
}

void main() {
	vec2 pc = canvasPx() - uC;
	vec2 q = rot(-uAng) * pc;
	q = vec2(q.x, q.y * uFlip);
	bool ms = uKind > 0.5;
	float R = uR * (1.0 + (ms ? 0.06 : 0.12) * uPow);
	q /= R;
	float aa = 1.2 / R;
	float r = length(q);

	// the mouth: a wedge from just behind the centre, rounded at the lips
	float m = 0.05 + uMouth * (ms ? 0.5 : 0.62);
	float dC = r - 1.0;
	float dP = sdPie(vec2(q.y, q.x + 0.15), vec2(sin(m), cos(m)), 3.0);
	float dB = smax(dC, -dP, 0.06);
	float inBody = 1.0 - smoothstep(-aa, aa, dB);
	float inMouth = (1.0 - smoothstep(-aa, aa, dC)) * (1.0 - inBody);

	// contact shadow under the body
	float sh = length((q - vec2(0.1, 0.24)) * vec2(1.0, 1.3)) - 0.9;
	vec4 col = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(-0.15, 0.45, sh)) * 0.38);

	// behind the body: his corona of fire / her halo
	if (uPow > 0.0) {
		float ang = atan(q.y, q.x);
		if (!ms) {
			float f = fbm(vec2(ang * 2.6 + uT * 0.6, dC * 5.0 - uT * 3.6));
			float flame = clamp(f * 1.5 - dC * 2.2 - 0.25, 0.0, 1.0) * step(0.0, dC + 0.05);
			vec3 fire = mix(vec3(1.0, 0.18, 0.0), vec3(1.0, 0.9, 0.55), flame * flame);
			float halo = exp(-max(dC, 0.0) * 5.0) * 0.35;
			col.rgb += (fire * flame * 1.4 + vec3(1.0, 0.55, 0.15) * halo) * uPow;
		} else {
			float halo = exp(-max(dC, 0.0) * 4.0) * 0.45;
			col.rgb += vec3(1.0, 0.7, 0.9) * halo * uPow;
		}
	}

	// sphere normal, light from the upper left (y is down)
	float z = sqrt(max(0.0, 1.0 - r * r));
	vec3 n = normalize(vec3(q, z + 0.001));
	vec3 L = normalize(vec3(-0.45, -0.62, 0.64));
	vec3 H = normalize(L + vec3(0, 0, 1));
	float ndl = dot(n, L);
	float wrap = clamp((ndl + 0.4) / 1.4, 0.0, 1.0);
	float nh = max(dot(n, H), 0.0);
	float fres = pow(1.0 - z, 2.0);
	vec2 back = normalize(vec2(0.7, 0.75));
	float rim = pow(1.0 - z, 3.0) * max(0.0, dot(normalize(q + 1e-4), back));

	// the open mouth: a throat darkening towards the hinge
	if (inMouth > 0.0) {
		float k = clamp(r, 0.0, 1.0);
		float lip = smoothstep(0.0, 0.16, -dP);
		vec3 cav = ms ? mix(vec3(0.28, 0.03, 0.12), vec3(0.88, 0.32, 0.48), k * k)
			: mix(vec3(0.1, 0.015, 0.0), vec3(0.6, 0.1, 0.03), k * k);
		if (ms) {
			float tongue = 1.0 - smoothstep(0.0, 0.05, length((q - vec2(0.62, 0.16)) * vec2(1.0, 1.6)) - 0.2);
			cav = mix(cav, vec3(1.0, 0.5, 0.62), tongue * 0.8);
		}
		cav *= 0.55 + 0.45 * lip;
		cav = mix(cav, vec3(1.0, 0.85, 0.45) * (1.25 - k * 0.6), ms ? 0.0 : uPow * 0.85);
		cav = mix(cav, vec3(1.0, 0.85, 0.92) * (1.2 - k * 0.5), ms ? uPow * 0.5 : 0.0);
		col = over(vec4(cav * inMouth, inMouth), col);
	}

	if (inBody > 0.0) {
		vec3 c;
		vec3 line;
		// depth at the lips: the body darkens towards the mouth's edges
		float lipAO = mix(0.62, 1.0, smoothstep(0.0, 0.22, dP));
		if (!ms) {
			// molten gold: deep and heavy, oranger underneath
			vec3 base = mix(vec3(1.0, 0.86, 0.26), vec3(0.93, 0.47, 0.02), smoothstep(-0.7, 1.0, q.y + q.x * 0.15));
			c = base * (0.22 + 0.9 * wrap);
			c *= 0.95 + 0.05 * noise(q * 10.0);
			c += vec3(1.0, 0.36, 0.0) * fres * 0.3;
			c += vec3(1.0, 0.72, 0.3) * rim * 1.1;
			c += vec3(1.0, 0.98, 0.9) * (pow(nh, 90.0) * 1.4 + pow(nh, 12.0) * 0.22);
			// overcharge: white-hot, with plasma veins flowing under the skin
			if (uPow > 0.0) {
				vec2 w = q * 2.4 + vec2(uT * 0.5, -uT * 0.35);
				float v = fbm(w + fbm(w * 1.3 - uT * 0.4) * 1.8);
				// thin glowing veins, the gold staying rich around them
				float vein = exp(-pow((v - 0.55) * 28.0, 2.0));
				vec3 hot = vec3(1.0, 0.8, 0.32) * (0.55 + 0.6 * wrap);
				c = mix(c, hot, uPow * 0.3);
				c += vec3(1.0, 0.92, 0.6) * vein * uPow * 1.3;
				c += vec3(1.0, 0.45, 0.08) * fres * uPow * 0.9;
			}
			line = mix(vec3(0.24, 0.08, 0.0), vec3(0.75, 0.2, 0.0), uPow);
		} else {
			// pearly candy: soft, translucent, an iridescent sheen at the rim
			vec3 base = mix(vec3(1.0, 0.86, 0.91), vec3(0.96, 0.5, 0.7), smoothstep(-0.7, 1.0, q.y + q.x * 0.15));
			c = base * (0.45 + 0.65 * wrap);
			c += vec3(1.0, 0.45, 0.62) * fres * 0.32;
			vec3 irid = 0.5 + 0.5 * cos(6.2832 * (fres * 1.3 + vec3(0.0, 0.33, 0.67) + uT * 0.04));
			c = mix(c, c * 0.65 + irid * 0.45, fres * (0.4 + 0.4 * uPow));
			c += vec3(1.0, 0.85, 0.92) * rim * 0.6;
			c += vec3(1.0) * (pow(nh, 140.0) * 1.3 + pow(nh, 16.0) * 0.32);
			if (uPow > 0.0) {
				c = mix(c, vec3(1.0, 0.94, 0.97) * (0.85 + 0.3 * wrap), uPow * 0.42);
				c += vec3(1.0, 0.72, 0.9) * fres * uPow * 0.7;
			}
			// the face: a happy closed eye with lashes, a blush, a beauty mark
			vec2 e = vec2(0.1, -0.42);
			float arc = abs(length(q - e) - 0.17) - 0.034;
			arc = max(arc, (q.y - e.y) - 0.02);
			float lash1 = sdSeg(q, e + 0.17 * vec2(cos(3.55), sin(3.55)), e + 0.3 * vec2(cos(3.5), sin(3.5))) - 0.026;
			float lash2 = sdSeg(q, e + 0.17 * vec2(cos(4.0), sin(4.0)), e + 0.31 * vec2(cos(3.98), sin(3.98))) - 0.026;
			float eye = min(arc, min(lash1, lash2));
			float blush = 1.0 - smoothstep(-0.05, 0.12, length((q - vec2(0.13, -0.15)) / vec2(1.0, 0.6)) - 0.13);
			c = mix(c, vec3(1.0, 0.38, 0.55), blush * 0.45);
			float mark = length(q - vec2(0.5, -0.4)) - 0.045;
			float ink = 1.0 - smoothstep(-aa, aa, min(eye, mark));
			c = mix(c, vec3(0.32, 0.06, 0.18), ink);
			line = mix(vec3(0.33, 0.07, 0.2), vec3(0.85, 0.35, 0.6), uPow);
		}
		c *= lipAO;
		// a dark rim keeps the silhouette at tile size
		float edge = smoothstep(-0.13, -0.02, dB);
		c = mix(c, line, edge * 0.85);
		if (uEnd > 0.0 && sin(uT * 22.0) > 0.0) c = mix(c, vec3(1.0), 0.55);
		col = over(vec4(c * inBody, inBody), col);
	}

	// in front: her bow and the stars of her power
	if (ms) {
		col = over(bow(q, aa, uPow * 0.25), col);
		if (uPow > 0.0) {
			for (int i = 0; i < 5; i++) {
				float a = uT * 1.7 + float(i) * 1.2566;
				vec2 s = q - vec2(cos(a), sin(a)) * 1.62;
				float tw = 0.75 + 0.25 * sin(uT * 9.0 + float(i) * 2.0);
				col.rgb += vec3(1.0, 0.85, 0.95) * twinkle(rot(uT * 0.8) * s, 0.42) * tw * uPow;
			}
		}
	}
	o = col;
}`;

export const TRAIL = `${COMMON}
uniform vec2 uPts[48];
uniform int uN;
uniform float uR;
uniform float uLen;

void main() {
	vec2 p = canvasPx();
	float best = 1e9;
	float sBest = 0.0;
	float side = 1.0;
	float acc = 0.0;
	for (int i = 0; i < 47; i++) {
		if (i >= uN - 1) break;
		vec2 a = uPts[i];
		vec2 b = uPts[i + 1];
		vec2 ab = b - a;
		float l = length(ab);
		float h = l > 0.0 ? clamp(dot(p - a, ab) / (l * l), 0.0, 1.0) : 0.0;
		vec2 to = p - a - ab * h;
		float d = length(to);
		if (d < best) {
			best = d;
			sBest = acc + h * l;
			side = sign(ab.x * to.y - ab.y * to.x);
		}
		acc += l;
	}
	float fade = clamp(1.0 - sBest / max(uLen, 1.0), 0.0, 1.0);
	float u = sBest / uR;
	bool ms = uKind > 0.5;
	vec4 col = vec4(0);
	if (!ms) {
		// his energy ribbon: a hot core, wisps torn off by flowing noise; flame when powered
		float w = uR * mix(0.78, 1.05, uPow) * pow(fade, 0.65);
		float v = best / max(w, 1e-3);
		float nz = fbm(vec2(u * 1.1 - uT * 4.5, side * v * 1.6 + uT * 0.7));
		float shape = (1.0 - smoothstep(0.15, 1.0, v + (nz - 0.5) * mix(0.9, 1.5, uPow) * (1.15 - fade)));
		float core = (1.0 - smoothstep(0.0, 0.75, v));
		float a = shape * pow(fade, 1.25);
		vec3 gold = mix(vec3(1.0, 0.42, 0.04), vec3(1.0, 0.93, 0.6), core * fade);
		vec3 fire = mix(mix(vec3(0.85, 0.08, 0.0), vec3(1.0, 0.6, 0.1), fade), vec3(1.0, 0.97, 0.85), core * fade * fade);
		vec3 c = mix(gold, fire, uPow) * (0.85 + 0.3 * nz);
		col = vec4(c * a * 1.2, a * 0.7);
		// sparks riding the ribbon
		for (int k = 0; k < 14; k++) {
			float fk = float(k);
			float sk = fract(hash(vec2(fk, 1.7)) + uT * mix(0.45, 0.8, uPow)) * uLen;
			float off = (hash(vec2(fk, 4.1)) - 0.5) * uR * mix(1.0, 1.8, uPow) * (sk / uLen + 0.2);
			float dd = length(vec2(sBest - sk, side * best - off));
			float sz = uR * (0.05 + 0.05 * hash(vec2(fk, 7.3)));
			float g = exp(-dd * dd / (sz * sz)) * (1.0 - sk / uLen);
			col.rgb += mix(vec3(1.0, 0.8, 0.35), vec3(1.0, 0.95, 0.75), uPow) * g * 1.6;
		}
	} else {
		// her silk ribbon: pearly, folding as it waves, glitter twinkling in it; a rainbow when powered
		float w = uR * mix(0.58, 0.8, uPow) * pow(fade, 0.55);
		float v = best / max(w, 1e-3);
		float fold = 0.8 + 0.2 * sin(u * 2.6 - uT * 7.0 + side * v * 1.5);
		float shape = (1.0 - smoothstep(0.55, 1.0, v));
		float a = shape * pow(fade, 1.05);
		// a pastel palette only: pink, lilac, peach
		float hp = fract(u * 0.07 - uT * 0.18);
		vec3 hue = hp < 0.33 ? mix(vec3(1.0, 0.62, 0.82), vec3(0.8, 0.66, 1.0), hp * 3.0)
			: hp < 0.66 ? mix(vec3(0.8, 0.66, 1.0), vec3(1.0, 0.8, 0.66), hp * 3.0 - 1.0)
			: mix(vec3(1.0, 0.8, 0.66), vec3(1.0, 0.62, 0.82), hp * 3.0 - 2.0);
		vec3 pearl = mix(vec3(1.0, 0.68, 0.84), vec3(0.88, 0.7, 1.0), smoothstep(0.0, 4.0, u));
		vec3 c = mix(pearl, mix(pearl, hue, 0.75), 0.25 + 0.65 * uPow) * fold;
		c += vec3(1.0) * pow(1.0 - v, 4.0) * 0.35 * fade;
		col = vec4(c * a * 1.25, a * 0.6);
		vec2 cell = floor(vec2(sBest / (uR * 0.32), side * best / (uR * 0.32)));
		vec2 f = fract(vec2(sBest / (uR * 0.32), side * best / (uR * 0.32))) - 0.5;
		float h = hash(cell);
		float on = step(mix(0.82, 0.6, uPow), h) * shape;
		float tw = 0.5 + 0.5 * sin(uT * 8.0 + h * 40.0);
		float st = exp(-abs(f.y) * 22.0 - abs(f.x) * 4.0) + exp(-abs(f.x) * 22.0 - abs(f.y) * 4.0);
		col.rgb += vec3(1.0, 0.97, 1.0) * st * on * tw * fade * 0.9;
	}
	o = col;
}`;
