// Particles, shockwaves and floating score text: the juice that makes
// every kill, pickup and hit feel like something happened.

export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.shocks = [];
  }

  burst(x, y, color, count, speed = 260, life = 0.55, size = 3) {
    for (let i = 0; i < count; i++) {
      if (this.list.length >= 420) return;
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.85);
      this.list.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.9),
        color,
      });
    }
  }

  shockwave(x, y, color, maxRadius = 90) {
    this.shocks.push({ x, y, radius: 6, maxRadius, color, life: 0.4, maxLife: 0.4 });
  }

  floatText(x, y, text, color = '#e2e8f0', size = 16) {
    this.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i];
      s.life -= dt;
      s.radius = s.maxRadius * (1 - s.life / s.maxLife);
      if (s.life <= 0) this.shocks.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const s of this.shocks) {
      const a = Math.max(0, s.life / s.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
