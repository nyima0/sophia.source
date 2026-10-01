// js/figures/index.js
import phyllotaxis from './phyllotaxis.js';
import lorenz from './lorenz.js';
import hopf from './hopf.js';
import calabi from './calabi.js';

const FIGURES = [phyllotaxis, lorenz, hopf, calabi];

export function createFigureManager(canvas, getDimensions) {
  const ctx = canvas.getContext('2d');

  let currentIndex = -1;
  let currentCleanup = null;

  // Слушатели: app.js может подписаться, чтобы обновлять UI
  // (индикатор, цитата) при смене фигуры.
  const listeners = new Set();

  function notify(figure, index) {
    for (const fn of listeners) fn(figure, index);
  }

  function onChange(fn) {
    listeners.add(fn);
    // Сразу сообщаем текущее состояние, если фигура уже выбрана
    if (currentIndex >= 0) fn(FIGURES[currentIndex], currentIndex);
    return () => listeners.delete(fn);
  }

  function stopCurrent() {
    if (currentCleanup) {
      try {
        currentCleanup();
      } catch (e) {
        console.warn('[figures] cleanup error', e);
      }
      currentCleanup = null;
    }
    // Чистим канвас перед следующей фигурой
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function start(index) {
    if (index < 0 || index >= FIGURES.length) return;

    stopCurrent();

    currentIndex = index;
    const figure = FIGURES[index];

    try {
      currentCleanup = figure.init(ctx, getDimensions) || null;
    } catch (e) {
      console.error('[figures] init error for', figure.id, e);
      currentCleanup = null;
    }

    notify(figure, index);
  }

  function next() {
    const nextIndex = (currentIndex + 1) % FIGURES.length;
    start(nextIndex);
  }

  function random() {
    const i = Math.floor(Math.random() * FIGURES.length);
    start(i);
  }

  function getCurrent() {
    if (currentIndex < 0) return null;
    return {
      figure: FIGURES[currentIndex],
      index: currentIndex,
      total: FIGURES.length
    };
  }

  return {
    start,
    next,
    random,
    getCurrent,
    onChange
  };
}
