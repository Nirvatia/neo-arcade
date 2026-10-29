import type { TeleportView } from '../contracts/SeasonRenderBundle';
import { blob, canvasContext, doomCanvas, glowTexture, makeTexture, roundedRectPath } from './DoomTextures';

let padTexture: HTMLCanvasElement | null = null;
let swirlTexture: HTMLCanvasElement | null = null;
let ringTexture: HTMLCanvasElement | null = null;

const BASE_TILE = 24;

function portalTime(): number {
  return typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
}

function getPadTexture(): HTMLCanvasElement {
  if (!padTexture) {
    padTexture = makeTexture(BASE_TILE, BASE_TILE, (ctx) => {
      blob(ctx, 13.5, 14, 10, 9.5, 'rgba(0,0,0,0.38)', 0);
      const gradient = ctx.createLinearGradient(0, 0, BASE_TILE, BASE_TILE);
      gradient.addColorStop(0, '#5a5f68');
      gradient.addColorStop(1, '#24262a');
      ctx.fillStyle = gradient;
      roundedRectPath(ctx, 1.5, 1.5, BASE_TILE - 3, BASE_TILE - 3, [6, 6, 6, 6]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      roundedRectPath(ctx, 2.5, 2.5, BASE_TILE - 5, BASE_TILE - 5, [5, 5, 5, 5]);
      ctx.stroke();
      const core = ctx.createRadialGradient(12, 12, 1, 12, 12, 8.5);
      core.addColorStop(0, '#ffd8c8');
      core.addColorStop(0.45, '#ff3020');
      core.addColorStop(1, '#3a0404');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(12, 12, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff8a6a';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const bolts: ReadonlyArray<readonly [number, number]> = [
        [5, 5], [19, 5], [5, 19], [19, 19]
      ];
      for (const bolt of bolts) {
        blob(ctx, bolt[0], bolt[1], 1.5, 1.2, '#9aa0a8', 0);
      }
    });
  }
  return padTexture;
}

function getSwirlTexture(): HTMLCanvasElement {
  if (!swirlTexture) {
    swirlTexture = makeTexture(20, 20, (ctx) => {
      ctx.translate(10, 10);
      ctx.lineCap = 'round';
      for (let arm = 0; arm < 3; arm += 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i <= 20; i += 1) {
          const u = i / 20;
          const angle = u * 3.6 + (arm * Math.PI * 2) / 3;
          const r = 1 + u * 6.8;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    });
  }
  return swirlTexture;
}

function getRingTexture(): HTMLCanvasElement {
  if (!ringTexture) {
    ringTexture = makeTexture(20, 20, (ctx) => {
      ctx.strokeStyle = 'rgba(255,100,70,0.95)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(10, 10, 8.8, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  return ringTexture;
}

export class DoomTeleport implements TeleportView {
  draw(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    tileSize: number,
    token: string
  ): void {
    const time = portalTime();
    const phase = token.length > 1 ? token.charCodeAt(1) : 0;
    const scale = tileSize / BASE_TILE;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.drawImage(getPadTexture(), -tileSize / 2, -tileSize / 2, tileSize, tileSize);

    const glowSize = 19.2 * scale;
    const glowAlpha = Math.max(0, 0.5 + 0.3 * Math.sin(time * 1.8 + phase));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = glowAlpha;
    ctx.drawImage(glowTexture(0xff3a2a), -glowSize / 2, -glowSize / 2, glowSize, glowSize);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0, 0.7 + 0.2 * Math.sin(time * 1.6 + phase * 0.7));
    ctx.save();
    ctx.rotate(time * 0.9);
    const swirlSize = 20 * scale;
    ctx.drawImage(getSwirlTexture(), -swirlSize / 2, -swirlSize / 2, swirlSize, swirlSize);
    ctx.restore();

    ctx.globalAlpha = 0.75;
    ctx.save();
    ctx.rotate(-time * 1.5);
    const innerSize = 12.4 * scale;
    ctx.drawImage(getSwirlTexture(), -innerSize / 2, -innerSize / 2, innerSize, innerSize);
    ctx.restore();

    const breathe = 0.5 + 0.5 * Math.sin(time * 1.8 + phase * 0.7);
    const ringSize = 20 * scale * (0.94 + 0.08 * breathe);
    ctx.globalAlpha = Math.max(0, 0.45 + 0.5 * breathe);
    ctx.drawImage(getRingTexture(), -ringSize / 2, -ringSize / 2, ringSize, ringSize);

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}