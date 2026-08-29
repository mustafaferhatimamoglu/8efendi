import { Vector2D } from '../navigation/Vector2D.js';
import { AssetManager } from '../core/AssetManager.js';

export class MapManager {
  constructor(width = 4800, height = 3600) {
    this.width = width;
    this.height = height;

    // 4800 x 3600 Silkroad Haritası Surları ve Duvarları
    this.walls = [
      // ==========================================
      // 1. JANGAN KALESİ (ŞEHİR MERKEZİ - DOĞU)
      // ==========================================
      // Kuzey Surları
      { id: 'jangan_wall_n', x: 3080, y: 1000, w: 1160, h: 52, color: '#c0392b', label: 'Jangan North Wall' },
      // Güney Surları
      { id: 'jangan_wall_s', x: 3080, y: 1840, w: 1160, h: 52, color: '#c0392b', label: 'Jangan South Wall' },
      // Doğu Surları
      { id: 'jangan_wall_e', x: 4188, y: 1052, w: 52, h: 788, color: '#c0392b', label: 'Jangan East Wall' },
      // Batı Surları (Kuzey Parça)
      { id: 'jangan_wall_w_n', x: 3080, y: 1052, w: 52, h: 280, color: '#c0392b', label: 'Jangan West Wall' },
      // Batı Surları (Güney Parça - Arada 180px Şehir Kapısı)
      { id: 'jangan_wall_w_s', x: 3080, y: 1512, w: 52, h: 328, color: '#c0392b', label: 'Jangan West Wall' },

      // ==========================================
      // 2. BIJEOKDAN DAĞ KARARGAHI (HAYDUT KALESİ - GÜNEYBATI)
      // ==========================================
      { id: 'bijeok_wall_n', x: 1400, y: 2480, w: 880, h: 52, color: '#7f8c8d', label: 'Bijeokdan Stronghold' },
      { id: 'bijeok_wall_s', x: 1400, y: 3120, w: 880, h: 52, color: '#7f8c8d', label: 'Bijeokdan Stronghold' },
      { id: 'bijeok_wall_w', x: 1400, y: 2532, w: 52, h: 588, color: '#7f8c8d', label: 'Bijeokdan Stronghold' },
      { id: 'bijeok_wall_e_n', x: 2228, y: 2532, w: 52, h: 200, color: '#7f8c8d', label: 'Bijeokdan Gate' },
      { id: 'bijeok_wall_e_s', x: 2228, y: 2900, w: 52, h: 220, color: '#7f8c8d', label: 'Bijeokdan Gate' },
      { id: 'bijeok_inner', x: 1720, y: 2720, w: 240, h: 160, color: '#34495e', label: 'Bandit Lair' },

      // ==========================================
      // 3. CH'IN TOMB & SWAMP HARABELERİ (KUZEYDOĞU)
      // ==========================================
      { id: 'chin_tomb_n', x: 3680, y: 220, w: 960, h: 52, color: '#8e44ad', label: "Ch'in Tomb Ruins" },
      { id: 'chin_tomb_w', x: 3680, y: 272, w: 52, h: 480, color: '#8e44ad', label: "Ch'in Tomb Ruins" },
      { id: 'chin_tomb_e', x: 4588, y: 272, w: 52, h: 480, color: '#8e44ad', label: "Ch'in Tomb Ruins" },
      { id: 'chin_crypt', x: 4040, y: 380, w: 240, h: 140, color: '#2c3e50', label: 'Ancient Crypt' },

      // ==========================================
      // 4. HOHYEOSI DAĞ SIRADAĞLARI VE KAYALIKLAR (ORTA-BATI)
      // ==========================================
      { id: 'hohyeosi_ridge_1', x: 960, y: 1040, w: 64, h: 640, color: '#57606f', label: 'Hohyeosi Mountain Ridge' },
      { id: 'hohyeosi_ridge_2', x: 680, y: 1760, w: 440, h: 60, color: '#57606f', label: 'Mountain Pass Barrier' },
      { id: 'hohyeosi_rock_3', x: 1640, y: 1560, w: 72, h: 360, color: '#57606f', label: 'Tiger Rock' },

      // ==========================================
      // 5. ANCIENT TOMB MEZARLIK VE DİKİLİTAŞLAR (GÜNEYDOĞU)
      // ==========================================
      { id: 'tomb_barrier_w', x: 3920, y: 2880, w: 52, h: 360, color: '#2f3542', label: 'Tomb Stele' },
      { id: 'tomb_barrier_e', x: 4400, y: 2880, w: 52, h: 360, color: '#2f3542', label: 'Tomb Stele' },

      // ==========================================
      // 6. EXORCIST'S HOME HARABELERİ (KUZEY-ORTA)
      // ==========================================
      { id: 'exorcist_fence_w', x: 2240, y: 640, w: 48, h: 320, color: '#747d8c', label: "Exorcist's Shrine" },
      { id: 'exorcist_fence_n', x: 2240, y: 640, w: 480, h: 48, color: '#747d8c', label: "Exorcist's Shrine" }
    ];

    // Bölge Etiketleri (Silkroad Harita İsimleri)
    this.zones = [
      { name: '🏯 JANGAN CASTLE (ŞEHİR MERKEZİ)', x: 3660, y: 1440, color: '#f1c40f' },
      { name: '🌾 SOUTHERN GRASSLAND (ÇAYIRLAR)', x: 3700, y: 2240, color: '#2ecc71' },
      { name: '🪦 ANCIENT TOMB (MEZARLIK)', x: 4160, y: 2800, color: '#95a5a6' },
      { name: "💧 SWAMP AREA & CH'IN TOMB (BATAKLIK)", x: 4140, y: 200, color: '#3498db' },
      { name: "🌿 EXORCIST'S HOME (BÜYÜCÜ KULÜBESİ)", x: 2480, y: 580, color: '#9b59b6' },
      { name: '🐯 HOHYEOSI MOUNTAIN (KAPLAN DAĞI)', x: 1200, y: 1000, color: '#e67e22' },
      { name: '⚔️ BIJEOKDAN STRONGHOLD (HAYDUT KALESİ)', x: 1840, y: 2440, color: '#e74c3c' }
    ];
  }

  resolveCircleCollision(pos, radius) {
    // 1. Harita Sınırları
    pos.x = Math.max(radius + 15, Math.min(this.width - radius - 15, pos.x));
    pos.y = Math.max(radius + 15, Math.min(this.height - radius - 15, pos.y));

    // 2. Duvarlarla Çarpışma ve İtme
    for (const wall of this.walls) {
      const closestX = Math.max(wall.x, Math.min(pos.x, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(pos.y, wall.y + wall.h));

      const dx = pos.x - closestX;
      const dy = pos.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist === 0) {
          pos.x += radius;
        } else {
          const overlap = radius - dist;
          pos.x += (dx / dist) * overlap;
          pos.y += (dy / dist) * overlap;
        }
      }
    }
  }

  isPointInsideWall(x, y, padding = 0) {
    for (const wall of this.walls) {
      if (
        x >= wall.x - padding &&
        x <= wall.x + wall.w + padding &&
        y >= wall.y - padding &&
        y <= wall.y + wall.h + padding
      ) {
        return true;
      }
    }
    return false;
  }

  hasLineOfSight(p1, p2, padding = 0) {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    for (const wall of this.walls) {
      const rx = wall.x - padding;
      const ry = wall.y - padding;
      const rw = wall.w + padding * 2;
      const rh = wall.h + padding * 2;

      // Hızlı AABB Bounding Box Ön Elemesi
      if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) {
        continue;
      }

      if (this.lineIntersectsRect(p1.x, p1.y, p2.x, p2.y, wall, padding)) {
        return false;
      }
    }
    return true;
  }

  checkProjectileWallHit(p1, p2) {
    let closestHit = null;
    let closestDistSq = Infinity;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    for (const wall of this.walls) {
      // Hızlı AABB Ön Elemesi
      if (maxX < wall.x || minX > wall.x + wall.w || maxY < wall.y || minY > wall.y + wall.h) {
        continue;
      }

      const hit = this.getLineRectIntersection(p1.x, p1.y, p2.x, p2.y, wall);
      if (hit) {
        const dx = hit.x - p1.x;
        const dy = hit.y - p1.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          closestHit = hit;
        }
      }
    }
    return closestHit;
  }

  lineIntersectsRect(x1, y1, x2, y2, rect, padding = 0) {
    const rx = rect.x - padding;
    const ry = rect.y - padding;
    const rw = rect.w + padding * 2;
    const rh = rect.h + padding * 2;

    if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
    if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;

    return (
      this.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
      this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
      this.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
      this.lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx, ry)
    );
  }

  getLineRectIntersection(x1, y1, x2, y2, rect) {
    const lines = [
      { x3: rect.x, y3: rect.y, x4: rect.x + rect.w, y4: rect.y },
      { x3: rect.x + rect.w, y3: rect.y, x4: rect.x + rect.w, y4: rect.y + rect.h },
      { x3: rect.x + rect.w, y3: rect.y + rect.h, x4: rect.x, y4: rect.y + rect.h },
      { x3: rect.x, y3: rect.y + rect.h, x4: rect.x, y4: rect.y }
    ];

    let closestPt = null;
    let minDistSq = Infinity;

    for (const l of lines) {
      const pt = this.getLineIntersection(x1, y1, x2, y2, l.x3, l.y3, l.x4, l.y4);
      if (pt) {
        const dx = pt.x - x1;
        const dy = pt.y - y1;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestPt = pt;
        }
      }
    }
    return closestPt;
  }

  lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
      };
    }
    return null;
  }

  render(ctx) {
    // 1. Orijinal Taktiksel Savaş Alanı Zemini ve Izgarası
    ctx.fillStyle = '#111722';
    ctx.fillRect(0, 0, this.width, this.height);

    // Bölgesel Atmosfer Işıkları (Silkroad Alan Renkleri)
    this.zones.forEach(zone => {
      const grad = ctx.createRadialGradient(zone.x, zone.y, 40, zone.x, zone.y, 500);
      grad.addColorStop(0, `${zone.color}22`);
      grad.addColorStop(1, 'rgba(17, 23, 34, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, 500, 0, Math.PI * 2);
      ctx.fill();
    });

    // Zemin Izgara Çizgileri (Her 100px'de bir)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. Harita Dış Sınırları
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, this.width - 10, this.height - 10);

    // 3. Bölge İsimleri (Silkroad Formatında)
    this.zones.forEach(zone => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.font = 'bold 15px sans-serif';
      const textWidth = ctx.measureText(zone.name).width;
      ctx.fillRect(zone.x - textWidth / 2 - 10, zone.y - 18, textWidth + 20, 26);

      ctx.fillStyle = zone.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, zone.x, zone.y - 5);
    });

    // 4. Silkroad Kale Surları ve Taş Duvarlar
    this.walls.forEach(wall => {
      ctx.save();

      // Duvar Gölgesi
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(wall.x + 6, wall.y + 6, wall.w, wall.h);

      // Duvar Gövdesi (Taş / Tuğla Dokusu)
      const grad = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
      grad.addColorStop(0, '#3d4a58');
      grad.addColorStop(0.5, '#222b36');
      grad.addColorStop(1, '#151d26');
      ctx.fillStyle = grad;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

      // Duvar Kenar Çizgisi
      ctx.strokeStyle = wall.color || '#e74c3c';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

      // Duvar Üstü Mazgal Çizgileri
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      if (wall.w > wall.h) {
        for (let bx = wall.x + 15; bx < wall.x + wall.w - 15; bx += 40) {
          ctx.fillRect(bx, wall.y + 4, 20, wall.h - 8);
        }
      } else {
        for (let by = wall.y + 15; by < wall.y + wall.h - 15; by += 40) {
          ctx.fillRect(wall.x + 4, by, wall.w - 8, 20);
        }
      }

      ctx.restore();
    });
  }
}
