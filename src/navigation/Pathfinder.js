import { Vector2D } from './Vector2D.js';

export class Pathfinder {
  /**
   * Start ve Target noktaları arasında duvarların etrafından dolaşan en kısa yol noktalarını (Waypoints) bulur.
   * Kesinlikle donma veya sonsuz döngü yaşanmaması için sıkı güvenlik sınırları içerir.
   */
  static findPath(startPos, targetPos, mapManager, unitRadius = 14) {
    if (!mapManager || !mapManager.walls || mapManager.walls.length === 0) {
      return [targetPos.clone()];
    }

    const padding = unitRadius + 8;

    // 1. Eğer doğrudan görüş hattı (Line of Sight) varsa doğrudan hedefe git
    if (mapManager.hasLineOfSight(startPos, targetPos, padding)) {
      return [targetPos.clone()];
    }

    // 2. Yalnızca start ve target arasındaki rota çevresindeki duvarları filtrele (Yüksek Performans)
    const minX = Math.min(startPos.x, targetPos.x) - 800;
    const maxX = Math.max(startPos.x, targetPos.x) + 800;
    const minY = Math.min(startPos.y, targetPos.y) - 800;
    const maxY = Math.max(startPos.y, targetPos.y) + 800;

    const relevantWalls = mapManager.walls.filter(w => {
      return (w.x + w.w >= minX && w.x <= maxX && w.y + w.h >= minY && w.y <= maxY);
    });

    if (relevantWalls.length === 0) {
      return [targetPos.clone()];
    }

    // 3. Duvar köşe noktalarını (NavNodes) topla
    const cornerMargin = unitRadius + 28;
    const navNodes = [];

    const startNode = { id: 0, pos: startPos.clone(), g: 0, h: startPos.dist(targetPos), f: startPos.dist(targetPos), parent: null };
    const goalNode = { id: 1, pos: targetPos.clone(), g: Infinity, h: 0, f: Infinity, parent: null };

    let nodeId = 2;
    for (const wall of relevantWalls) {
      const corners = [
        new Vector2D(wall.x - cornerMargin, wall.y - cornerMargin),
        new Vector2D(wall.x + wall.w + cornerMargin, wall.y - cornerMargin),
        new Vector2D(wall.x + wall.w + cornerMargin, wall.y + wall.h + cornerMargin),
        new Vector2D(wall.x - cornerMargin, wall.y + wall.h + cornerMargin)
      ];

      for (const c of corners) {
        if (c.x > 20 && c.x < mapManager.width - 20 && c.y > 20 && c.y < mapManager.height - 20) {
          if (!mapManager.isPointInsideWall(c.x, c.y, padding)) {
            navNodes.push({
              id: nodeId++,
              pos: c,
              g: Infinity,
              h: c.dist(targetPos),
              f: Infinity,
              parent: null
            });
          }
        }
      }
    }

    // 4. A* Algoritması (Sonsuz Döngü Korumalı)
    const openSet = [startNode];
    const closedSet = new Set();
    const allNodes = [startNode, ...navNodes, goalNode];
    let iterations = 0;
    const maxIterations = 150;

    while (openSet.length > 0 && iterations++ < maxIterations) {
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const current = openSet.splice(lowestIndex, 1)[0];

      if (current === goalNode || current.pos.dist(targetPos) < 20) {
        return this.reconstructAndSmoothPath(current, startPos, mapManager, padding);
      }

      closedSet.add(current.id);

      for (const neighbor of allNodes) {
        if (neighbor.id === current.id || closedSet.has(neighbor.id)) continue;

        // İki düğüm arasında duvar engeli var mı?
        if (!mapManager.hasLineOfSight(current.pos, neighbor.pos, padding)) {
          continue;
        }

        const tentativeG = current.g + current.pos.dist(neighbor.pos);

        if (tentativeG < neighbor.g) {
          // Döngüsel ebeveyn bağını engelle
          if (!this.wouldCreateCycle(neighbor, current)) {
            neighbor.parent = current;
            neighbor.g = tentativeG;
            neighbor.f = neighbor.g + neighbor.h;

            if (!openSet.some(n => n.id === neighbor.id)) {
              openSet.push(neighbor);
            }
          }
        }
      }
    }

    // Hedefe doğrudan varılamazsa hedefe en yakın ziyaret edilmiş düğümü veya hedefi döndür
    return [targetPos.clone()];
  }

  static wouldCreateCycle(node, potentialParent) {
    let curr = potentialParent;
    let depth = 0;
    while (curr && depth++ < 30) {
      if (curr.id === node.id) return true;
      curr = curr.parent;
    }
    return false;
  }

  /**
   * Bulunan yolu geriye doğru oluşturur ve gereksiz ara noktaları temizler (String Pulling).
   */
  static reconstructAndSmoothPath(endNode, startPos, mapManager, padding) {
    const rawPath = [];
    let curr = endNode;
    const visited = new Set();
    let depth = 0;

    while (curr && !visited.has(curr.id) && depth++ < 50) {
      visited.add(curr.id);
      rawPath.unshift(curr.pos.clone());
      curr = curr.parent;
    }

    if (rawPath.length <= 1) {
      return rawPath.length === 1 ? [rawPath[0]] : [startPos.clone()];
    }

    // İlk nokta startPos'a çok yakınsa kaldır
    if (rawPath[0].dist(startPos) < 10) {
      rawPath.shift();
    }

    if (rawPath.length <= 1) {
      return rawPath.length === 1 ? [rawPath[0]] : [startPos.clone()];
    }

    // Yol Düzleştirme (String Pulling)
    const smoothed = [];
    let fromPos = startPos;
    let i = 0;
    let smoothSteps = 0;

    while (i < rawPath.length && smoothSteps++ < 40) {
      let furthest = i;
      for (let j = rawPath.length - 1; j >= i; j--) {
        if (mapManager.hasLineOfSight(fromPos, rawPath[j], padding)) {
          furthest = j;
          break;
        }
      }

      smoothed.push(rawPath[furthest]);
      fromPos = rawPath[furthest];
      i = Math.max(i + 1, furthest + 1);
    }

    return smoothed.length > 0 ? smoothed : [rawPath[rawPath.length - 1]];
  }
}
