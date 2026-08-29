import { PartyManager } from '../entities/PartyManager.js';
import { InputManager } from './InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { MultiplayerSync } from '../network/MultiplayerSync.js';
import { LobbyUI } from '../ui/LobbyUI.js';
import { EventBus } from './EventBus.js';

export class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.lastTime = performance.now();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Ağ ve Senkronizasyon
    this.networkManager = new NetworkManager();
    this.partyManager = new PartyManager();
    this.multiplayerSync = new MultiplayerSync(this, this.networkManager);
    this.partyManager.setSync(this.multiplayerSync);

    this.inputManager = new InputManager(this.canvas, this.partyManager);
    this.uiManager = new UIManager(this.partyManager, this.multiplayerSync);
    this.lobbyUI = new LobbyUI(this, this.networkManager);

    this.gameMode = 'solo'; // 'solo' veya 'coop'
    this.isHost = true;

    this.bindEvents();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight || 650;
    if (this.partyManager && this.partyManager.spawner) {
      this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    }
  }

  bindEvents() {
    EventBus.on('match:restart', () => {
      this.restartGame(false);
    });
  }

  startSoloGame() {
    this.gameMode = 'solo';
    this.isHost = true;
    this.partyManager.initParties(true, true);
    this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    this.uiManager.updateModeDisplay('Solo PvE Modu');
    this.uiManager.renderPartyCards();
  }

  async hostMultiplayerGame() {
    this.gameMode = 'coop';
    this.isHost = true;
    const roomId = await this.networkManager.hostRoom();
    this.partyManager.initParties(true, false);
    this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    this.uiManager.updateModeDisplay(`Co-op Oda: ${roomId} (Host - Müttefikler Bekleniyor)`);
    this.uiManager.renderPartyCards();
    return roomId;
  }

  async joinMultiplayerGame(roomId) {
    this.gameMode = 'coop';
    this.isHost = false;
    await this.networkManager.joinRoom(roomId);
    this.partyManager.initParties(false, false);
    this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    this.uiManager.updateModeDisplay(`Co-op Oda: ${roomId} (Müttefik Ordusu Bağlandı)`);
    this.uiManager.renderPartyCards();
    return roomId;
  }

  restartGame(isRemoteTriggered = false) {
    if (this.gameMode === 'solo') {
      this.startSoloGame();
    } else {
      this.partyManager.initParties(this.networkManager.isHost, false);
    }
    this.uiManager.hideEndGameModal();
    this.uiManager.renderPartyCards();
    this.uiManager.showToast('Yeni Savunma Başladı!', 'info');
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
    this.multiplayerSync.update(deltaTime);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Izgara Arka Plan Çizimi
    this.drawGrid();

    // Birimler, Düşmanlar, Mermiler ve Spawner
    this.partyManager.render(this.ctx);

    // Seçim Kutusu
    this.inputManager.render(this.ctx);
  }

  drawGrid() {
    const gridSize = 40;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

    // Savunma ve Düşman Bölgesi İşaretleri
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🛡️ SAVUNMA HATTI', 20, 25);

    this.ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('👹 CANAVAR TEHDİDİ', this.canvas.width - 20, 25);

    this.ctx.restore();
  }
}
