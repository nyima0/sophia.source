export default {
  id: 'phyllotaxis',
  indexStr: '[ 01 / 04 ]',
  name: 'PHYLLOTAXIS',
  quote: '"Одни нашли одних."',

  init(ctx, getDimensions) {
    const PI = Math.PI;
    const GOLDEN_ANGLE = PI * (3 - Math.sqrt(5));
    const N_FILAMENTS = 13;
    const S_MAX_BASE = 1.0;
    const R_SPHERE = 1.0;
    const RAMP = " .`:-;+*ox#%@";
    const camDist = 3.2;

    let rotX = 0.15, rotY = 0, zoom = 1;
    let userRotX = 0, userRotY = 0;
    let velX = 0, velY = 0;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let pinchStartDist = 0, pinchStartZoom = 1;
    let touchMode = null;

    let smoothTargetX = 0, smoothTargetY = 0, smoothTargetZ = 0;
    let t = 0;
    let lastTime = performance.now();
    let animId = null;

    function spiralPoint(k, s, time) {
      const phi_k = k * GOLDEN_ANGLE;
      const sMax = S_MAX_BASE * (1 + 0.45 * Math.sin(time * 0.5 + k * 0.3));
      const sLocal = s * sMax;
      const c = 2.2 + 0.5 * Math.sin(time * 0.3);
      const b = 0.55;
      const r = Math.exp(b * sLocal) - 1.0;
      const theta = phi_k + c * sLocal;
      const psi = PI * 0.5 + sLocal * 1.4;
      const R = R_SPHERE + 0.35 * r;
      return {
        x: R * Math.sin(psi) * Math.cos(theta),
        y: R * Math.sin(psi) * Math.sin(theta),
        z: R * Math.cos(psi)
      };
    }

    function project(x, y, z) {
      const px = x - smoothTargetX;
      const py = y - smoothTargetY;
      const pz = z - smoothTargetZ;

      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const x1 = px * cy + pz * sy;
      const z1 = -px * sy + pz * cy;

      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const y1 = py * cx - z1 * sx;
      const z2 = py * sx + z1 * cx;

      const zc = z2 + camDist;
      if (zc < 0.1) return null;
      return { sx: (x1 * 2.2 * zoom) / zc, sy: (y1 * 2.2 * zoom) / zc, depth: zc };
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

      let autoRotY = dragging ? 0 : 0.9 * Math.sin(t * 0.22);
      let autoRotX = dragging ? 0 : 0.35 * Math.sin(t * 0.31 + 1.7);

      if (!dragging) {
        userRotY += velY * dt * 60 * 0.02;
        userRotX += velX * dt * 60 * 0.02;
        velX *= 0.92; velY *= 0.92;
        userRotX *= 0.97; userRotY *= 0.97;
      }
      rotY = autoRotY + userRotY;
      rotX = autoRotX + userRotX;

      const S_STEPS = 120;
      const allPts = [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;

      for (let k = 0; k < N_FILAMENTS; k++) {
        for (let i = 0; i <= S_STEPS; i++) {
          const s = i / S_STEPS;
          const p = spiralPoint(k, s, t);
          allPts.push({ k, s, x: p.x, y: p.y, z: p.z });
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
          if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
        }
      }

      const targetX = (minX + maxX) * 0.5;
      const targetY = (minY + maxY) * 0.5;
      const targetZ = (minZ + maxZ) * 0.5;
      smoothTargetX += (targetX - smoothTargetX) * 0.08;
      smoothTargetY += (targetY - smoothTargetY) * 0.08;
      smoothTargetZ += (targetZ - smoothTargetZ) * 0.08;

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

      const byFilament = Array.from({ length: N_FILAMENTS }, () => []);
      for (const p of allPts) {
        const proj = project(p.x, p.y, p.z);
        if (!proj) continue;
        const px = (proj.sx * 0.5 + 0.5) * COLS;
        const py = (proj.sy * 0.5 + 0.5) * ROWS;
        const bright = (1 - (proj.depth - 1.5) / 3) * (0.25 + 0.75 * Math.pow(p.s, 0.7));
        byFilament[p.k].push({ px, py, depth: proj.depth, bright });
      }

      for (let k = 0; k < N_FILAMENTS; k++) {
        const pts = byFilament[k];
        pts.sort((a, b) => b.depth - a.depth);
        for (const pt of pts) plot(pt.px, pt.py, pt.depth, pt.bright);
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const dx = b.px - a.px, dy = b.py - a.py;
          const steps = Math.max(1, Math.floor(Math.hypot(dx, dy)));
          for (let s = 1; s < steps; s++) {
            const f = s / steps;
            plot(a.px + dx * f, a.py + dy * f, a.depth + (b.depth - a.depth) * f, (a.bright + (b.bright - a.bright) * f) * 0.85);
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
          ctx.fillStyle = `rgba(255,255,255,${0.10 + (ci / (RAMP.length - 1)) * 0.75})`;
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
    const onMouseUp = () => { dragging = false; document.body.classList.remove('canvas-dragging'); };
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
        pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        pinchStartZoom = zoom;
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (touchMode === 'drag' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        userRotY = Math.max(-2, Math.min(2, userRotY + dx * 0.012));
        userRotX = Math.max(-1, Math.min(1, userRotX + dy * 0.012));
        velY = dx * 0.012; velX = dy * 0.012;
      } else if (touchMode === 'pinch' && e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchStartDist > 0) zoom = Math.max(0.3, Math.min(4, pinchStartZoom * (dist / pinchStartDist)));
      }
    };
    const onTouchEnd = (e) => {
      e.preventDefault();
      if (e.touches.length === 0) { touchMode = null; dragging = false; }
      else if (e.touches.length === 1) {
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
