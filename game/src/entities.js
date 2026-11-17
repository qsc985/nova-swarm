// The things that move and collide: the player ship, the enemy swarm,
// the player's bullets and the gems enemies drop.
// Each entity is plain data plus a small step function; the Game owns the
// lists and the collision passes.

import { ENEMIES, PLAYER, BULLET, GEMS } from './config.js';
import { clamp, dist2 } from './utils.js';

export function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    invuln: 0,
    fireCooldown: 0,
    // Upgradeable stats (upgrades.js mutates these).
    fireRate: PLAYER.fireRate,
    damage: PLAYER.bulletDamage,
    projectiles: 1,
    speed: PLAYER.maxSpeed,
    magnet: PLAYER.magnetRadius,
    pierce: 0,
    alive: true,
  };
}

export function stepPlayer(player, input, dt, width, height) {
  const accel = PLAYER.accel;
  player.vx += input.moveX * accel * dt;
  player.vy += input.moveY * accel * dt;
  const damp = Math.pow(PLAYER.drag, dt * 60);
  player.vx *= damp;
  player.vy *= damp;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > player.speed) {
    player.vx = (player.vx / speed) * player.speed;
    player.vy = (player.vy / speed) * player.speed;
  }
  player.x = clamp(player.x + player.vx * dt, player.radius, width - player.radius);
  player.y = clamp(player.y + player.vy * dt, player.radius, height - player.radius);
  player.angle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
  if (player.invuln > 0) player.invuln -= dt;
  if (player.fireCooldown > 0) player.fireCooldown -= dt;
}

export function playerCanFire(player, input) {
  return player.alive && input.firing && player.fireCooldown <= 0;
}

export function fireBullets(player) {
  const bullets = [];
  const spread = 0.14; // radians between projectiles
  const n = player.projectiles;
  for (let i = 0; i < n; i++) {
    const offset = (i - (n - 1) / 2) * spread;
    const angle = player.angle + offset;
    bullets.push({
      x: player.x + Math.cos(angle) * (player.radius + 6),
      y: player.y + Math.sin(angle) * (player.radius + 6),
      vx: Math.cos(angle) * PLAYER.bulletSpeed,
      vy: Math.sin(angle) * PLAYER.bulletSpeed,
      radius: BULLET.radius,
      damage: player.damage,
      pierce: player.pierce,
      life: BULLET.life,
      hitSet: new Set(),
    });
  }
  player.fireCooldown = 1 / player.fireRate;
  return bullets;
}

export function makeEnemy(kind, x, y, wave) {
  const def = ENEMIES[kind];
  const hpScale = 1 + Math.floor((wave - 1) / 4); // tougher in later waves
  return {
    kind, x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: def.hp + (kind === 'bulwark' ? hpScale - 1 : 0),
    maxHp: def.hp + (kind === 'bulwark' ? hpScale - 1 : 0),
    speed: def.speed * (1 + Math.min(0.35, (wave - 1) * 0.03)),
    score: def.score,
    color: def.color,
    shape: def.shape,
    angle: 0,
    wobble: Math.random() * Math.PI * 2,
    dashTimer: 1.2 + Math.random(),
    dashing: 0,
    flash: 0, // white hit-flash timer
  };
}

export function stepEnemy(enemy, player, dt, time) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;
  if (enemy.flash > 0) enemy.flash -= dt;

  if (enemy.kind === 'weaver') {
    // Sine-wave approach: forward plus a perpendicular wobble.
    const wob = Math.sin(time * 3.2 + enemy.wobble) * 0.9;
    enemy.vx = (nx + -ny * wob) * enemy.speed;
    enemy.vy = (ny + nx * wob) * enemy.speed;
  } else if (enemy.kind === 'mite' && enemy.dashing > 0) {
    enemy.dashing -= dt;
    enemy.vx = nx * enemy.speed * 2.6;
    enemy.vy = ny * enemy.speed * 2.6;
  } else {
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
    if (enemy.kind === 'mite') {
      enemy.dashTimer -= dt;
      if (enemy.dashTimer <= 0) {
        enemy.dashing = 0.28;
        enemy.dashTimer = 1.6 + Math.random() * 1.2;
      }
    }
  }
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  enemy.angle = Math.atan2(enemy.vy, enemy.vx);
}

export function stepBullets(bullets, dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > 1300 || b.y < -20 || b.y > 740) {
      bullets.splice(i, 1);
    }
  }
}

export function makeGem(x, y, value) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 90,
    vy: (Math.random() - 0.5) * 90,
    radius: GEMS.radius,
    value,
    life: GEMS.lifeSeconds,
  };
}

export function stepGems(gems, player, dt) {
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.life -= dt;
    if (g.life <= 0) { gems.splice(i, 1); continue; }
    const d2 = dist2(g.x, g.y, player.x, player.y);
    const attract = Math.max(player.magnet, GEMS.attractRadius);
    if (player.alive && d2 < attract * attract) {
      const d = Math.sqrt(d2) || 1;
      const pull = GEMS.attractSpeed * (1 - d / attract) + 120;
      g.vx += ((player.x - g.x) / d) * pull * dt * 4;
      g.vy += ((player.y - g.y) / d) * pull * dt * 4;
    }
    g.vx *= 0.92;
    g.vy *= 0.92;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
  }
}
