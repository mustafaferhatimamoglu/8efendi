import { EventBus } from '../core/EventBus.js';
import { FormationType } from '../navigation/FormationManager.js';

export class UIManager {
  constructor(partyManager) {
    this.party = partyManager;
    this.partyGrid = document.getElementById('party-grid');
    this.infoPanel = document.getElementById('selected-info');
    this.formationSelect = document.getElementById('formation-select');

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

    if (this.formationSelect) {
      this.formationSelect.addEventListener('change', e => {
        this.party.setFormation(e.target.value);
      });
    }

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
          <small>Sol tıkla birim seçebilir veya sürükleyerek toplu seçim yapabilirsiniz.</small>
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
          <p>Tüm seçili birimlere sağ tık ile formasyon komutu verebilirsiniz.</p>
          <div class="selected-tags">
            ${selected.map(u => `<span class="unit-pill" style="border-left: 4px solid ${u.color}">${u.name.split(' ')[0]}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }
}
