import { Vector2D } from '../navigation/Vector2D.js';

export class Camera {
  constructor(viewportWidth = 800, viewportHeight = 600) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.active = false;

    // Yakınlaştırma & Uzaklaştırma (Zoom) - 4800x3600 Harita için Optimize Edildi
    this.zoom = 0.8;
    this.targetZoom = 0.8;
    this.minZoom = 0.25; // Maksimum uzaklaşma (Tüm bölgeyi gösterir)
    this.maxZoom = 2.5;  // Maksimum yakınlaşma (Detaylı yakın dövüş)
  }

  setViewportSize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  adjustZoom(delta) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom + delta));
  }

  setZoom(value) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
    this.zoom = this.targetZoom;
  }

  /**
   * Kamerayı her zaman oyuncu karakterlerinin tam merkezinde tutar.
   */
  follow(targetPos, mapWidth = null, mapHeight = null, lerpFactor = 0.12) {
    if (!this.active) {
      this.x = 0;
      this.y = 0;
      return;
    }

    if (targetPos) {
      this.targetX = targetPos.x;
      this.targetY = targetPos.y;
    }

    // Yumuşak kamera ve zoom takibi (Lerp)
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;
    this.zoom += (this.targetZoom - this.zoom) * 0.15;
  }

  /**
   * Ekran (fare / canvas) piksel koordinatını Dünya (World) koordinatına çevirir.
   */
  screenToWorld(screenPos) {
    if (!this.active) return screenPos.clone();
    const dx = screenPos.x - this.viewportWidth / 2;
    const dy = screenPos.y - this.viewportHeight / 2;
    return new Vector2D(this.x + dx / this.zoom, this.y + dy / this.zoom);
  }

  /**
   * Dünya koordinatını Ekran koordinatına çevirir.
   */
  worldToScreen(worldPos) {
    if (!this.active) return worldPos.clone();
    const sx = this.viewportWidth / 2 + (worldPos.x - this.x) * this.zoom;
    const sy = this.viewportHeight / 2 + (worldPos.y - this.y) * this.zoom;
    return new Vector2D(sx, sy);
  }

  begin(ctx) {
    if (!this.active) return;
    ctx.save();
    // Ekran merkezine taşı, zoom uygula ve kamera konumunu merkezle
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  end(ctx) {
    if (!this.active) return;
    ctx.restore();
  }
}
