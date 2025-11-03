// js/main.js
import { UI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  // Initialize UI (wires up everything)
  const ui = new UI();

  // expose for debugging if you want:
  window._ui = ui;
});
