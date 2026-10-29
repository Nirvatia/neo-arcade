import type { RenderBoard, SceneView } from '../contracts/SeasonRenderBundle';
import { blob, canvasContext, doomCanvas, makeRandom, roundedRectPath } from './DoomTextures';

type DoomDecorKind =
  | 'tree' | 'rock' | 'bush' | 'flower' | 'cabin'
  | 'pentagram' | 'lamp' | 'pond' | 'bridge';

interface DoomDecor {
  readonly kind: DoomDecorKind;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly variant: number;
  readonly pink: boolean;
  readonly width: number;
  readonly height: number;
  readonly count: number;
}

interface SceneCacheEntry {
  readonly key: string;
  readonly canvas: HTMLCanvasElement;
}

let sceneCache: SceneCacheEntry | null = null;

export class DoomScene implements SceneView {
  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    seed: number,
    board: RenderBoard | null
  ): void {
    if (!(width > 0) || !(height > 0)) {
      return;
    }
    const key = sceneCacheKey(width, height, seed, board);
    if (!sceneCache || sceneCache.key !== key) {
      sceneCache = { key, canvas: bakeScene(width, height, seed, board) };
    }
    ctx.drawImage(sceneCache.canvas, 0, 0, width, height);
  }
}

function sceneCacheKey(
  width: number,
  height: number,
  seed: number,
  board: RenderBoard | null
): string {
  const boardPart = board
    ? `${board.x}:${board.y}:${board.width}:${board.height}`
    : 'none';
  return `${width}x${height}x${seed}x${boardPart}`;
}

function streamBaseY(boardY: number, boardHeight: number, tile: number): number {
  return boardY + boardHeight + 4.7 * tile;
}

function streamYAt(baseY: number, tile: number, x: number): number {
  return baseY
    + Math.sin(x / (9 * tile)) * 2.5 * tile
    + Math.sin(x / (3.7 * tile) + 1) * 0.6 * tile;
}

function bakeScene(
  width: number,
  height: number,
  seed: number,
  board: RenderBoard | null
): HTMLCanvasElement {
  const canvas = doomCanvas(width, height);
  const ctx = canvasContext(canvas);
  const random = makeRandom(seed + 11);
  const range = (from: number, to: number): number => from + random() * (to - from);

  const boardX = board ? board.x : width * 0.2;
  const boardY = board ? board.y : height * 0.2;
  const boardWidth = board ? board.width : width * 0.6;
  const boardHeight = board ? board.height : height * 0.6;
  const tile = Math.max(8, boardWidth / 25);
  const centerX = boardX + boardWidth / 2;
  const centerY = boardY + boardHeight / 2;
  const streamBase = streamBaseY(boardY, boardHeight, tile);

  const base = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 38 * tile);
  base.addColorStop(0, '#5a3022');
  base.addColorStop(1, '#3a1f16');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const area = width * height;
  for (let i = 0; i < Math.floor(area / 50000); i += 1) {
    const x = random() * width;
    const y = random() * height;
    const r = range(70, 130);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, i % 2 ? 'rgba(255,120,60,0.08)' : 'rgba(0,0,0,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const grassPalette = ['#2a1208cc', '#5a2a18aa', '#1a0a06cc', '#7a3a22aa'];
  ctx.lineWidth = 1;
  for (let i = 0; i < Math.floor(area / 1100); i += 1) {
    ctx.strokeStyle = grassPalette[Math.floor(random() * grassPalette.length)];
    const x = random() * width;
    const y = random() * height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + range(-2, 2), y - range(3, 7));
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,100,40,0.12)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < Math.floor(area / 8000); i += 1) {
    const x = random() * width;
    const y = random() * height;
    const span = range(14, 40);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + span / 2, y - range(2, 6), x + span, y);
    ctx.stroke();
  }

  const decor = makeDecor(width, height, boardX, boardY, boardWidth, boardHeight, tile, streamBase, seed);

  if (streamBase - 3 * tile < height) {
    drawStream(ctx, width, tile, streamBase);
  }

  const grounded = decor.filter((item) => item.kind !== 'tree').sort((a, b) => a.y - b.y);
  for (const item of grounded) {
    if (!isVisible(item, width, height)) {
      continue;
    }
    drawDecor(ctx, item, random, tile);
  }

  const trees = decor.filter((item) => item.kind === 'tree').sort((a, b) => a.y - b.y);
  for (const item of trees) {
    if (!isVisible(item, width, height)) {
      continue;
    }
    drawTree(ctx, item, random);
  }

  return canvas;
}

function isVisible(item: DoomDecor, width: number, height: number): boolean {
  const margin = 60 + Math.max(item.radius * 2, item.width);
  return item.x > -margin && item.x < width + margin
    && item.y > -margin && item.y < height + margin;
}

function makeDecor(
  width: number,
  height: number,
  boardX: number,
  boardY: number,
  boardWidth: number,
  boardHeight: number,
  tile: number,
  streamBase: number,
  seed: number
): DoomDecor[] {
  const random = makeRandom(seed + 91);
  const items: DoomDecor[] = [];

  const freeSpot = (x: number, y: number, margin: number): boolean => {
    if (x > boardX - margin && x < boardX + boardWidth + margin
      && y > boardY - margin && y < boardY + boardHeight + margin) {
      return false;
    }
    if (Math.abs(y - streamBase) < 3.6 * tile) {
      return false;
    }
    return x > -6 * tile && x < width + 6 * tile && y > -6 * tile && y < height + 6 * tile;
  };

  const addFixed = (
    kind: DoomDecorKind,
    tileX: number,
    tileY: number,
    radiusTiles: number,
    widthTiles: number,
    heightTiles: number
  ): void => {
    items.push({
      kind,
      x: boardX + tileX * tile,
      y: boardY + tileY * tile,
      radius: radiusTiles * tile,
      variant: 0,
      pink: false,
      width: widthTiles * tile,
      height: heightTiles * tile,
      count: 0
    });
  };

  addFixed('cabin', -8.5, 7, 5, 7, 5);
  addFixed('cabin', 33.5, 19, 5, 7, 5);
  addFixed('cabin', 23.5, -5, 4.5, 6, 4.4);
  addFixed('pond', 1.5, -4.5, 3.6, 7.2, 4.8);
  addFixed('pentagram', -3.6, 3.2, 1.9, 0, 0);
  addFixed('pentagram', 28.6, 23.5, 1.7, 0, 0);
  addFixed('lamp', -2, -2, 0.5, 0, 0);
  addFixed('lamp', 27, -2, 0.5, 0, 0);
  addFixed('lamp', -2, 28, 0.5, 0, 0);
  addFixed('lamp', 27, 28, 0.5, 0, 0);

  items.push({
    kind: 'bridge',
    x: boardX + boardWidth / 2,
    y: streamYAt(streamBase, tile, boardX + boardWidth / 2),
    radius: 2 * tile,
    variant: 0,
    pink: false,
    width: 2.2 * tile,
    height: 2.9 * tile,
    count: 0
  });

  const scatter = (
    kind: DoomDecorKind,
    amount: number,
    minRadius: number,
    spread: number
  ): void => {
    let placed = 0;
    let tries = 0;
    while (placed < amount && tries < 600) {
      tries += 1;
      const x = boardX + (-8 + random() * 41) * tile;
      const y = boardY + (-6 + random() * (boardHeight / tile + 14)) * tile;
      if (!freeSpot(x, y, spread)) {
        continue;
      }
      const radius = (minRadius + random() * 0.6) * tile;
      items.push({
        kind,
        x,
        y,
        radius,
        variant: random(),
        pink: random() < 0.45,
        width: radius * 2,
        height: radius * 2,
        count: 6 + Math.floor(random() * 6)
      });
      placed += 1;
    }
  };

  scatter('tree', 14, 1.5, 4 * tile);
  scatter('rock', 6, 0.5, 3 * tile);
  scatter('bush', 10, 0.6, 3 * tile);
  scatter('flower', 24, 0.4, 2 * tile);

  return items;
}

function drawStream(
  ctx: CanvasRenderingContext2D,
  width: number,
  tile: number,
  streamBase: number
): void {
  const scale = tile / 24;
  const line = (): void => {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 12) {
      const y = streamYAt(streamBase, tile, x);
      if (x === -20) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const layers: ReadonlyArray<readonly [number, string]> = [
    [40, 'rgba(10,2,0,0.6)'],
    [32, '#3a1208'],
    [27, '#ff5a1a'],
    [13, 'rgba(255,220,100,0.75)']
  ];
  for (const layer of layers) {
    ctx.lineWidth = Math.max(1, layer[0] * scale);
    ctx.strokeStyle = layer[1];
    line();
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 16) {
    const y = streamYAt(streamBase, tile, x) + (Math.sin(x * 0.7) * 9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + (x % 8), y);
    ctx.stroke();
  }
}

function drawDecor(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number,
  tile: number
): void {
  if (item.kind === 'flower') {
    drawFlowers(ctx, item, random);
  } else if (item.kind === 'bush') {
    drawBush(ctx, item, random);
  } else if (item.kind === 'pond') {
    drawPond(ctx, item, random);
  } else if (item.kind === 'pentagram') {
    drawPentagram(ctx, item);
  } else if (item.kind === 'lamp') {
    drawLamp(ctx, item, tile);
  } else if (item.kind === 'bridge') {
    drawBridge(ctx, item, tile);
  } else if (item.kind === 'cabin') {
    drawCabin(ctx, item, random);
  } else if (item.kind === 'rock') {
    drawRock(ctx, item, random);
  }
}

function drawFlowers(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number
): void {
  const variant = item.variant;
  const palette = variant < 0.3
    ? ['#8a0a0a', '#5a0606']
    : variant < 0.55
      ? ['#d8d0b8', '#a89f88']
      : variant < 0.8
        ? ['#ff6a1a', '#c0300a']
        : ['#2a2220', '#1a1514'];
  for (let i = 0; i < item.count; i += 1) {
    const color = palette[Math.floor(random() * palette.length)];
    blob(
      ctx,
      item.x + (random() - 0.5) * 32,
      item.y + (random() - 0.5) * 24,
      2.2 + random() * 1.6,
      1.2 + random(),
      color,
      0
    );
  }
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number
): void {
  blob(ctx, item.x + 3, item.y + 4, item.radius, item.radius * 0.7, 'rgba(0,0,0,0.3)', 0);
  for (let i = 0; i < 4; i += 1) {
    const px = item.x + (random() - 0.5) * item.radius;
    const py = item.y + (random() - 0.5) * item.radius * 0.8;
    const r = item.radius * 0.7;
    const gradient = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, r);
    gradient.addColorStop(0, '#7a3a22');
    gradient.addColorStop(1, '#1a0a06');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPond(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number
): void {
  const rx = item.width / 2;
  const ry = item.height / 2;
  blob(ctx, item.x + 3, item.y + 4, rx * 1.05, ry * 1.05, 'rgba(0,0,0,0.25)', 0);
  blob(ctx, item.x, item.y, rx * 1.1, ry * 1.12, '#4a4a4a', 0);
  const water = ctx.createLinearGradient(
    item.x - rx, item.y - ry, item.x + rx, item.y + ry
  );
  water.addColorStop(0, '#9aff4a');
  water.addColorStop(1, '#128a12');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.ellipse(item.x, item.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,40,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const angle = random() * Math.PI * 2;
    const length = 0.3 + random() * 0.5;
    ctx.beginPath();
    ctx.moveTo(item.x + Math.cos(angle) * rx * 0.1, item.y + Math.sin(angle) * ry * 0.1);
    ctx.lineTo(item.x + Math.cos(angle + 0.2) * rx * length * 0.6, item.y + Math.sin(angle + 0.2) * ry * length);
    ctx.lineTo(item.x + Math.cos(angle - 0.1) * rx * length, item.y + Math.sin(angle - 0.1) * ry * length * 1.1);
    ctx.stroke();
  }
  blob(ctx, item.x - rx * 0.35, item.y - ry * 0.4, rx * 0.3, ry * 0.1, 'rgba(255,255,255,0.85)', -0.3);
  for (let i = 0; i < 9; i += 1) {
    const angle = i * 0.7 + random() * 0.4;
    blob(
      ctx,
      item.x + Math.cos(angle) * rx * 1.05,
      item.y + Math.sin(angle) * ry * 1.07,
      3 + random() * 2,
      2 + random() * 1.4,
      '#6a6a6a',
      0
    );
  }
}

function drawPentagram(ctx: CanvasRenderingContext2D, item: DoomDecor): void {
  const radius = item.radius;
  ctx.save();
  ctx.shadowColor = 'rgba(255,40,20,0.9)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#c8160c';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 5; i += 1) {
    const angle = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = item.x + Math.cos(angle) * radius;
    const py = item.y + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawLamp(ctx: CanvasRenderingContext2D, item: DoomDecor, tile: number): void {
  const scale = tile / 24;
  blob(ctx, item.x + 2 * scale, item.y + 3 * scale, 5 * scale, 3.5 * scale, 'rgba(0,0,0,0.35)', 0);
  const stone = ctx.createRadialGradient(
    item.x - 1.5 * scale, item.y - 1.5 * scale, 0.5,
    item.x, item.y, 4.2 * scale
  );
  stone.addColorStop(0, '#7b7268');
  stone.addColorStop(1, '#2f2a27');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.arc(item.x, item.y, 4.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  const light = ctx.createRadialGradient(
    item.x - scale, item.y - scale, 0.5,
    item.x, item.y, 2.6 * scale
  );
  light.addColorStop(0, '#fff6cf');
  light.addColorStop(1, '#ffc561');
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(item.x, item.y, 2.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  blob(ctx, item.x - 2.6 * scale, item.y - 3 * scale, 2.4 * scale, 1.2 * scale, '#ffffff', 0);
}

function drawBridge(ctx: CanvasRenderingContext2D, item: DoomDecor, tile: number): void {
  const scale = tile / 24;
  const bx = item.x - 26 * scale;
  const by = item.y - 34 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(bx + 4 * scale, by + 5 * scale, 52 * scale, 68 * scale);
  let index = 0;
  for (let yy = by; yy < by + 68 * scale; yy += 5 * scale) {
    ctx.fillStyle = index % 2 ? '#8c6342' : '#795634';
    ctx.fillRect(bx + 2 * scale, yy, 48 * scale, 4.2 * scale);
    ctx.fillStyle = 'rgba(255,230,190,0.25)';
    ctx.fillRect(bx + 2 * scale, yy, 48 * scale, 0.8 * scale);
    index += 1;
  }
  ctx.fillStyle = '#4f3622';
  ctx.fillRect(bx, by, 4 * scale, 68 * scale);
  ctx.fillRect(bx + 48 * scale, by, 4 * scale, 68 * scale);
  const bolts: ReadonlyArray<readonly [number, number]> = [
    [bx - scale, by - scale],
    [bx + 47 * scale, by - scale],
    [bx - scale, by + 63 * scale],
    [bx + 47 * scale, by + 63 * scale]
  ];
  for (const bolt of bolts) {
    ctx.fillStyle = '#3a281a';
    ctx.fillRect(bolt[0], bolt[1], 6 * scale, 6 * scale);
    blob(ctx, bolt[0] + 3 * scale, bolt[1] + scale, 2.8 * scale, 1.6 * scale, '#d9a020', 0);
  }
  blob(ctx, bx + 26 * scale, by + 20 * scale, 7 * scale, 2.6 * scale, 'rgba(255,120,30,0.6)', 0.2);
}

function drawCabin(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number
): void {
  const w = item.width;
  const h = item.height;
  const left = item.x - w / 2;
  const top = item.y - h / 2;
  const radius = Math.min(w, h) * 0.08;
  const corners: [number, number, number, number] = [radius, radius, radius, radius];

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundedRectPath(ctx, left + 6, top + 8, w, h, corners);
  ctx.fill();

  ctx.save();
  roundedRectPath(ctx, left, top, w, h, corners);
  ctx.clip();
  const upper = ctx.createLinearGradient(left, top, left, item.y);
  upper.addColorStop(0, '#6a6e76');
  upper.addColorStop(1, '#555a62');
  ctx.fillStyle = upper;
  ctx.fillRect(left, top, w, h / 2);
  const lower = ctx.createLinearGradient(left, item.y, left, top + h);
  lower.addColorStop(0, '#3a3d44');
  lower.addColorStop(1, '#2a2d32');
  ctx.fillStyle = lower;
  ctx.fillRect(left, item.y, w, h / 2);

  ctx.strokeStyle = 'rgba(40,20,20,0.22)';
  ctx.lineWidth = 1;
  for (let row = 0; row < Math.floor(h / 6); row += 1) {
    ctx.beginPath();
    ctx.moveTo(left, top + row * 6);
    ctx.lineTo(left + w, top + row * 6);
    for (let xx = left + (row % 2) * 5; xx < left + w; xx += 10) {
      ctx.moveTo(xx, top + row * 6);
      ctx.lineTo(xx, top + row * 6 + 6);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 16; i += 1) {
    blob(
      ctx,
      left + random() * w,
      top + random() * h,
      8 + random() * 10,
      4 + random() * 4,
      'rgba(160,70,30,0.35)',
      0
    );
  }
  ctx.restore();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#9aa0a8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left + 3, item.y);
  ctx.lineTo(left + w - 3, item.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left + 3, item.y + 2.8);
  ctx.lineTo(left + w - 3, item.y + 2.8);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(45,25,25,0.5)';
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, left, top, w, h, corners);
  ctx.stroke();

  const cx = item.x + w * 0.25;
  const cy = item.y - h * 0.22;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - 2, cy - 1, 12, 12);
  ctx.fillStyle = '#8c8179';
  ctx.fillRect(cx - 6, cy - 6, 12, 12);
  ctx.fillStyle = '#2b2523';
  ctx.fillRect(cx - 3.5, cy - 3.5, 7, 7);
  blob(ctx, cx - 4, cy - 5, 3, 1.5, '#44484e', 0);
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number
): void {
  const r = item.radius;
  blob(ctx, item.x + 3, item.y + 5, r * 1.1, r * 0.7, 'rgba(0,0,0,0.35)', 0);
  const gradient = ctx.createLinearGradient(
    item.x - r, item.y - r, item.x + r, item.y + r
  );
  gradient.addColorStop(0, '#7a4a3a');
  gradient.addColorStop(1, '#2a1410');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(item.x, item.y, r, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  blob(ctx, item.x - r * 0.3, item.y - r * 0.35, r * 0.6, r * 0.28, '#9a5a3e', 0);
  if (random() < 0.6) {
    blob(ctx, item.x + r * 0.4, item.y - r * 0.2, r * 0.25, r * 0.15, '#5a3022', 0);
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  item: DoomDecor,
  random: () => number
): void {
  const r = item.radius;
  const palette = item.pink
    ? ['#8a2a1a', '#4a1410', '#1a0604']
    : ['#4a4038', '#2a2420', '#12100e'];
  blob(ctx, item.x + r * 0.3, item.y + r * 0.4, r * 1.3, r, 'rgba(0,0,0,0.34)', 0);
  for (let i = 0; i < 11; i += 1) {
    const angle = i * 0.62 + random() * 2;
    const distance = i === 0 ? 0 : r * (0.3 + random() * 0.45);
    const px = item.x + Math.cos(angle) * distance;
    const py = item.y + Math.sin(angle) * distance;
    const pr = Math.max(1, r * (0.36 + random() * 0.2));
    const crown = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 1, px, py, pr);
    crown.addColorStop(0, palette[0]);
    crown.addColorStop(0.55, palette[1]);
    crown.addColorStop(1, palette[2]);
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 24; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * r * 0.85;
    const speckColor = item.pink
      ? (random() < 0.6 ? 'rgba(255,120,40,0.85)' : 'rgba(10,0,0,0.5)')
      : (random() < 0.5 ? 'rgba(120,110,100,0.6)' : 'rgba(5,5,5,0.5)');
    blob(
      ctx,
      item.x + Math.cos(angle) * distance - r * 0.1,
      item.y + Math.sin(angle) * distance - r * 0.1,
      1.2 + random() * 1.4,
      1 + random(),
      speckColor,
      0
    );
  }
  for (let i = 0; i < 8; i += 1) {
    blob(
      ctx,
      item.x + (0.4 + random() * 1.5) * r * 0.5,
      item.y + (0.2 + random() * 1.5) * r * 0.5,
      3 + random() * 3,
      1.5 + random() * 1.5,
      'rgba(0,0,0,0.3)',
      0
    );
  }
}