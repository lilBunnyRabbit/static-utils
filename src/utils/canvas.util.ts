export class CanvasRenderer {
  readonly ctx!: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = this.canvas.getContext("2d");
  }

  public clear(): this {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  public fill(color: string, ...args: Partial<Parameters<CanvasRect["clearRect"]>>): this {
    this.ctx.fillStyle = color;

    const [x = 0, y = 0, w = this.canvas.width, h = this.canvas.height] = args;
    this.ctx.fillRect(x, y, w, h);

    return this;
  }
}
