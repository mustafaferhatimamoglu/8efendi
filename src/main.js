import { Engine } from './core/Engine.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('⚔️ 8efendi başlatılıyor...');
  window.gameEngine = new Engine('gameCanvas');
});
