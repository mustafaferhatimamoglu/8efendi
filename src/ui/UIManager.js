import { EventBus } from '../core/EventBus.js';
import { FormationType } from '../navigation/FormationManager.js';
import { UnitClasses } from '../config/UnitDatabase.js';

export class UIManager {
  constructor(partyManager, multiplayerSync = null) {
    this.party = partyManager;
    this.sync = multiplayerSync;

    this.partyGrid = document.getElementById('party-grid');
    this.infoPanel = document.getElementById('selected-info');
    this.modeBadge = document.getElementById('game-mode-badge');
    this.pingBadge = document.getElementById('ping-badge');
    this.scoreBadge = document.getElementById('score-badge');
    this.endGameModal = document.getElementById('endgame-modal');
    this.endGameTitle = document.getElementById('endgame-title');
    this.endGameDesc = document.getElementById('endgame-desc');
    this.btnRematch = document.getElementById('btn-rematch');
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
      if (this.scoreBadge) {
        this.scoreBadge.innerHTML = `🛡️ Müttefik: <strong>${totalAllies}</strong> | 👹 Düşman: <strong>${enemyCount}</strong> | 🌊 Dalga: <strong>${wave || 1}</strong>`;
      }
      this.updateCardHealths();
    });

    EventBus.on('match:ended', ({ result }) => {
      this.showEndGameModal(result);
    });

    // Formasyon butonları
    document.querySelectorAll('.formation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const form = btn.dataset.formation;
        this.party.setFormation(form);
      });
    });

    // Toplu eylem butonları
    const selectAllBtn = document.getElementById('btn-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.party.selectAll());
    }

    // Rövanş Butonu
    if (this.btnRematch) {
      this.btnRematch.addEventListener('click', () => {
        EventBus.emit('match:restart');
      });
    }

    // Savaş Naraları Butonları
    document.querySelectorAll('.taunt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.taunt;
        if (this.sync) {
          this.sync.sendTaunt(text);
        }
        this.showChatBubble('Siz', text);
      });
    });

    // Özel Sohbet Gönderimi
    const chatInput = document.getElementById('quick-chat-input');
    const chatSendBtn = document.getElementById('btn-send-chat');
    if (chatSendBtn && chatInput) {
      const sendAction = () => {
        const val = chatInput.value.trim();
        if (val) {
          if (this.sync) {
            this.sync.sendTaunt(val);
          }
          this.showChatBubble('Siz', val);
          chatInput.value = '';
        }
      };
      chatSendBtn.addEventListener('click', sendAction);
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendAction();
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
    const toast = document.createElement('div');
    toast.className = `game-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
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
      const hpEl = document.getElementById(`hp-bar-${unit.id}`);
      if (hpEl) {
        const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
        hpEl.style.width = `${hpPercent}%`;
        if (unit.isDead) {
          hpEl.parentElement.parentElement.classList.add('unit-dead');
        } else {
          hpEl.parentElement.parentElement.classList.remove('unit-dead');
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
          ⚔️ <strong>Otomatik Savaş:</strong> Birimler 1.0s aralıkla otomatik saldırır ve şifa verir.</small>
        </div>
      `;
    } else if (selected.length === 1) {
      const u = selected[0];
      let attackDesc = '🗡️ Saniyede 1 vuruş + 0.5s Hitbox Alanı';
      if (u.classType === UnitClasses.ARCHER) attackDesc = '🏹 Saniyede 1 uçan ok fırlatır';
      else if (u.classType === UnitClasses.MAGE) attackDesc = '🔥 Saniyede 1 alev topu fırlatır';
      else if (u.classType === UnitClasses.HEALER) attackDesc = '💚 En düşük can yüzdeli takım arkadaşını otomatik iyileştirir';

      this.infoPanel.innerHTML = `
        <div class="single-unit-view">
          <div class="unit-header-row">
            <span class="color-badge" style="background:${u.color}"></span>
            <h3>${u.name}</h3>
            <span class="role-tag">${u.title}</span>
          </div>
          <p class="unit-desc">${u.description}</p>
          <div class="stat-grid">
            <div><strong>HP:</strong> ${Math.round(u.hp)} / ${u.maxHp}</div>
            <div><strong>Hız:</strong> ${u.speed}</div>
            <div><strong>Saldırı Gücü:</strong> ${u.attackPower}</div>
            <div><strong>Menzil:</strong> ${u.attackRange}px</div>
          </div>
          <div class="skill-box">
            <div class="skill-name">⚔️ Temel Mekanik</div>
            <div class="skill-details">${attackDesc}</div>
          </div>
        </div>
      `;
    } else {
      this.infoPanel.innerHTML = `
        <div class="multi-unit-view">
          <h3>Grup Seçimi (${selected.length} Efendi)</h3>
          <p>Seçili tüm birimleri formasyon ile haritada konumlandırabilirsiniz.</p>
          <div class="selected-tags">
            ${selected.map(u => `<span class="unit-pill" style="border-left: 4px solid ${u.color}">${u.name.split(' ')[0]}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }

  updateInspectedUnitPanel(unit) {
    if (!this.infoPanel || !unit) return;
    this.infoPanel.innerHTML = `
      <div class="single-unit-view">
        <div class="unit-header-row">
          <span class="color-badge" style="background:${unit.color}"></span>
          <h3>${unit.name}</h3>
          <span class="role-tag">${unit.isEnemy ? 'Düşman' : 'Müttefik'}</span>
        </div>
        <div class="stat-grid">
          <div><strong>HP:</strong> ${Math.round(unit.hp)} / ${unit.maxHp}</div>
          <div><strong>Saldırı Gücü:</strong> ${unit.attackPower}</div>
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
