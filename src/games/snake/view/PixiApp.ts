import { Application, Container } from "pixi.js";

export class PixiApp {
  public readonly app: Application;

  constructor() {
    this.app = new Application();
  }

  public async init(
    canvasParent: HTMLDivElement,
    width: number,
    height: number,
    background: number,
  ): Promise<void> {
    await this.app.init({
      width,
      height,
      background,
      antialias: true,
    });

    canvasParent.appendChild(this.app.canvas);
  }

  public get stage(): Container {
    return this.app.stage;
  }

  public addTickerCallback(callback: (deltaMS: number) => void): void {
    this.app.ticker.add((ticker) => {
      callback(ticker.deltaMS);
    });
  }

  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    this.app.canvas.style.width = `${width}px`;
    this.app.canvas.style.height = `${height}px`;
  }

  public destroy(): void {
    this.app.destroy(true, { children: true });
  }
}