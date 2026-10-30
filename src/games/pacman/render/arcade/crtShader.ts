/**
 * CRT look for the arcade level, kept light: a slight barrel curve, a scanline per native
 * row, a faint RGB mask, a neon glow from eight neighbour taps and a soft vignette.
 * The source is the native-resolution board, sampled nearest so pixels stay hard.
 */
export const CRT_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uSrc;
uniform vec2 uOut;
uniform float uGlow;
out vec4 outColor;

vec2 curve(vec2 uv) {
	uv = uv * 2.0 - 1.0;
	vec2 off = abs(uv.yx) / vec2(9.0, 8.0);
	uv += uv * off * off;
	return uv * 0.5 + 0.5;
}

void main() {
	vec2 frag = gl_FragCoord.xy / uOut;
	frag.y = 1.0 - frag.y;
	vec2 uv = curve(frag);
	if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
		outColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}
	vec3 c = texture(uTex, uv).rgb;
	vec2 px = 1.0 / uSrc;
	vec3 g = vec3(0.0);
	for (int i = 0; i < 8; i++) {
		float a = float(i) * 0.7853982;
		g += texture(uTex, uv + vec2(cos(a), sin(a)) * px * 1.7).rgb;
	}
	c += (g / 8.0) * uGlow;
	float row = fract(uv.y * uSrc.y);
	c *= 0.74 + 0.26 * sin(row * 3.14159265);
	float m = mod(gl_FragCoord.x, 3.0);
	c *= vec3(m < 1.0 ? 1.05 : 0.97, (m >= 1.0 && m < 2.0) ? 1.05 : 0.97, m >= 2.0 ? 1.05 : 0.97);
	vec2 v = uv * (1.0 - uv.yx);
	c *= pow(clamp(v.x * v.y * 18.0, 0.0, 1.0), 0.16);
	outColor = vec4(c, 1.0);
}`;
