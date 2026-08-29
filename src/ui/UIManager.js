import { EventBus } from '../core/EventBus.js';
import { FormationType } from '../navigation/FormationManager.js';

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

    EventBus.on('enemy:inspected', enemyUnit => {
      this.updateEnemyInfoPanel(enemyUnit);
    });

    EventBus.on('scores:updated', ({ aliveLocal, aliveEnemy }) => {
      if (this.scoreBadge) {
        this.scoreBadge.innerHTML = `🔴 Dost: <strong>${aliveLocal}/8</strong> | 🔵 Düşman: <strong>${aliveEnemy}/8</strong>`;
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

    const skillBtn = document.getElementById('btn-cast-skill');
    if (skillBtn) {
      skillBtn.addEventListener('click', () => {
        const selected = this.party.getSelectedUnits();
        if (selected.length > 0) {
          selected[0].useSkill(0, selected[0].position);
        }
      });
    }

    // Rövanş Butonu
    if (this.btnRematch) {
      this.btnRematch.addEventListener('click', () => {
        EventBus.emit('match:restart');
      });
    }

    // Savaş Naraları (Hızlı Sohbet) Butonları
    document.querySelectorAll('.taunt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.taunt;
        if (this.sync) {
          this.sync.sendTaunt(text);
          this.showChatBubble('Siz', text);
        }
      });
    });

    // Özel Sohbet Gönderimi
    const chatInput = document.getElementById('quick-chat-input');
    const chatSendBtn = document.getElementById('btn-send-chat');
    if (chatSendBtn && chatInput) {
      const sendAction = () => {
        const val = chatInput.value.trim();
        if (val && this.sync) {
          this.sync.sendTaunt(val);
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

  updateModeDisplay(text) {
    if (this.modeBadge) {
      this.modeBadge.textContent = text;
    }
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
          <span class="unit-card-name">${unit.name.split(' ')[0]}</span>
        </div>
        <div class="unit-card-title">${unit.title}</div>
        <div class="bar-container">
          <div class="bar-fill hp-bar" id="hp-bar-${unit.id}" style="width: 100%;"></div>
        </div>
        <div class="bar-container energy-bar-container">
          <div class="bar-fill energy-bar" id="energy-bar-${unit.id}" style="width: 100%;"></div>
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
      const energyEl = document.getElementById(`energy-bar-${unit.id}`);
      if (hpEl) {
        const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
        hpEl.style.width = `${hpPercent}%`;
        if (unit.isDead) {
          hpEl.parentElement.parentElement.classList.add('unit-dead');
        } else {
          hpEl.parentElement.parentElement.classList.remove('unit-dead');
        }
      }
      if (energyEl) {
        const energyPercent = Math.max(0, (unit.energy / unit.maxEnergy) * 100);
        energyEl.style.width = `${energyPercent}%`;
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
          ⚔️ <strong>Saldırı:</strong> Birimlerini seçip düşmana sağ tıkla!</small>
        </div>
      `;
    } else if (selected.length === 1) {
      const u = selected[0];
      const skill = u.skills[0];
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
            <div><strong>Enerji:</strong> ${Math.round(u.energy)} / ${u.maxEnergy}</div>
            <div><strong>Hız:</strong> ${u.speed}</div>
            <div><strong>Saldırı Gücü:</strong> ${u.attackPower}</div>
            <div><strong>Menzil:</strong> ${u.attackRange}px</div>
            <div><strong>Saldırı Hızı:</strong> ${u.attackSpeed}/s</div>
          </div>
          ${
            skill
              ? `
            <div class="skill-box">
              <div class="skill-name">⚡ Yetenek: ${skill.name} (Q)</div>
              <div class="skill-details">Maliyet: ${skill.cost} Enerji | Bekleme: ${skill.cd}s</div>
            </div>
          `
              : ''
          }
        </div>
      `;
    } else {
      this.infoPanel.innerHTML = `
        <div class="multi-unit-view">
          <h3>Grup Seçimi (${selected.length} Efendi)</h3>
          <p>Tüm seçili birimlere sağ tık ile formasyon komutu veya düşmana saldırı emri verebilirsiniz.</p>
          <div class="selected-tags">
            ${selected.map(u => `<span class="unit-pill" style="border-left: 4px solid ${u.color}">${u.name.split(' ')[0]}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }

  updateEnemyInfoPanel(u) {
    if (!this.infoPanel) return;
    this.infoPanel.innerHTML = `
      <div class="single-unit-view enemy-view">
        <div class="unit-header-row">
          <span class="color-badge" style="background:#e74c3c"></span>
          <h3>[DÜŞMAN] ${u.name}</h3>
          <span class="role-tag enemy-tag">${u.title}</span>
        </div>
        <p class="unit-desc">${u.description}</p>
        <div class="stat-grid">
          <div><strong>HP:</strong> ${Math.round(u.hp)} / ${u.maxHp}</div>
          <div><strong>Enerji:</strong> ${Math.round(u.energy)} / ${u.maxEnergy}</div>
          <div><strong>Saldırı Gücü:</strong> ${u.attackPower}</div>
          <div><strong>Menzil:</strong> ${u.attackRange}px</div>
        </div>
        <div class="tactical-hint">
          🎯 <em>Seçili birimlerinle bu düşmana sağ tıklayarak doğrudan hücum edebilirsin!</em>
        </div>
      </div>
    `;
  }

  showEndGameModal(result) {
    if (!this.endGameModal) return;
    const isVictory = result === 'victory';

    this.endGameTitle.textContent = isVictory ? '🏆 ZAFER!' : '💀 YENİLGİ!';
    this.endGameTitle.className = isVictory ? 'victory-text' : 'defeat-text';
    this.endGameDesc.textContent = isVictory
      ? 'Düşman ordusu darmadağın edildi! 8 Efendi meydanın mutlak hakimi oldu!'
      : 'Tüm efendileriniz savaş alanında düştü. Bir dahaki sefere taktiğinizi gözden geçirin!';

    this.endGameModal.style.display = 'flex';
  }

  hideEndGameModal() {
    if (this.endGameModal) {
      this.endGameModal.style.display = 'none';
    }
  }

  showChatBubble(sender, text) {
    if (!this.chatContainer) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `<strong>${sender}:</strong> ${text}`;
    this.chatContainer.appendChild(bubble);

    setTimeout(() => {
      bubble.classList.add('fade-out');
      setTimeout(() => bubble.remove(), 500);
    }, 4500);
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `game-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, 3000);
    }, 50);
  }

  showRematchNotification() {
    this.showToast('Rakip rövanş maçı teklif etti! Yeniden Başlat butonuna basarak kabul edin.', 'info');
  }
}
