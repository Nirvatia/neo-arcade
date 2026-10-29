export function doomCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

export function canvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('DoomTextures.canvasContext', '2d context unavailable');
    throw new Error('DoomTextures.canvasContext: 2d context unavailable');
  }
  return ctx;
}

export function hexChannels(value: number): [number, number, number] {
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function radialTexture(
  size: number,
  stops: ReadonlyArray<readonly [number, string]>
): HTMLCanvasElement {
  const safeSize = Math.max(2, Math.floor(size));
  const canvas = doomCanvas(safeSize, safeSize);
  const ctx = canvasContext(canvas);
  const gradient = ctx.createRadialGradient(
    safeSize / 2, safeSize / 2, 0,
    safeSize / 2, safeSize / 2, safeSize / 2
  );
  for (const stop of stops) {
    gradient.addColorStop(stop[0], stop[1]);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, safeSize, safeSize);
  return canvas;
}

const glowCache = new Map<number, HTMLCanvasElement>();

export function glowTexture(tint: number): HTMLCanvasElement {
  const cached = glowCache.get(tint);
  if (cached) {
    return cached;
  }
  const [r, g, b] = hexChannels(tint);
  const texture = radialTexture(64, [
    [0, `rgb(${r},${g},${b})`],
    [0.35, `rgba(${r},${g},${b},0.35)`],
    [1, `rgba(${r},${g},${b},0)`]
  ]);
  glowCache.set(tint, texture);
  return texture;
}

export function makeTexture(
  width: number,
  height: number,
  painter: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement {
  const scale = 3;
  const canvas = doomCanvas(width * scale, height * scale);
  const ctx = canvasContext(canvas);
  ctx.scale(scale, scale);
  painter(ctx);
  return canvas;
}

export function makeRandom(seed: number): () => number {
  let state = Math.abs(Math.floor(seed)) % 2147483647;
  if (state <= 0) {
    state = 1;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: readonly [number, number, number, number]
): void {
  const [tl, tr, br, bl] = radii;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.arcTo(x + width, y, x + width, y + tr, tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.arcTo(x + width, y + height, x + width - br, y + height, br);
  ctx.lineTo(x + bl, y + height);
  ctx.arcTo(x, y + height, x, y + height - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
}

export function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  rotation: number
): void {
  const safeRx = Math.max(0.1, rx);
  const safeRy = Math.max(0.1, ry);
  const safeRotation = Number.isFinite(rotation) ? rotation : 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, safeRx, safeRy, safeRotation, 0, Math.PI * 2);
  ctx.fill();
}