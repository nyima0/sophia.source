export default {
  id: 'hopf',
  indexStr: '[ 03 / 04 ]',
  name: 'HOPF FIBRATION',
  quote: '"Одна задача. Много решений."',

  init(ctx, getDimensions) {
    const PI = Math.PI;
    const TWO_PI = 2 * PI;

    const N_THETA = 8;
    const N_PHI = 10;
    const PSI_STEPS = 40;
    const THETA_MIN = 0.40;
    const THETA_MAX = PI - 0.40;
    const FLOW_PSI = 0.55;
    const FLOW_PHI = 0.15;
    const POLE_SHIFT = 0.22;
    const THETA_BRIGHT_POW = 1.3;
    const ALPHA_MIN = 0.18;
    const ALPHA_MAX = 0.85;
    const RAMP = " .`:-;+*ox#%@";
    const camDist = 4.5;

    let rotX = 0.15, rotY = 0, zoom = 1;
    let userRotX = 0, userRotY = 0;
    let velX = 0, velY = 0;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let pinchStartDist = 0, pinchStartZoom = 1;
    let touchMode = null;

    let t = 0;
    let lastTime = performance.now();
    let animId = null;

    function hopfPoint(theta, phi, psi) {
      const c = Math.cos(theta * 0.5);
      const s = Math.sin(theta * 0.5);
      const x = c * Math.cos(psi);
      const y = c * Math.sin(psi);
      const z = s * Math.cos(psi + phi);
      const w = s * Math.sin(psi + phi);
      const denom = 1 - w + POLE_SHIFT;
      if (denom < 0.05) return null;
      return { x: x / denom, y: y / denom, z: z / denom };
    }

    function project(x, y, z) {
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;

      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const y1 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;

      const zc = z2 + camDist;
      if (zc < 0.15) return null;
      return { sx: (x1 * 1.6 * zoom) / zc, sy: (y1 * 1.6 * zoom) / zc, depth: zc };
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

      let autoRotY = dragging ? 0 : 0.85 * Math.sin(t * 0.20);
      let autoRotX = dragging ? 0 : 0.30 * Math.sin(t * 0.27 + 1.3);

      if (!dragging) {
        userRotY += velY * dt * 60 * 0.02;
        userRotX += velX * dt * 60 * 0.02;
        velX *= 0.92; velY *= 0.92;
        userRotX *= 0.97; userRotY *= 0.97;
      }
      rotY = autoRotY + userRotY;
      rotX = autoRotX + userRotX;

      const psiFlow = t * FLOW_PSI;
      const phiFlow = t * FLOW_PHI;

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

      for (let i = 0; i <= N_THETA; i++) {
        const theta = THETA_MIN + (i / N_THETA) * (THETA_MAX - THETA_MIN);
        const thetaBright = Math.pow(Math.sin(theta), THETA_BRIGHT_POW);

        for (let j = 0; j <= N_PHI; j++) {
          const phi = (j / N_PHI) * TWO_PI + phiFlow;

          for (let k = 0; k <= PSI_STEPS; k++) {
            const psi = (k / PSI_STEPS) * TWO_PI + psiFlow;
            const p = hopfPoint(theta, phi, psi);
            if (!p) continue;
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) continue;

            const proj = project(p.x, p.y, p.z);
            if (!proj) continue;

            const px = (proj.sx * 0.5 + 0.5) * COLS;
            const py = (proj.sy * 0.5 + 0.5) * ROWS;
            let bright = 1 - (proj.depth - 2.5) / 4.0;
            bright *= thetaBright;
            plot(px, py, proj.depth, bright);
          }
        }
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
          const k = ci / (RAMP.length - 1);
          const alpha = ALPHA_MIN + k * (ALPHA_MAX - ALPHA_MIN);
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
      userRotY = Math.max(-2, Math.min(2, userRotY + dx * 0.01));
      userRotX = Math.max(-1, Math.min(1, userRotX + dy * 0.01));
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
    const onDblClick = () => { userRotX = userRotY = velX = velY = 0; zoom = 1; };

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
        userRotY = Math.max(-2, Math.min(2, userRotY + dx * 0.012));
        userRotX = Math.max(-1, Math.min(1, userRotX + dy * 0.012));
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
