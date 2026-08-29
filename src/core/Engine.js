import { PartyManager } from '../entities/PartyManager.js';
import { InputManager } from './InputManager.js';
import { UIManager } from '../ui/UIManager.js';

export class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.lastTime = performance.now();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.partyManager = new PartyManager();
    this.inputManager = new InputManager(this.canvas, this.partyManager);
    this.uiManager = new UIManager(this.partyManager);

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight || 650;
  }

  loop(currentTime) {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.loop);
  }

  update(deltaTime) {
    this.partyManager.update(deltaTime);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Izgara Arka Plan Çizimi
    this.drawGrid();

    // Birimler ve Efektler
    this.partyManager.render(this.ctx);

    // Seçim Kutusu
    this.inputManager.render(this.ctx);
  }

  drawGrid() {
    const gridSize = 40;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}
