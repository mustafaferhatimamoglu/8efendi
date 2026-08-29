import { EventBus } from '../core/EventBus.js';
import { FormationType } from '../navigation/FormationManager.js';
import { UnitClasses } from '../config/UnitDatabase.js';

export class UIManager {
  constructor(partyManager, multiplayerSync = null) {
    this.party = partyManager;
    this.sync = multiplayerSync;

    this.partyGrid = document.getElementById('party-grid');
    this.infoPanel = document.getElementById('unit-detail-content') || document.getElementById('selected-info');
    this.modeBadge = document.getElementById('game-mode-badge');
    this.pingBadge = document.getElementById('ping-badge');
    this.waveDisplay = document.getElementById('wave-display');
    this.enemyCountDisplay = document.getElementById('enemy-count-display');
    this.alliesCountDisplay = document.getElementById('allies-count-display');
    this.endGameModal = document.getElementById('endgame-modal');
    this.endGameTitle = document.getElementById('endgame-title');
    this.endGameDesc = document.getElementById('endgame-message');
    this.btnRestart = document.getElementById('btn-restart-game');
    this.chatContainer = document.getElementById('chat-bubbles-container');

    this.initUI();
    this.bindEvents();
  }

  initUI() {
    this.renderPartyCards();
    this.updateInfoPanel();
  }

  bindEvents() {
    EventBus.on('selection:changed', () => {
      this.updateSelectionHighlights();
      this.updateInfoPanel();
    });

    EventBus.on('unit:inspected', unit => {
      this.updateInspectedUnitPanel(unit);
    });

    EventBus.on('scores:updated', ({ aliveLocal, totalAllies, enemyCount, wave }) => {
      if (this.waveDisplay) this.waveDisplay.textContent = wave || 1;
      if (this.enemyCountDisplay) this.enemyCountDisplay.textContent = enemyCount;
      if (this.alliesCountDisplay) this.alliesCountDisplay.textContent = `${totalAllies} / ${totalAllies}`;
      this.updateCardHealths();
    });

    EventBus.on('match:ended', ({ result }) => {
      this.showEndGameModal(result);
    });

    // Formasyon butonları
    document.querySelectorAll('.form-btn, .formation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.form-btn, .formation-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const form = btn.dataset.formation;
        if (form) {
          this.party.setFormation(form);
        }
      });
    });

    // Rövanş / Yeniden Başlat Butonu
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        EventBus.emit('match:restart');
      });
    }

    // Ağ Ping Göstergesi
    if (this.party.sync && this.party.sync.network) {
      this.party.sync.network.on('onPing', ping => {
        if (this.pingBadge) {
          this.pingBadge.textContent = `📶 ${ping}ms`;
          this.pingBadge.style.display = 'inline-flex';
        }
      });
    }
  }

  updateModeDisplay(modeText) {
    if (this.modeBadge) {
      this.modeBadge.textContent = modeText;
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `game-toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showChatBubble(sender, text) {
    if (!this.chatContainer) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `<strong>${sender}:</strong> ${text}`;
    this.chatContainer.appendChild(bubble);
    setTimeout(() => {
      bubble.style.opacity = '0';
      setTimeout(() => bubble.remove(), 400);
    }, 4500);
  }

  renderPartyCards() {
    if (!this.partyGrid) return;
    this.partyGrid.innerHTML = '';

    this.party.getAllUnits().forEach((unit, index) => {
      const card = document.createElement('div');
      card.className = `unit-card ${unit.isSelected ? 'selected' : ''}`;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="unit-card-header">
          <span class="unit-key-badge">${index + 1}</span>
          <span class="unit-color-dot" style="background-color: ${unit.color}"></span>
          <span class="unit-card-name">${unit.name}</span>
        </div>
        <div class="unit-card-title">${unit.title}</div>
        <div class="bar-container">
          <div class="bar-fill hp-bar" id="hp-bar-${unit.id}" style="width: 100%;"></div>
        </div>
      `;

      card.addEventListener('click', e => {
        this.party.selectUnit(unit, e.shiftKey);
      });

      this.partyGrid.appendChild(card);
    });
  }

  updateCardHealths() {
    this.party.getAllUnits().forEach(unit => {
      const bar = document.getElementById(`hp-bar-${unit.id}`);
      if (bar) {
        const ratio = Math.max(0, (unit.hp / unit.maxHp) * 100);
        bar.style.width = `${ratio}%`;
        if (unit.isDead) {
          bar.style.backgroundColor = '#555';
        } else if (ratio < 25) {
          bar.style.backgroundColor = 'var(--enemy-red)';
        } else if (ratio < 50) {
          bar.style.backgroundColor = 'var(--accent-orange)';
        } else {
          bar.style.backgroundColor = 'var(--hp-green)';
        }
      }
    });
  }

  updateSelectionHighlights() {
    const cards = document.querySelectorAll('.unit-card');
    const allUnits = this.party.getAllUnits();

    cards.forEach((card, idx) => {
      const unit = allUnits[idx];
      if (unit && unit.isSelected) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  updateInfoPanel() {
    if (!this.infoPanel) return;
    const selected = this.party.getSelectedUnits();

    if (selected.length === 0) {
      this.infoPanel.innerHTML = `
        <div class="empty-state">
          <p>Herhangi bir birim seçilmedi.</p>
          <small>Sol tıkla birim seçebilir veya sürükleyerek toplu seçim yapabilirsiniz.<br><br>
          🛡️ <strong>Dost Ateşi:</strong> Kapalı.<br>
          ⚔️ <strong>Otomatik Savaş:</strong> Birimler aralıklarla otomatik saldırır ve şifa verir.</small>
        </div>
      `;
    } else if (selected.length === 1) {
      const u = selected[0];
      let attackDesc = '🗡️ Yakın Dövüş + Alan İttirmesi (Knockback)';
      if (u.classType === UnitClasses.ARCHER) attackDesc = '🏹 800px Ok Saldırısı + 5x Hız Yeteneği';
      else if (u.classType === UnitClasses.MAGE) attackDesc = '🔥 750px Alev Topu + 5x Hız Yeteneği';
      else if (u.classType === UnitClasses.HEALER) attackDesc = '💚 650px Otomatik Şifa (0.5s / 70 HP)';

      this.infoPanel.innerHTML = `
        <div class="single-unit-view">
          <div class="unit-header-row">
            <span class="color-badge" style="background:${u.color}; display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px;"></span>
            <strong>${u.name}</strong>
          </div>
          <p class="unit-desc" style="font-size:11px; margin:6px 0; color:#8c9ba5;">${u.description || ''}</p>
          <div class="stat-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px;">
            <div><strong>HP:</strong> ${Math.round(u.hp)} / ${u.maxHp}</div>
            <div><strong>Hız:</strong> ${u.speed}</div>
            <div><strong>Saldırı:</strong> ${u.attackPower}</div>
            <div><strong>Menzil:</strong> ${u.attackRange}px</div>
          </div>
          <div class="skill-box" style="margin-top:6px; font-size:11px; color:#f1c40f;">
            ${attackDesc}
          </div>
        </div>
      `;
    } else {
      this.infoPanel.innerHTML = `
        <div class="multi-unit-view">
          <div style="font-size:12px; font-weight:bold; color:#00d2d3;">Grup Seçimi (${selected.length} Efendi)</div>
          <p style="font-size:11px; margin:4px 0; color:#8c9ba5;">Sağ tıklayarak topluca hedef noktaya yürütebilirsiniz.</p>
        </div>
      `;
    }
  }

  updateInspectedUnitPanel(unit) {
    if (!this.infoPanel || !unit) return;
    this.infoPanel.innerHTML = `
      <div class="single-unit-view">
        <div class="unit-header-row">
          <span class="color-badge" style="background:${unit.color}; display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px;"></span>
          <strong>${unit.name}</strong>
          <span style="font-size:10px; color:#e74c3c; margin-left:6px;">[${unit.isEnemy ? 'Düşman' : 'Müttefik'}]</span>
        </div>
        <div class="stat-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px; margin-top:6px;">
          <div><strong>HP:</strong> ${Math.round(unit.hp)} / ${unit.maxHp}</div>
          <div><strong>Saldırı:</strong> ${unit.attackPower}</div>
          <div><strong>Hız:</strong> ${unit.speed}</div>
          <div><strong>Durum:</strong> ${unit.isDead ? 'Ölü' : 'Canlı'}</div>
        </div>
      </div>
    `;
  }

  showEndGameModal(result) {
    if (!this.endGameModal) return;
    this.endGameTitle.textContent = '💀 ORDULAR DÜŞTÜ!';
    this.endGameTitle.className = 'defeat-text';
    this.endGameDesc.textContent = 'Bozkır yaratıkları tüm savunma hatlarını yok etti.';
    this.endGameModal.style.display = 'flex';
  }

  hideEndGameModal() {
    if (this.endGameModal) this.endGameModal.style.display = 'none';
  }
}
