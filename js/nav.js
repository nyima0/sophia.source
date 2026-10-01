// js/nav.js
export function createNav(scrollContainer, sections, dots) {
  let currentIndex = 0;

  function setActive(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  // Клик по точке — плавный скролл к секции
  dots.forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      sections[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Отслеживаем активную секцию по скроллу
  const observer = new IntersectionObserver(
    (entries) => {
      // Находим секцию, которая занимает больше всего экрана
      let best = null;
      let bestRatio = 0;
      for (const entry of entries) {
        if (entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          best = entry.target;
        }
      }
      if (best) {
        const idx = sections.indexOf(best);
        if (idx >= 0) setActive(idx);
      }
    },
    {
      root: scrollContainer,
      threshold: [0.25, 0.5, 0.75]
    }
  );

  sections.forEach((s) => observer.observe(s));

  // Клавиатура: стрелки вверх/вниз — переход между секциями
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      const next = Math.min(sections.length - 1, currentIndex + 1);
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      const prev = Math.max(0, currentIndex - 1);
      sections[prev].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return { setActive };
}
