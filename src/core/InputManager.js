import { Vector2D } from '../navigation/Vector2D.js';

export class InputManager {
  constructor(canvas, partyManager) {
    this.canvas = canvas;
    this.party = partyManager;

    // Sol Tık: Seçim & Kutu Seçimi (Box Select)
    this.isLeftDragging = false;
    this.leftDragStart = new Vector2D(0, 0);
    this.leftDragEnd = new Vector2D(0, 0);

    // Sağ Tık: Formasyon Yönlendirme Oku & Hareket
    this.isRightDragging = false;
    this.rightDragStart = new Vector2D(0, 0);
    this.rightDragEnd = new Vector2D(0, 0);

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
        // Sol tık - Kutu Seçimi Başlangıcı
        this.isLeftDragging = true;
        this.leftDragStart.set(mouseX, mouseY);
        this.leftDragEnd.set(mouseX, mouseY);
      } else if (e.button === 2) {
        // Sağ tık - Formasyon Yönlendirme / Hedefe Hareket Başlangıcı
        this.isRightDragging = true;
        this.rightDragStart.set(mouseX, mouseY);
        this.rightDragEnd.set(mouseX, mouseY);
      }
    });

    window.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.mousePos.set(mouseX, mouseY);

      if (this.isLeftDragging) {
        this.leftDragEnd.set(mouseX, mouseY);
      }
      if (this.isRightDragging) {
        this.rightDragEnd.set(mouseX, mouseY);
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
      // 1. Sol Tık Bırakma: Seçim Tamamlama
      if (e.button === 0 && this.isLeftDragging) {
        this.isLeftDragging = false;
        const dist = this.leftDragStart.dist(this.leftDragEnd);

        if (dist > 8) {
          // Kutu Seçimi (Box Select)
          const minX = Math.min(this.leftDragStart.x, this.leftDragEnd.x);
          const maxX = Math.max(this.leftDragStart.x, this.leftDragEnd.x);
          const minY = Math.min(this.leftDragStart.y, this.leftDragEnd.y);
          const maxY = Math.max(this.leftDragStart.y, this.leftDragEnd.y);
          this.party.selectInRect(minX, minY, maxX, maxY);
        } else {
          // Tekil Tık Seçimi
          const allUnits = this.party.getAllFieldUnits();
          const clickedUnit = allUnits.find(u => {
            return !u.isDead && u.position.dist(this.leftDragStart) <= u.radius + 8;
          });

          if (clickedUnit) {
            this.party.selectUnit(clickedUnit, e.shiftKey);
          } else if (!e.shiftKey) {
            this.party.clearSelection();
          }
        }
      }

      // 2. Sağ Tık Bırakma: Ok Yönlendirmeli Formasyon veya Normal Hareket
      if (e.button === 2 && this.isRightDragging) {
        this.isRightDragging = false;
        const dist = this.rightDragStart.dist(this.rightDragEnd);

        // Tıklanan noktada düşman var mı kontrol et
        const clickedEnemy = this.party.getEnemyUnits().find(u => {
          return !u.isDead && u.position.dist(this.rightDragStart) <= u.radius + 10;
        });

        if (clickedEnemy && dist <= 12) {
          // Düşmana saldırı emri
          this.party.attackTargetWithSelected(clickedEnemy);
        } else {
          // Sağ tık basılı tutup bir yöne çekildiyse (dist > 15):
          // Karakterler okun başladığı noktaya gidip okun baktığı yöne doğru dikine pozisyon alırlar!
          if (dist > 15) {
            const dir = Vector2D.sub(this.rightDragEnd, this.rightDragStart);
            const facingAngle = dir.heading();
            this.party.moveSelectedUnits(this.rightDragStart, facingAngle);
          } else {
            // Tek tıkla normal hareket
            this.party.moveSelectedUnits(this.rightDragStart);
          }
        }
      }
    });

    // Klavye kısayolları
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // 1: Sadece Muhafızları Seç
      if (e.key === '1') {
        this.party.selectGuardians();
      }
      // 2: Muhafız Olmayan Diğer Karakterleri Seç
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
    // 1. Sol Tık Kutu Seçimi (Box Selection)
    if (this.isLeftDragging && this.leftDragStart.dist(this.leftDragEnd) > 8) {
      const minX = Math.min(this.leftDragStart.x, this.leftDragEnd.x);
      const maxX = Math.max(this.leftDragStart.x, this.leftDragEnd.x);
      const minY = Math.min(this.leftDragStart.y, this.leftDragEnd.y);
      const maxY = Math.max(this.leftDragStart.y, this.leftDragEnd.y);

      ctx.save();
      ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.restore();
    }

    // 2. Sağ Tık Yönlendirme Oku (Right-Click Drag-to-Aim Arrow)
    if (this.isRightDragging) {
      const dist = this.rightDragStart.dist(this.rightDragEnd);
      const selected = this.party.getSelectedUnits().filter(u => !u.isDead);

      if (selected.length > 0 && dist > 12) {
        const angle = Vector2D.sub(this.rightDragEnd, this.rightDragStart).heading();
        const arrowLength = Math.max(35, Math.min(dist, 140));

        ctx.save();
        ctx.translate(this.rightDragStart.x, this.rightDragStart.y);
        ctx.rotate(angle);

        // Başlangıç Çemberi
        ctx.fillStyle = '#00d2d3';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Ok Gövdesi
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrowLength, 0);
        ctx.stroke();

        // Ok Ucu (Üçgen)
        const headLen = 14;
        ctx.fillStyle = '#00d2d3';
        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(arrowLength - headLen, -headLen * 0.55);
        ctx.lineTo(arrowLength - headLen, headLen * 0.55);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  }
}
