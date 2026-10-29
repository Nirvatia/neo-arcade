import type { GhostSpawnToken, MazeView } from '../contracts/SeasonRenderBundle';
import type { MazeColors } from '../contracts/MazePalette';
import { blob, canvasContext, doomCanvas, roundedRectPath } from './DoomTextures';

const WALL_VARIANT_COUNT = 10;
const BASE_TILE = 24;

interface WallAtlas {
  readonly tileSize: number;
  readonly canvases: HTMLCanvasElement[];
}

let wallAtlas: WallAtlas | null = null;

const FLOOR_COLORS = ['#211d1b', '#1e1a18', '#252120'];
const FLOOR_SPECKLE_COLORS = ['#2e2927', '#0f0d0c', '#3a3532'];
const LAIR_SLAB_COLORS = ['#4a4f58', '#454a52', '#50555e'];
const GHOST_TOKEN_COLORS: Record<GhostSpawnToken, string> = {
  BY: '#ff4d4d',
  PY: '#ff9de2',
  IY: '#59f0ff',
  CE: '#ffb14d'
};

function tileRand(tx: number, ty: number, salt: number): number {
  let state = (((tx + 13) * 7919 + (ty + 7) * 104729 + (salt + 3) * 15485863) % 2147483646) + 1;
  state = (state * 16807) % 2147483647;
  return state / 2147483647;
}

export class DoomMaze implements MazeView {
  drawWall(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    _colors: MazeColors,
    tx: number,
    ty: number
  ): void {
    const canvases = wallVariantCanvases(tileSize);
    const roll = tileRand(tx, ty, 0);
    const index = Math.min(canvases.length - 1, Math.floor(roll * canvases.length));
    ctx.drawImage(canvases[index], px, py, tileSize, tileSize);
  }

  drawFloor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    _colors: MazeColors,
    tx: number,
    ty: number
  ): void {
    const scale = tileSize / BASE_TILE;
    const baseIndex = Math.floor(tileRand(tx, ty, 1) * FLOOR_COLORS.length);
    ctx.fillStyle = FLOOR_COLORS[baseIndex];
    ctx.fillRect(px - 0.5, py - 0.5, tileSize + 1, tileSize + 1);
    for (let i = 0; i < 3; i += 1) {
      const salt = 10 + i * 7;
      const colorIndex = Math.floor(tileRand(tx, ty, salt + 1) * FLOOR_SPECKLE_COLORS.length);
      blob(
        ctx,
        px + tileRand(tx, ty, salt + 2) * tileSize,
        py + tileRand(tx, ty, salt + 3) * tileSize,
        (0.6 + tileRand(tx, ty, salt + 4) * 1.4) * scale,
        (0.5 + tileRand(tx, ty, salt + 5)) * scale,
        FLOOR_SPECKLE_COLORS[colorIndex],
        tileRand(tx, ty, salt + 6) * 3
      );
    }
  }

  drawGate(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    _colors: MazeColors,
    _tx: number,
    _ty: number
  ): void {
    const scale = tileSize / BASE_TILE;
    ctx.fillStyle = '#7a5636';
    ctx.fillRect(px, py + tileSize / 2 - 5 * scale, tileSize, 10 * scale);
    ctx.fillStyle = '#a07848';
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect(px, py + tileSize / 2 - 4 * scale + i * 3.3 * scale, tileSize, 1.2 * scale);
    }
    ctx.fillStyle = '#4f3622';
    ctx.fillRect(px, py + tileSize / 2 - 6 * scale, 4 * scale, 12 * scale);
    ctx.fillRect(px + tileSize - 4 * scale, py + tileSize / 2 - 6 * scale, 4 * scale, 12 * scale);
  }

  drawLairFloor(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    _colors: MazeColors,
    tx: number,
    ty: number
  ): void {
    ctx.fillStyle = '#0e0d0d';
    ctx.fillRect(px - 0.5, py - 0.5, tileSize + 1, tileSize + 1);
    const half = tileSize / 2;
    for (let i = 0; i < 2; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        const salt = 30 + i * 2 + j;
        const colorIndex = Math.floor(tileRand(tx, ty, salt) * LAIR_SLAB_COLORS.length);
        ctx.fillStyle = LAIR_SLAB_COLORS[colorIndex];
        const inset = Math.max(1, tileSize * 0.04);
        roundedRectPath(
          ctx,
          px + i * half + inset,
          py + j * half + inset,
          half - inset * 2,
          half - inset * 2,
          [3, 3, 3, 3]
        );
        ctx.fill();
      }
    }
    blob(
      ctx,
      px + tileRand(tx, ty, 40) * tileSize,
      py + tileRand(tx, ty, 41) * tileSize,
      3 * (tileSize / BASE_TILE),
      1.4 * (tileSize / BASE_TILE),
      'rgba(255,255,255,0.9)',
      0
    );
  }

  drawPlayerSpawn(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    _colors: MazeColors,
    _tx: number,
    _ty: number
  ): void {
    const cx = px + tileSize / 2;
    const cy = py + tileSize / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,80,40,0.35)';
    ctx.lineWidth = Math.max(1, tileSize * 0.05);
    ctx.beginPath();
    ctx.arc(cx, cy, tileSize * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,60,0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, tileSize * 0.08), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGhostSpawn(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tileSize: number,
    token: GhostSpawnToken,
    _colors: MazeColors,
    _tx: number,
    _ty: number
  ): void {
    const cx = px + tileSize / 2;
    const cy = py + tileSize / 2;
    const color = GHOST_TOKEN_COLORS[token] ?? '#ffffff';
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, tileSize * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, tileSize * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, tileSize * 0.07), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function wallVariantCanvases(tileSize: number): HTMLCanvasElement[] {
  if (wallAtlas && wallAtlas.tileSize === tileSize) {
    return wallAtlas.canvases;
  }
  const canvases: HTMLCanvasElement[] = [];
  for (let variant = 0; variant < WALL_VARIANT_COUNT; variant += 1) {
    canvases.push(paintWallTile(tileSize, variant));
  }
  wallAtlas = { tileSize, canvases };
  return canvases;
}

function paintWallTile(tileSize: number, variant: number): HTMLCanvasElement {
  const size = Math.max(4, Math.floor(tileSize));
  const canvas = doomCanvas(size, size);
  const ctx = canvasContext(canvas);
  const ember = variant === WALL_VARIANT_COUNT - 1;
  const warm = variant === 0;
  const radius = size * 0.22;
  const corners: [number, number, number, number] = [radius, radius, radius, radius];

  ctx.fillStyle = '#15161a';
  ctx.fillRect(0, 0, size, size);

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  if (warm) {
    gradient.addColorStop(0, '#6a3a26');
    gradient.addColorStop(1, '#3a1a10');
  } else {
    const tops = ['#6a7078', '#6f757d', '#646a72'];
    const bottoms = ['#383c42', '#3c4046', '#34383e'];
    gradient.addColorStop(0, tops[variant % tops.length]);
    gradient.addColorStop(1, bottoms[variant % bottoms.length]);
  }
  ctx.fillStyle = gradient;
  roundedRectPath(ctx, 0.6, 0.6, size - 1.2, size - 1.2, corners);
  ctx.fill();

  ctx.save();
  roundedRectPath(ctx, 0.6, 0.6, size - 1.2, size - 1.2, corners);
  ctx.clip();

  const seeded = (salt: number): number => tileRand(variant * 31 + 7, salt, variant);
  for (let i = 0; i < 8; i += 1) {
    const light = seeded(50 + i) < 0.5;
    blob(
      ctx,
      seeded(60 + i) * size,
      seeded(70 + i) * size,
      0.5 + seeded(80 + i),
      0.4 + seeded(90 + i) * 0.6,
      light ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.35)',
      seeded(100 + i) * 3
    );
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  const verticalX = size * (0.25 + seeded(110) * 0.5);
  ctx.beginPath();
  ctx.moveTo(verticalX, 0);
  ctx.lineTo(verticalX, size * 0.6);
  ctx.lineTo(verticalX, size);
  ctx.stroke();

  const offset = variant % 2 === 0 ? size * 0.34 : size * 0.66;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.moveTo(offset, 0);
  ctx.lineTo(offset, size / 2);
  ctx.moveTo(size - offset, size / 2);
  ctx.lineTo(size - offset, size);
  ctx.stroke();

  if (warm) {
    for (let i = 0; i < 14; i += 1) {
      const palette = ['#a0502a', '#5a2a14', '#c87a3a'];
      blob(
        ctx,
        seeded(120 + i) * size,
        seeded(140 + i) * size,
        1.5 + seeded(160 + i) * 1.5,
        0.8 + seeded(180 + i) * 0.8,
        palette[Math.floor(seeded(200 + i) * palette.length)],
        seeded(220 + i) * 3
      );
    }
  } else {
    const mossCount = seeded(240) < 0.5 ? 2 : 1;
    for (let i = 0; i < mossCount; i += 1) {
      blob(
        ctx,
        seeded(250 + i) * size * 0.7 + 3,
        seeded(260 + i) * size * 0.55 + 3,
        5 + seeded(270 + i) * 4,
        3 + seeded(280 + i) * 2.5,
        '#8a9098',
        0
      );
      blob(
        ctx,
        seeded(290 + i) * size * 0.8,
        seeded(300 + i) * size * 0.6,
        3 + seeded(310 + i) * 3,
        1.5 + seeded(320 + i) * 1.5,
        '#aab0b8',
        0
      );
    }
  }

  if (ember) {
    const ex = size * 0.3 + seeded(330) * size * 0.4;
    const ey = size * 0.3 + seeded(340) * size * 0.4;
    const emberPalette = ['#ff2a1a', '#c01a10', '#ff6a3a'];
    for (let i = 0; i < 4; i += 1) {
      blob(
        ctx,
        ex + seeded(350 + i) * 6 - 3,
        ey + seeded(360 + i) * 5 - 2.5,
        1.8,
        1.8,
        emberPalette[Math.floor(seeded(370 + i) * emberPalette.length)],
        0
      );
    }
    blob(ctx, ex, ey, 1, 1, '#ffd45e', 0);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(200,210,225,0.35)';
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.save();
  ctx.translate(-1.2, -1.2);
  roundedRectPath(ctx, 0.6, 0.6, size - 1.2, size - 1.2, corners);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.save();
  ctx.translate(1.2, 1.2);
  roundedRectPath(ctx, 0.6, 0.6, size - 1.2, size - 1.2, corners);
  ctx.stroke();
  ctx.restore();

  return canvas;
}