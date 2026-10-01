export default {
  id: 'calabi',
  indexStr: '[ 04 / 04 ]',
  name: 'CALABI-YAU',
  quote: '"В том, что остаётся после."',

  init(ctx, getDimensions) {
    const PI = Math.PI;
    const TWO_PI = 2 * PI;
    const RAMP = " .`:;+*ox#%@";
    const camDist = 4.5;

    let rotX = 0.2, rotY = 0, zoom = 1;
    let userRotX = 0, userRotY = 0;
    let velX = 0, velY = 0;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let pinchStartDist = 0, pinchStartZoom = 1;
    let touchMode = null;

    let t = 0;
    let lastTime = performance.now();
    let animId = null;

    function calabiYau(u, v, time, breathe) {
      const n = 4;
      const k = 4;
      const twist = 0.4 * Math.sin(time * 0.5);

      const r = 1 + 0.5 * Math.cos(n * u + twist) * Math.cos(k * v);

      const sinV = Math.sin(v);
      const cosV = Math.cos(v);

      let x = r * Math.cos(u) * sinV * breathe;
      let y = r * Math.sin(u) * sinV * breathe;
      let z = r * cosV * 1.5;

      const fold = 0.22 * Math.sin(4 * u + time) * Math.sin(2 * v + time * 0.7);
      x += fold * sinV;
      y += fold * cosV;
      z += 0.15 * Math.cos(8 * u + time * 0.6);

      return { x, y, z };
    }

    function project(x, y, z) {
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;

      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const y1 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;

      const zc = z2 + camDist;
      if (zc < 0.1) return null;
      return { sx: (x1 * 1.8 * zoom) / zc, sy: (y1 * 1.8 * zoom) / zc, depth: zc };
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      t += dt;

      const { W, H, COLS, ROWS, CHAR_W, CHAR_H } = getDimensions();
      if (COLS <= 0 || ROWS <= 0) {
        animId = requestAnimationFrame(frame);
        return;
      }

      let autoRotY, autoRotX;
      if (!dragging) {
        autoRotY = rotY + dt * 0.35;
        rotY = autoRotY;
        autoRotX = Math.sin(t * 0.3) * 0.25;
      } else {
        autoRotX = 0;
        autoRotY = rotY;
      }

      if (!dragging) {
        userRotY += velY * dt * 60 * 0.02;
        userRotX += velX * dt * 60 * 0.02;
        velX *= 0.92; velY *= 0.92;
        userRotX = Math.max(-1.2, Math.min(1.2, userRotX));
        userRotX *= 0.995;
      }

      rotY = autoRotY + userRotY;
      rotX = autoRotX + userRotX;

      const breathe = 1 + 0.22 * Math.sin(t * 0.9);

      const zbuf = new Float32Array(COLS * ROWS).fill(Infinity);
      const cbuf = new Array(COLS * ROWS).fill(' ');

      const plot = (px, py, depth, bright) => {
        const ix = px | 0, iy = py | 0;
        if (ix < 0 || ix >= COLS || iy < 0 || iy >= ROWS) return;
        const idx = iy * COLS + ix;
        if (depth < zbuf[idx]) {
          zbuf[idx] = depth;
          const b = Math.max(0, Math.min(1, bright));
          cbuf[idx] = RAMP[(b * (RAMP.length - 1)) | 0];
        }
      };

      const U_SEG = 90;
      const V_SEG = 90;

      const pts = [];
      for (let i = 0; i <= U_SEG; i++) {
        for (let j = 0; j <= V_SEG; j++) {
          const u = (i / U_SEG) * 2 * PI;
          const v = (j / V_SEG) * 2 * PI;
          const p = calabiYau(u, v, t, breathe);
          const proj = project(p.x, p.y, p.z);
          if (!proj) continue;

          const px = (proj.sx * 0.5 + 0.5) * COLS;
          const py = (proj.sy * 0.5 + 0.5) * ROWS;

          const bright = 1 - (proj.depth - 2.5) / 3;
          const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          const shade = 0.5 + 0.5 * Math.cos(r * 3 + t);

          pts.push({ px, py, depth: proj.depth, bright: bright * shade });
        }
      }
      pts.sort((a, b) => b.depth - a.depth);
      for (const p of pts) plot(p.px, p.py, p.depth, p.bright);

      const drawLine = (getPoint, n, brightBase) => {
        let prev = null;
        for (let i = 0; i <= n; i++) {
          const p = getPoint(i / n);
          const proj = project(p.x, p.y, p.z);
          if (!proj) { prev = null; continue; }
          const px = (proj.sx * 0.5 + 0.5) * COLS;
          const py = (proj.sy * 0.5 + 0.5) * ROWS;

          if (prev) {
            const steps = Math.max(2, Math.floor(Math.hypot(px - prev.px, py - prev.py) * 2));
            for (let s = 0; s <= steps; s++) {
              const f = s / steps;
              const lx = prev.px + (px - prev.px) * f;
              const ly = prev.py + (py - prev.py) * f;
              const ld = prev.depth + (proj.depth - prev.depth) * f;
              plot(lx, ly, ld, brightBase);
            }
          }
          prev = { px, py, depth: proj.depth };
        }
      };

      const N_LINES = 8;
      for (let kk = 0; kk < N_LINES; kk++) {
        const u0 = (kk / N_LINES) * 2 * PI;
        drawLine((v) => calabiYau(u0, v * 2 * PI, t, breathe), 60, 0.95);
      }
      for (let kk = 0; kk < 6; kk++) {
        const v0 = (kk / 6) * PI;
        drawLine((u) => calabiYau(u * 2 * PI, v0, t, breathe), 60, 0.7);
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.font = `${CHAR_H}px 'Courier New', monospace`;
      ctx.textBaseline = 'top';

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const ch = cbuf[y * COLS + x];
          if (ch === ' ') continue;
          const ci = RAMP.indexOf(ch);
          const alpha = 0.15 + (ci / (RAMP.length - 1)) * 0.85;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillText(ch, x * CHAR_W, y * CHAR_H);
        }
      }

      animId = requestAnimationFrame(frame);
    }

    const canvas = ctx.canvas;

    const onMouseDown = (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; velX = velY = 0;
      document.body.classList.add('canvas-dragging');
    };
    const onMouseMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      userRotY += dx * 0.01;
      userRotX += dy * 0.01;
      userRotX = Math.max(-1.2, Math.min(1.2, userRotX));
      velY = dx * 0.01; velX = dy * 0.01;
    };
    const onMouseUp = () => {
      dragging = false;
      document.body.classList.remove('canvas-dragging');
    };
    const onWheel = (e) => {
      e.preventDefault();
      zoom = Math.max(0.3, Math.min(4, zoom * Math.exp(-e.deltaY * 0.001)));
    };
    const onDblClick = () => {
      userRotX = 0; userRotY = 0;
      velX = velY = 0;
      zoom = 1;
    };

    const onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        touchMode = 'drag'; dragging = true;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        velX = velY = 0;
      } else if (e.touches.length === 2) {
        touchMode = 'pinch'; dragging = false;
        pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartZoom = zoom;
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (touchMode === 'drag' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        userRotY += dx * 0.012;
        userRotX += dy * 0.012;
        userRotX = Math.max(-1.2, Math.min(1.2, userRotX));
        velY = dx * 0.012; velX = dy * 0.012;
      } else if (touchMode === 'pinch' && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchStartDist > 0) {
          zoom = Math.max(0.3, Math.min(4, pinchStartZoom * (dist / pinchStartDist)));
        }
      }
    };
    const onTouchEnd = (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        touchMode = null; dragging = false;
      } else if (e.touches.length === 1) {
        touchMode = 'drag'; dragging = true;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      document.body.classList.remove('canvas-dragging');
    };
  }
};
