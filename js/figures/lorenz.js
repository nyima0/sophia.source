export default {
  id: 'lorenz',
  indexStr: '[ 02 / 04 ]',
  name: 'LORENZ ATTRACTOR',
  quote: '"Мы не выравниваем. Мы идём вместе."',

  init(ctx, getDimensions) {
    const SIGMA = 10.0, RHO = 28.0, BETA = 8.0 / 3.0;
    const DT = 0.005, STEPS_PER_FRAME = 4, TRAIL_LENGTH = 3000;
    const SCALE_X = 25.0, SCALE_Y = 30.0, SCALE_Z = 30.0, Z_CENTER = 25.0;
    const RAMP = " .`:-;+*ox#%@";
    const ALPHA_MIN = 0.06, ALPHA_MAX = 0.95;
    const camDist = 3.2;

    let rotX = 0.15, rotY = 0, zoom = 1;
    let userRotX = 0, userRotY = 0;
    let velX = 0, velY = 0;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let pinchStartDist = 0, pinchStartZoom = 1;
    let touchMode = null;

    let state = { x: 0.1, y: 0.1, z: 0.1 };
    const trail = [];
    let t = 0;
    let lastTime = performance.now();
    let animId = null;

    function lorenz(x, y, z) {
      return { dx: SIGMA * (y - x), dy: x * (RHO - z) - y, dz: x * y - BETA * z };
    }

    function rk4Step(s, dt) {
      const k1 = lorenz(s.x, s.y, s.z);
      const k2 = lorenz(s.x + dt * 0.5 * k1.dx, s.y + dt * 0.5 * k1.dy, s.z + dt * 0.5 * k1.dz);
      const k3 = lorenz(s.x + dt * 0.5 * k2.dx, s.y + dt * 0.5 * k2.dy, s.z + dt * 0.5 * k2.dz);
      const k4 = lorenz(s.x + dt * k3.dx, s.y + dt * k3.dy, s.z + dt * k3.dz);
      return {
        x: s.x + dt / 6 * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
        y: s.y + dt / 6 * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
        z: s.z + dt / 6 * (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz)
      };
    }

    for (let i = 0; i < 5000; i++) state = rk4Step(state, DT);

    function project(x, y, z) {
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;

      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const y1 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;

      const zc = z2 + camDist;
      if (zc < 0.15) return null;
      return { sx: (x1 * 2.4 * zoom) / zc, sy: (y1 * 2.4 * zoom) / zc, depth: zc };
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

      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        state = rk4Step(state, DT);
        trail.push({ x: state.x, y: state.y, z: state.z });
        if (trail.length > TRAIL_LENGTH) trail.shift();
      }

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

      const N = trail.length;
      for (let i = 0; i < N; i++) {
        const p = trail[i];
        const np = { x: p.x / SCALE_X, y: p.y / SCALE_Y, z: (p.z - Z_CENTER) / SCALE_Z };
        const proj = project(np.x, np.y, np.z);
        if (!proj) continue;
        const px = (proj.sx * 0.5 + 0.5) * COLS;
        const py = (proj.sy * 0.5 + 0.5) * ROWS;
        const bright = Math.pow(i / N, 2.2);
        plot(px, py, proj.depth, bright);
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
          const alpha = ALPHA_MIN + (ci / (RAMP.length - 1)) * (ALPHA_MAX - ALPHA_MIN);
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
    const onDblClick = () => {
      userRotX = userRotY = velX = velY = 0; zoom = 1;
      state = { x: 0.1, y: 0.1, z: 0.1 };
      trail.length = 0;
      for (let i = 0; i < 5000; i++) state = rk4Step(state, DT);
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
