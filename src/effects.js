import { findEffectByKey } from './commands.js';

const IMPACT_COLOR = 'rgba(79, 70, 229, 0.6)';

// Deterministic pseudo-random for natural variation
function pseudoRand(seed, index) {
  const x = Math.sin(seed + index * 127.1 + index * index * 0.013) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Particle class ───────────────────────────────────────

class Particle {
  constructor(cmd, index, viewportW, viewportH) {
    const seedKeys = { flower: 7919, snow: 6271, heart: 4523, star: 3499, leaf: 8017, bubble: 6257 };
    const seed = seedKeys[cmd.key] || 4523;

    const columns = cmd.columns;
    const columnBase = index % columns;
    const jitter = (pseudoRand(seed, index) - 0.5) * 0.3;
    const columnJittered = Math.max(0, Math.min(columns - 1, columnBase + jitter));
    const wave = Math.floor(index / columns);
    const depthLayer = index % 4;

    // Position
    const xRatio = columnJittered / (columns - 1);
    this.baseX = xRatio * viewportW;
    this.baseY = cmd.key === 'bubble'
      ? viewportH * (0.9 + pseudoRand(seed + 9, index) * 0.15)
      : viewportH * (-0.15 - wave * 0.08 - pseudoRand(seed + 9, index) * 0.06);

    this.x = this.baseX;
    this.y = this.baseY;

    // Drift & sway
    const driftDir = pseudoRand(seed + 1, index) < 0.5 ? -1 : 1;
    this.drift = driftDir * (10 + pseudoRand(seed + 10, index) * 35);
    const swayDir = index % 2 === 0 ? 1 : -1;
    this.sway = swayDir * (8 + pseudoRand(seed + 11, index) * 22);

    // Timing
    this.duration = cmd.fallBase + ((index * 137) % cmd.fallRange);
    this.delay = (wave * 200) + ((columnBase % 12) * 30) + Math.floor(pseudoRand(seed + 2, index) * 50);
    this.elapsed = -this.delay;

    // Appearance
    this.glyph = cmd.glyphs[index % cmd.glyphs.length];
    this.scale = depthLayer < 2
      ? (0.45 + pseudoRand(seed + 3, index) * 0.35)
      : (0.7 + pseudoRand(seed + 4, index) * 0.55);
    this.fontSize = depthLayer < 2
      ? 16 + Math.floor(pseudoRand(seed + 5, index) * 14)
      : 26 + Math.floor(pseudoRand(seed + 6, index) * 18);
    this.baseOpacity = depthLayer < 2
      ? (0.3 + pseudoRand(seed + 7, index) * 0.3)
      : (0.55 + pseudoRand(seed + 8, index) * 0.45);
    this.opacity = 0;

    // Rotation
    const spinDir = index % 2 === 0 ? 1 : -1;
    this.spin = spinDir * (120 + (index % 11) * 50);
    this.rotation = 0;

    // Active flag
    this.alive = true;
  }

  update(dt, viewportW, viewportH) {
    this.elapsed += dt;

    if (this.elapsed < 0) {
      // Still in delay phase
      this.opacity = 0;
      return;
    }

    const progress = Math.min(this.elapsed / this.duration, 1);

    // Update position based on effect type
    // Use the same keyframe logic as CSS animations
    if (this.elapsed < this.duration) {
      this.y = this.baseY + progress * viewportH * 1.1;

      // Horizontal drift and sway
      const swayOffset = Math.sin(progress * Math.PI * 3) * this.sway;
      this.x = this.baseX + swayOffset + progress * this.drift;

      // Rotation
      this.rotation = (this.spin * progress * Math.PI) / 180;

      // Opacity: fade in early, fade out late
      if (progress < 0.06) {
        this.opacity = this.baseOpacity * (progress / 0.06);
      } else if (progress > 0.88) {
        this.opacity = this.baseOpacity * Math.max(0, (1 - progress) / 0.12);
      } else {
        this.opacity = this.baseOpacity;
      }
    } else {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    ctx.font = `${this.fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "EmojiOne Color", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.glyph, 0, 0);
    ctx.restore();
  }
}

// ─── Impact ring ──────────────────────────────────────────

class ImpactRing {
  constructor(viewportW, viewportH) {
    this.cx = viewportW / 2;
    this.cy = viewportH / 2;
    this.maxRadius = Math.min(viewportW, viewportH) * 0.4;
    this.duration = 1200;
    this.elapsed = 0;
    this.alive = true;
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const progress = this.elapsed / this.duration;
    const radius = this.maxRadius * progress;
    const opacity = 1 - progress;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = IMPACT_COLOR;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Canvas effect controller ─────────────────────────────

export function createVoiceEffectController({
  layer,
  createElement: _createElement, // ignored — Canvas doesn't use DOM creation
  timers = globalThis,
  durationMs = 7200
}) {
  if (!layer) {
    throw new Error('voice effect layer is required');
  }

  const hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';

  const raf = hasDOM
    ? (window.requestAnimationFrame || window.webkitRequestAnimationFrame || ((fn) => timers.setTimeout(fn, 16)))
    : ((fn) => timers.setTimeout(fn, 16));

  const caf = hasDOM
    ? (window.cancelAnimationFrame || window.webkitCancelAnimationFrame || ((id) => timers.clearTimeout(id)))
    : ((id) => timers.clearTimeout(id));

  let canvas = null;
  let ctx = null;
  let particles = [];
  let rings = [];
  let animationId = null;
  let clearTimer = null;
  let lastFrameTime = 0;
  let running = false;

  function initCanvas() {
    if (!canvas && hasDOM) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block';
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      layer.append(canvas);
    } else if (!canvas) {
      // In test/Node.js environment, create a stub canvas
      const stubCtx = {
        clearRect() {},
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        scale() {},
        beginPath() {},
        arc() {},
        stroke() {},
        setTransform() {},
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        fillText() {}
      };
      canvas = {
        tagName: 'CANVAS',
        clientWidth: 800,
        clientHeight: 600,
        width: 800,
        height: 600,
        style: {},
        setAttribute() {},
        remove() {
          const idx = layer.children.indexOf(canvas);
          if (idx >= 0) layer.children.splice(idx, 1);
        },
        getContext() { return stubCtx; }
      };
      ctx = stubCtx;
      layer.append(canvas);
    }
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = layer.getBoundingClientRect();
    const dpr = hasDOM ? (window.devicePixelRatio || 1) : 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function animate(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min(timestamp - lastFrameTime, 50); // cap at 50ms to avoid spiral
    lastFrameTime = timestamp;

    const viewportW = canvas ? canvas.clientWidth : 800;
    const viewportH = canvas ? canvas.clientHeight : 600;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt, viewportW, viewportH);
      if (!particles[i].alive) {
        particles.splice(i, 1);
      }
    }

    // Update impact rings
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].update(dt);
      if (!rings[i].alive) {
        rings.splice(i, 1);
      }
    }

    // Clear canvas and draw
    ctx.clearRect(0, 0, viewportW, viewportH);

    for (const ring of rings) {
      ring.draw(ctx);
    }

    for (const p of particles) {
      if (p.y < viewportH + 50 && p.y > -50) {
        p.draw(ctx);
      }
    }

    // Continue animation
    if (particles.length > 0 || rings.length > 0) {
      animationId = raf(animate);
    } else {
      running = false;
      animationId = null;
      if (canvas) {
        ctx.clearRect(0, 0, viewportW, viewportH);
      }
      if (layer?.dataset) {
        delete layer.dataset.effect;
      }
    }
  }

  function startAnimation() {
    if (animationId) return;
    lastFrameTime = 0;
    running = true;
    animationId = raf(animate);
  }

  function clear() {
    if (clearTimer) {
      timers.clearTimeout(clearTimer);
      clearTimer = null;
    }
    particles = [];
    rings = [];
    if (animationId) {
      caf(animationId);
      animationId = null;
    }
    running = false;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
    if (layer?.dataset) {
      delete layer.dataset.effect;
    }
  }

  function scheduleClear() {
    clearTimer = timers.setTimeout(() => {
      clearTimer = null;
      clear();
    }, durationMs);
  }

  function show(cmd) {
    clear();

    if (layer?.dataset) {
      layer.dataset.effect = cmd.key;
    }

    initCanvas();
    resizeCanvas();

    const viewportW = canvas.clientWidth;
    const viewportH = canvas.clientHeight;

    // Add impact ring
    rings.push(new ImpactRing(viewportW, viewportH));

    // Create particles
    for (let index = 0; index < cmd.count; index += 1) {
      particles.push(new Particle(cmd, index, viewportW, viewportH));
    }

    startAnimation();
    scheduleClear();
    return cmd.key;
  }

  // Handle resize
  function onResize() {
    if (canvas && particles.length > 0) {
      const oldW = canvas.clientWidth;
      const oldH = canvas.clientHeight;
      resizeCanvas();
      const newW = canvas.clientWidth;
      const newH = canvas.clientHeight;
      // Recalculate base positions for existing particles
      const scaleX = newW / oldW;
      const scaleY = newH / oldH;
      let hasAnimating = false;
      for (const p of particles) {
        p.baseX *= scaleX;
        p.baseY *= scaleY;
        p.x *= scaleX;
        p.y *= scaleY;
        if (p.alive) hasAnimating = true;
      }
      for (const ring of rings) {
        ring.cx *= scaleX;
        ring.cy *= scaleY;
        ring.maxRadius *= Math.min(scaleX, scaleY);
      }
      if (hasAnimating) startAnimation();
    }
  }

  if (hasDOM) {
    window.addEventListener('resize', onResize);
  }

  return {
    clear,
    triggerByKey(key) {
      const cmd = findEffectByKey(key);
      return cmd ? show(cmd) : false;
    },
    dispose() {
      clear();
      if (hasDOM) {
        window.removeEventListener('resize', onResize);
      }
      if (canvas) {
        canvas.remove();
        canvas = null;
        ctx = null;
      }
    }
  };
}
