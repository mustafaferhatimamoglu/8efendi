import { Vector2D } from '../navigation/Vector2D.js';

export class InputManager {
  constructor(canvas, partyManager) {
    this.canvas = canvas;
    this.party = partyManager;

    this.isDragging = false;
    this.dragStart = new Vector2D(0, 0);
    this.dragEnd = new Vector2D(0, 0);

    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.button === 0) {
        // Sol tık - Seçim & Sürükleme Başlangıcı
        this.isDragging = true;
        this.dragStart.set(mouseX, mouseY);
        this.dragEnd.set(mouseX, mouseY);
      } else if (e.button === 2) {
        // Sağ tık - Hedefe Hareket Komutu
        this.party.commandMove(new Vector2D(mouseX, mouseY));
      }
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      this.dragEnd.set(e.clientX - rect.left, e.clientY - rect.top);
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0 && this.isDragging) {
        this.isDragging = false;
        const dist = this.dragStart.dist(this.dragEnd);

        if (dist > 8) {
          // Kutu Seçimi (Box Select)
          const minX = Math.min(this.dragStart.x, this.dragEnd.x);
          const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
          const minY = Math.min(this.dragStart.y, this.dragEnd.y);
          const maxY = Math.max(this.dragStart.y, this.dragEnd.y);
          this.party.selectInRect(minX, minY, maxX, maxY);
        } else {
          // Tekil Tık Seçimi
          const clickedUnit = this.party.getAllUnits().find(u => {
            return u.position.dist(this.dragStart) <= u.radius + 6;
          });

          if (clickedUnit) {
            this.party.selectUnit(clickedUnit, e.shiftKey);
          } else if (!e.shiftKey) {
            // Boşluğa tıklandıysa ve shift yoksa seçimi temizle
            this.party.clearSelection();
          }
        }
      }
    });

    // Klavye kısayolları
    window.addEventListener('keydown', e => {
      if (e.key >= '1' && e.key <= '8') {
        const index = parseInt(e.key) - 1;
        const units = this.party.getAllUnits();
        if (units[index]) {
          this.party.selectUnit(units[index], e.shiftKey);
        }
      } else if (e.key.toLowerCase() === 'a') {
        this.party.selectAll();
      } else if (e.key.toLowerCase() === 'q') {
        // İlk seçili birimin yeteneğini kullan
        const selected = this.party.getSelectedUnits();
        if (selected.length > 0) {
          selected[0].useSkill(0, selected[0].position);
        }
      }
    });
  }

  render(ctx) {
    // Sürükleme seçim kutusu (Selection Rectangle)
    if (this.isDragging && this.dragStart.dist(this.dragEnd) > 8) {
      const minX = Math.min(this.dragStart.x, this.dragEnd.x);
      const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
      const minY = Math.min(this.dragStart.y, this.dragEnd.y);
      const maxY = Math.max(this.dragStart.y, this.dragEnd.y);

      ctx.save();
      ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.restore();
    }
  }
}
