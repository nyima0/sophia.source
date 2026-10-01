// js/app.js
import { createFigureManager } from './figures/index.js';
import { createNav } from './nav.js';

const CHAR_W = 8;
const CHAR_H = 14;

const canvas = document.getElementById('ascii-stage');
const scrollContainer = document.querySelector('.content-scroll-container');
const sections = Array.from(document.querySelectorAll('.panel-section'));
const navDots = Array.from(document.querySelectorAll('.nav-dot'));
const figureIndexEl = document.getElementById('figure-index');
const figureNameEl = document.getElementById('figure-name');
const figureQuoteEl = document.getElementById('figure-quote');
const figureSwitcher = document.getElementById('figure-switcher');

// ------------------------------------------------------------
//  1. РАЗМЕРЫ
// ------------------------------------------------------------
function getDimensions() {
  const W = canvas.width;
  const H = canvas.height;
  return {
    W,
    H,
    COLS: Math.floor(W / CHAR_W),
    ROWS: Math.floor(H / CHAR_H),
    CHAR_W,
    CHAR_H
  };
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  // ctx масштабируем, чтобы CHAR_W/CHAR_H работали в CSS-пикселях
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ВАЖНО: переопределяем размеры под CSS-пиксели для фигур
  canvas.width = w;
  canvas.height = h;
}

resizeCanvas();

// ------------------------------------------------------------
//  2. ФИГУРЫ
// ------------------------------------------------------------
const figures = createFigureManager(canvas, getDimensions);

figures.onChange((figure, index) => {
  // Обновляем HUD
  if (figureIndexEl) figureIndexEl.textContent = figure.indexStr;
  if (figureNameEl) figureNameEl.textContent = figure.name;
  if (figureQuoteEl) figureQuoteEl.textContent = figure.quote;
});

// Клик по индикатору — следующая фигура
if (figureSwitcher) {
  figureSwitcher.addEventListener('click', () => {
    figures.next();
  });
}

// Старт — рандомная фигура
figures.random();

// ------------------------------------------------------------
//  3. НАВИГАЦИЯ
// ------------------------------------------------------------
createNav(scrollContainer, sections, navDots);

// ------------------------------------------------------------
//  4. РЕСАЙЗ
// ------------------------------------------------------------
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeCanvas();
    // Перезапускаем текущую фигуру, чтобы она подхватила новую сетку
    const cur = figures.getCurrent();
    if (cur) figures.start(cur.index);
  }, 150);
});

// ------------------------------------------------------------
//  5. ДИАЛОГ (заглушка, шаг 5 подключит настоящую логику)
// ------------------------------------------------------------
const input = document.getElementById('dialogue-input');
const dialogueWindow = document.getElementById('dialogue-window');
const dialogueFeed = document.getElementById('dialogue-feed');
const resetBtn = document.getElementById('dialogue-reset-btn');

let dialogueActive = false;

function openDialogue() {
  if (dialogueActive) return;
  dialogueActive = true;
  dialogueWindow.hidden = false;
}

function resetDialogue() {
  if (!dialogueActive) return;
  dialogueActive = false;
  dialogueWindow.hidden = true;
  if (dialogueFeed) dialogueFeed.innerHTML = '';
  if (input) input.value = '';
}

if (input) {
  input.addEventListener('input', () => {
    if (input.value.length > 0) openDialogue();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      appendMessage('user', input.value.trim());
      input.value = '';
      // Ответ-заглушка. Настоящая логика — шаг 5.
      setTimeout(() => {
        appendMessage('system', '...');
      }, 400);
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', resetDialogue);
}

function appendMessage(role, text) {
  if (!dialogueFeed) return;
  const el = document.createElement('div');
  el.className = 'msg msg-' + role;
  el.textContent = text;
  dialogueFeed.appendChild(el);
  dialogueFeed.scrollTop = dialogueFeed.scrollHeight;
}
