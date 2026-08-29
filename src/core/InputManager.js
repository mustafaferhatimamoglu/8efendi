import { Vector2D } from '../navigation/Vector2D.js';

export class InputManager {
  constructor(canvas, partyManager) {
    this.canvas = canvas;
    this.party = partyManager;

    this.isDragging = false;
    this.dragStart = new Vector2D(0, 0);
    this.dragEnd = new Vector2D(0, 0);
    this.mousePos = new Vector2D(0, 0);

    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.mousePos.set(mouseX, mouseY);

      if (e.button === 0) {
        // Sol tık - Seçim & Sürükleme Başlangıcı
        this.isDragging = true;
        this.dragStart.set(mouseX, mouseY);
        this.dragEnd.set(mouseX, mouseY);
      } else if (e.button === 2) {
        // Sağ tık - Hedefe Hareket veya Düşmana Saldırı Komutu
        const clickedEnemy = this.party.getEnemyUnits().find(u => {
          return !u.isDead && u.position.dist(this.mousePos) <= u.radius + 10;
        });

        if (clickedEnemy) {
          // Düşmana saldırı emri
          this.party.attackTargetWithSelected(clickedEnemy);
        } else {
          // Boş alana formasyon hareketi emri
          this.party.moveSelectedUnits(new Vector2D(mouseX, mouseY));
        }
      }
    });

    window.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.mousePos.set(mouseX, mouseY);

      // Sürükleme güncellemesi
      if (this.isDragging) {
        this.dragEnd.set(mouseX, mouseY);
      }

      // Düşman hedefleme hover imleci
      let hoveringEnemy = false;
      this.party.getEnemyUnits().forEach(u => {
        if (!u.isDead && u.position.dist(this.mousePos) <= u.radius + 10) {
          u.isTargetedByHover = true;
          hoveringEnemy = true;
        } else {
          u.isTargetedByHover = false;
        }
      });

      this.canvas.style.cursor = hoveringEnemy ? 'crosshair' : 'default';
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0 && this.isDragging) {
        this.isDragging = false;
        const dist = this.dragStart.dist(this.dragEnd);

        if (dist > 8) {
          // Kutu Seçimi (Box Select) - Yalnızca dost birimleri seçer
          const minX = Math.min(this.dragStart.x, this.dragEnd.x);
          const maxX = Math.max(this.dragStart.x, this.dragEnd.x);
          const minY = Math.min(this.dragStart.y, this.dragEnd.y);
          const maxY = Math.max(this.dragStart.y, this.dragEnd.y);
          this.party.selectInRect(minX, minY, maxX, maxY);
        } else {
          // Tekil Tık Seçimi
          const allUnits = this.party.getAllFieldUnits();
          const clickedUnit = allUnits.find(u => {
            return !u.isDead && u.position.dist(this.dragStart) <= u.radius + 8;
          });

          if (clickedUnit) {
            this.party.selectUnit(clickedUnit, e.shiftKey);
          } else if (!e.shiftKey) {
            // Boşluğa tıklandıysa seçimi temizle
            this.party.clearSelection();
          }
        }
      }
    });

    // Klavye kısayolları
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // 1: Muhafızları Seç (Muhafız-1 ve Muhafız-2)
      if (e.key === '1') {
        this.party.selectGuardians();
      }
      // 2: Diğer Karakterleri Seç (Okçular, Büyücüler, Şifacılar)
      else if (e.key === '2') {
        this.party.selectBackline();
      }
      // 3 - 8: İlgili tekil karakteri seç
      else if (e.key >= '3' && e.key <= '8') {
        const index = parseInt(e.key) - 1;
        const units = this.party.getAllUnits();
        if (units[index]) {
          this.party.selectUnit(units[index], e.shiftKey);
        }
      } else if (e.key.toLowerCase() === 'a') {
        this.party.selectAll();
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
