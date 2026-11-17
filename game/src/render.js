// All canvas drawing: the starfield, the arena grid, the ship, the swarm,
// bullets, gems and the in-game HUD. Menus live in the DOM (index.html);
// the canvas only ever draws the world itself.

import { VIEW, COLORS } from './config.js';
import { formatNumber } from './utils.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * VIEW.width,
        y: Math.random() * VIEW.height,
        r: Math.random() * 1.6 + 0.4,
        tw: Math.random() * Math.PI * 2,
      });
    }
    this.shake = 0;
  }

  addShake(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  drawBackground(time) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Twinkling stars.
    for (const s of this.stars) {
      const a = 0.25 + 0.3 * Math.abs(Math.sin(time * 0.9 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = COLORS.star;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Faint grid.
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 64) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW.height);
    }
    for (let y = 0; y <= VIEW.height; y += 64) {
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW.width, y);
    }
    ctx.stroke();

    // Soft vignette frame.
    const grad = ctx.createRadialGradient(
      VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42,
      VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.85,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(2,6,23,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  // The world is drawn inside a shake transform; call beginWorld before
  // drawing entities and endWorld after.
  beginWorld(dt) {
    const { ctx } = this;
    ctx.save();
    if (this.shake > 0.2) {
      const s = this.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      this.shake *= Math.pow(0.02, dt);
    } else {
      this.shake = 0;
    }
  }

  endWorld() {
    this.ctx.restore();
  }

  drawShip(player, time) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    const blink = player.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemy(e) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
    const r = e.radius;
    ctx.beginPath();
    if (e.shape === 'tri') {
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.8, -r * 0.8);
      ctx.lineTo(-r * 0.8, r * 0.8);
    } else if (e.shape === 'square') {
      ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    } else if (e.shape === 'diamond') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
    } else if (e.shape === 'hex') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    } else {
      // penta (bulwark)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Core dot, and a health bar when hurt.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, r * 0.22), 0, Math.PI * 2);
    ctx.fill();
    if (e.hp < e.maxHp) {
      ctx.rotate(-e.angle);
      const w = r * 1.8;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-w / 2, -r - 9, w, 3);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(-w / 2, -r - 9, w * (e.hp / e.maxHp), 3);
    }
    ctx.restore();
  }

  drawBullet(b) {
    const { ctx } = this;
    ctx.save();
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  drawGem(g, time) {
    const { ctx } = this;
    const pulse = 1 + 0.18 * Math.sin(time * 6 + g.x);
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(pulse, pulse);
    ctx.rotate(time * 2);
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawHud(state) {
    const { ctx } = this;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Top-left: score.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SCORE', 20, 30);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(formatNumber(state.score), 20, 62);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST ${formatNumber(state.best)}`, 20, 84);

    // Top-centre: wave and enemies left.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('WAVE', VIEW.width / 2, 30);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '800 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(state.wave), VIEW.width / 2, 62);
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(
      state.phase === 'playing' ? `${state.enemiesLeft} HOSTILES LEFT` : state.phaseLabel,
      VIEW.width / 2, 84,
    );

    // Top-right: hull hearts.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HULL', VIEW.width - 20, 30);
    for (let i = 0; i < state.maxHp; i++) {
      const x = VIEW.width - 28 - i * 30;
      const y = 52;
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = i < state.hp ? '#fb7185' : 'transparent';
      ctx.shadowBlur = i < state.hp ? 10 : 0;
      ctx.fillStyle = i < state.hp ? '#fb7185' : 'rgba(148,163,184,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-11, -2, -6, -10, 0, -4);
      ctx.bezierCurveTo(6, -10, 11, -2, 0, 8);
      ctx.fill();
      ctx.restore();
    }

    // Combo meter, bottom centre.
    if (state.combo > 1) {
      const w = 220;
      const x = (VIEW.width - w) / 2;
      const y = VIEW.height - 30;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.font = '800 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`COMBO ×${state.combo}`, VIEW.width / 2, y - 8);
      ctx.fillStyle = 'rgba(250,204,21,0.25)';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x, y, w * state.comboFrac, 5);
    }

    // Wave banner (big centre text that fades).
    if (state.banner && state.bannerAlpha > 0) {
      ctx.globalAlpha = Math.min(1, state.bannerAlpha);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '800 54px "Segoe UI", system-ui, sans-serif';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 24;
      ctx.fillText(state.banner, VIEW.width / 2, VIEW.height / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Hurt vignette.
    if (state.hurtFlash > 0) {
      const g = ctx.createRadialGradient(
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.3,
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.75,
      );
      g.addColorStop(0, 'rgba(244,63,94,0)');
      g.addColorStop(1, `rgba(244,63,94,${0.45 * state.hurtFlash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    ctx.restore();
  }
}
