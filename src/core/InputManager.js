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
        // Sol tık - Yönlendirme / Ok Çizme veya Seçim Başlangıcı
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
        const selected = this.party.getSelectedUnits().filter(u => !u.isDead);

        // Eğer seçili birim varsa ve sol tıkla basılı tutup bir yöne doğru çekildiyse (dist > 15):
        // Okun baktığı yöne ve başlangıç noktasına doğru formasyonla pozisyon aldır!
        if (selected.length > 0 && dist > 15) {
          const dir = Vector2D.sub(this.dragEnd, this.dragStart);
          const facingAngle = dir.heading();
          this.party.moveSelectedUnits(this.dragStart, facingAngle);
        } else if (dist > 8) {
          // Seçili birim yokken veya boş alanda kutu seçimi (Box Select)
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

      // 1: Muhafızları Seç (Sınıfı Muhafız olanlar)
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
    if (!this.isDragging) return;

    const dist = this.dragStart.dist(this.dragEnd);
    const selected = this.party.getSelectedUnits().filter(u => !u.isDead);

    // 1. Seçili birim varken sol tık sürükleniyorsa: OK SİMGESİ VE YÖN GÖSTERGESİ ÇİZ
    if (selected.length > 0 && dist > 12) {
      const angle = Vector2D.sub(this.dragEnd, this.dragStart).heading();
      const arrowLength = Math.max(35, Math.min(dist, 140));

      ctx.save();
      ctx.translate(this.dragStart.x, this.dragStart.y);
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
    // 2. Seçili birim yoksa: KUTU SEÇİM ÇERÇEVESİ (Selection Box) ÇİZ
    else if (dist > 8) {
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
