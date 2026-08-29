import { PartyManager } from '../entities/PartyManager.js';
import { InputManager } from './InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { MultiplayerSync } from '../network/MultiplayerSync.js';
import { LobbyUI } from '../ui/LobbyUI.js';
import { EventBus } from './EventBus.js';
import { Camera } from './Camera.js';
import { AssetManager } from './AssetManager.js';

export class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.lastTime = performance.now();

    // Assetleri Önceden Yükle (Silkroad Haritası ve Canavarlar)
    AssetManager.getInstance().preloadAssets();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Kamera Sistemi
    this.camera = new Camera(this.canvas.width, this.canvas.height);

    // Ağ ve Senkronizasyon
    this.networkManager = new NetworkManager();
    this.partyManager = new PartyManager();
    this.multiplayerSync = new MultiplayerSync(this, this.networkManager);
    this.partyManager.setSync(this.multiplayerSync);

    this.inputManager = new InputManager(this.canvas, this.partyManager, this.camera);
    this.uiManager = new UIManager(this.partyManager, this.multiplayerSync);
    this.lobbyUI = new LobbyUI(this, this.networkManager);

    this.gameMode = 'solo'; // 'solo' | 'coop' | 'openworld'
    this.isHost = true;

    this.bindEvents();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight || 650;
    if (this.camera) {
      this.camera.setViewportSize(this.canvas.width, this.canvas.height);
    }
    if (this.partyManager && this.partyManager.spawner && typeof this.partyManager.spawner.setCanvasSize === 'function') {
      this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    }
  }

  bindEvents() {
    EventBus.on('match:restart', () => {
      this.restartGame(false);
    });
  }

  startOpenWorldGame() {
    this.gameMode = 'openworld';
    this.isHost = true;
    this.camera.active = true;
    this.camera.setZoom(0.8);
    this.partyManager.initParties(true, true, true);
    const center = this.partyManager.getPartyCenter();
    this.camera.x = center.x;
    this.camera.y = center.y;
    this.camera.targetX = center.x;
    this.camera.targetY = center.y;
    this.uiManager.updateModeDisplay('🌍 Silkroad Jangan (Açık Dünya)');
    this.uiManager.renderPartyCards();
    this.uiManager.showToast('🏯 Silkroad Jangan Açık Dünya Modu Başladı! 8 Efendi Jangan Kalesinde Hazır.', 'success');
  }

  startSoloGame() {
    this.gameMode = 'solo';
    this.isHost = true;
    this.camera.active = false;
    this.partyManager.initParties(true, true, false);
    if (typeof this.partyManager.spawner.setCanvasSize === 'function') {
      this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    }
    this.uiManager.updateModeDisplay('Solo PvE Dalga Modu');
    this.uiManager.renderPartyCards();
  }

  async hostMultiplayerGame() {
    this.gameMode = 'coop';
    this.isHost = true;
    this.camera.active = false;
    const roomId = await this.networkManager.hostRoom();
    this.partyManager.initParties(true, false, false);
    if (typeof this.partyManager.spawner.setCanvasSize === 'function') {
      this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    }
    this.uiManager.updateModeDisplay(`Co-op Oda: ${roomId} (Host)`);
    this.uiManager.renderPartyCards();
    return roomId;
  }

  async joinMultiplayerGame(roomId) {
    this.gameMode = 'coop';
    this.isHost = false;
    this.camera.active = false;
    await this.networkManager.joinRoom(roomId);
    this.partyManager.initParties(false, false, false);
    if (typeof this.partyManager.spawner.setCanvasSize === 'function') {
      this.partyManager.spawner.setCanvasSize(this.canvas.width, this.canvas.height);
    }
    this.uiManager.updateModeDisplay(`Co-op Oda: ${roomId} (Müttefik)`);
    this.uiManager.renderPartyCards();
    return roomId;
  }

  restartGame(isRemoteTriggered = false) {
    if (this.gameMode === 'openworld') {
      this.startOpenWorldGame();
    } else if (this.gameMode === 'solo') {
      this.startSoloGame();
    } else {
      this.partyManager.initParties(this.networkManager.isHost, false, false);
    }
    this.uiManager.hideEndGameModal();
    this.uiManager.renderPartyCards();
    this.uiManager.showToast('Yeni Oyun Başlatıldı!', 'info');
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

    // Açık Dünya Kamera Takibi
    if (this.gameMode === 'openworld' && this.partyManager.mapManager) {
      const center = this.partyManager.getPartyCenter();
      this.camera.follow(
        center,
        this.partyManager.mapManager.width,
        this.partyManager.mapManager.height
      );
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameMode === 'openworld' && this.partyManager.mapManager) {
      // 1. Kamera Alanına Giriş
      this.camera.begin(this.ctx);

      // Harita Zemin ve Duvarları
      this.partyManager.mapManager.render(this.ctx);

      // Birimler, Spawner'lar ve Mermiler
      this.partyManager.render(this.ctx);

      // Seçim / Yönlendirme Arayüzü (Dünya Koordinatlarında)
      this.inputManager.render(this.ctx);

      // Kamera Alanından Çıkış
      this.camera.end(this.ctx);

      // 2. Ekran Üzeri Mini-Harita (HUD)
      this.drawMiniMap(this.ctx);
    } else {
      // Standart Tek Ekran Dalga Modu
      this.drawGrid();
      this.partyManager.render(this.ctx);
      this.inputManager.render(this.ctx);
    }
  }

  drawMiniMap(ctx) {
    if (!this.partyManager.mapManager) return;

    const mapW = this.partyManager.mapManager.width;
    const mapH = this.partyManager.mapManager.height;

    const miniW = 180;
    const miniH = 135;
    const miniX = this.canvas.width - miniW - 16;
    const miniY = 16;

    const scaleX = miniW / mapW;
    const scaleY = miniH / mapH;

    ctx.save();

    // Mini Harita Arka Planı (Temiz Taktiksel Görünüm)
    ctx.fillStyle = 'rgba(17, 23, 34, 0.92)';
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 1.5;
    ctx.fillRect(miniX, miniY, miniW, miniH);
    ctx.strokeRect(miniX, miniY, miniW, miniH);

    // Mini Harita Başlığı
    ctx.fillStyle = '#00d2d3';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🌍 HARİTA (JANGAN)', miniX + 6, miniY + 12);

    // Duvarların Çizimi
    ctx.fillStyle = '#7f8c8d';
    this.partyManager.mapManager.walls.forEach(w => {
      ctx.fillRect(miniX + w.x * scaleX, miniY + w.y * scaleY, Math.max(1, w.w * scaleX), Math.max(1, w.h * scaleY));
    });

    // 5 Canavar Kampı Noktası (Medusa, LordYarkan, TigerGirl, Chackji, Siren)
    if (this.partyManager.spawner && this.partyManager.spawner.spawners) {
      this.partyManager.spawner.spawners.forEach(s => {
        const sx = miniX + s.position.x * scaleX;
        const sy = miniY + s.position.y * scaleY;
        ctx.fillStyle = s.isCleared ? '#2ecc71' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(sx, sy, s.isCleared ? 3 : 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Müttefik / Oyuncu Birimleri
    ctx.fillStyle = '#2ecc71';
    this.partyManager.getAllUnits().forEach(u => {
      if (!u.isDead) {
        const ux = miniX + u.position.x * scaleX;
        const uy = miniY + u.position.y * scaleY;
        ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
      }
    });

    // Düşman Birimleri
    ctx.fillStyle = '#f39c12';
    this.partyManager.getEnemyUnits().forEach(e => {
      if (!e.isDead) {
        const ex = miniX + e.position.x * scaleX;
        const ey = miniY + e.position.y * scaleY;
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
      }
    });

    // Kamera Görüş Alanı Dikdörtgeni (Zoom Uyumlu Viewport Frame)
    const zoom = this.camera.zoom || 1.0;
    const halfVW = (this.canvas.width / 2) / zoom;
    const halfVH = (this.canvas.height / 2) / zoom;
    const camX = miniX + Math.max(0, (this.camera.x - halfVW) * scaleX);
    const camY = miniY + Math.max(0, (this.camera.y - halfVH) * scaleY);
    const camW = Math.min(miniW, (this.canvas.width / zoom) * scaleX);
    const camH = Math.min(miniH, (this.canvas.height / zoom) * scaleY);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(camX, camY, camW, camH);

    ctx.restore();
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
