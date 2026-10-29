import type { DoomBossService } from '../logic/doom/DoomBossService';
import type { DoomShape } from '../logic/doom/DoomBossModel';
import type { DoomDirection } from '../logic/doom/DoomGraph';
import { type GridLayout } from './GridView';

interface VertexData {
  phase: number;
  freq: number;
}

interface Point {
  x: number;
  y: number;
}

interface RiftColor {
  fill: string;
  stroke: string;
  core: string;
  glow: string;
}

export class AbyssBossView {
  private readonly vertexData: VertexData[][] = [];
  private time = 0;

  constructor() {
    for (let layer = 0; layer < 6; layer++) {
      const layerData: VertexData[] = [];
      for (let v = 0; v < 40; v++) {
        layerData.push({
          phase: Math.random() * Math.PI * 2,
          freq: 0.5 + Math.random() * 2,
        });
      }
      this.vertexData.push(layerData);
    }
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    boss: DoomBossService,
    layout: GridLayout,
    time: number
  ): void {
    this.time = time;
    const state = boss.renderState;
    const cx = layout.offsetX + state.x * layout.tileSize;
    const cy = layout.offsetY + state.y * layout.tileSize;
    const baseSize = layout.tileSize * 0.4;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = state.alpha;

    this.drawAura(ctx, baseSize, state.chaos);
    this.drawRift(ctx, baseSize, state.chaos, state.shape, state.progress, state.dir);
    this.drawVoid(ctx, baseSize, state.chaos, state.shape, state.progress, state.dir);

    ctx.restore();
  }

  private drawAura(ctx: CanvasRenderingContext2D, baseSize: number, chaos: number): void {
    const maxR = baseSize * (1.1 + chaos * 0.3);
    const layers = [
      { r: maxR, color: 'rgba(17, 0, 5, 0.16)' },
      { r: maxR * 0.85, color: 'rgba(34, 0, 17, 0.2)' },
      { r: maxR * 0.7, color: 'rgba(51, 0, 17, 0.16)' },
    ];
    for (const layer of layers) {
      ctx.beginPath();
      ctx.arc(0, 0, layer.r, 0, Math.PI * 2);
      ctx.fillStyle = layer.color;
      ctx.fill();
    }
  }

  private getDirAngle(dir: DoomDirection): number {
    if (dir === 'UP') return -Math.PI / 2;
    if (dir === 'DOWN') return Math.PI / 2;
    if (dir === 'LEFT') return Math.PI;
    return 0;
  }

  private getDeformedPoints(
    layerIdx: number,
    baseR: number,
    deformScale: number,
    chaos: number,
    shape: DoomShape,
    progress: number,
    dir: DoomDirection
  ): Point[] {
    const vertCount = 40;
    const points: Point[] = [];
    const t = this.time * (1.0 + chaos * 2.0);

    for (let i = 0; i < vertCount; i++) {
      const baseAngle = (i / vertCount) * Math.PI * 2;
      const data = this.vertexData[layerIdx][i];
      const noise =
        Math.sin(t * data.freq * 2 + data.phase) * 0.5 +
        Math.sin(t * data.freq * 3.7 + data.phase * 2.3) * 0.3 +
        Math.sin(t * data.freq * 1.3 + data.phase * 0.7) * 0.2;

      const deform = noise * baseR * 0.4 * deformScale * (0.5 + chaos * 0.5);
      let r = baseR + deform;
      const angle = baseAngle;

      if (shape === 'wedge') {
        const dirAngle = this.getDirAngle(dir);
        const angleDiff = Math.cos(angle - dirAngle);
        if (angleDiff > 0) {
          r *= 1.0 + 0.5 * progress * angleDiff;
        } else {
          r *= 0.75;
        }
      } else if (shape === 'cross') {
        const spike = Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        r *= 1.0 + 0.35 * progress * spike;
      } else if (shape === 'shrink') {
        r *= 0.2 + 0.8 * (1 - progress);
      } else if (shape === 'lobes') {
        const lobe = Math.cos(angle * 3);
        r *= 1.0 + 0.25 * progress * lobe;
      } else if (shape === 'stunned') {
        r += Math.sin(t * 20 + i) * baseR * 0.08;
      }

      points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }
    return points;
  }

  private drawRift(
    ctx: CanvasRenderingContext2D,
    baseSize: number,
    chaos: number,
    shape: DoomShape,
    progress: number,
    dir: DoomDirection
  ): void {
    const layerCount = 1 + Math.floor(chaos * 3);
    const colors: RiftColor[] = [
      { fill: '#440011', stroke: '#880022', core: '#aa1133', glow: '#660022' },
      { fill: '#550015', stroke: '#aa1133', core: '#cc2244', glow: '#880033' },
      { fill: '#660018', stroke: '#cc2244', core: '#ee3355', glow: '#aa0044' },
      { fill: '#77001c', stroke: '#ee3355', core: '#ff4466', glow: '#cc0055' },
    ];

    for (let layer = 0; layer < layerCount; layer++) {
      const layerT = layer / Math.max(1, layerCount);
      const baseR = baseSize * (0.85 + 0.3 * layerT);
      const deformScale = 0.4 + layerT * 0.6;
      const color = colors[layer % colors.length];
      const points = this.getDeformedPoints(layer, baseR, deformScale, chaos, shape, progress, dir);

      ctx.shadowColor = color.glow;
      ctx.shadowBlur = baseSize * 1.2 * chaos;
      ctx.lineWidth = Math.max(1.5, baseSize * 0.35);
      ctx.strokeStyle = color.glow;
      this.strokePath(ctx, points);

      ctx.shadowBlur = baseSize * 0.6;
      ctx.lineWidth = Math.max(1, baseSize * 0.18);
      ctx.strokeStyle = color.stroke;
      this.strokePath(ctx, points);

      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(0.75, baseSize * 0.09);
      ctx.strokeStyle = color.core;
      this.strokePath(ctx, points);
    }
  }

  private strokePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
    if (points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawVoid(
    ctx: CanvasRenderingContext2D,
    baseSize: number,
    chaos: number,
    shape: DoomShape,
    progress: number,
    dir: DoomDirection
  ): void {
    const points = this.getDeformedPoints(0, baseSize, 0.5, chaos, shape, progress, dir);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = '#000000';
    ctx.fill();
  }
}