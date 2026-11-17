// The game itself: states, waves, collisions, scoring, combo.
// States: 'title' -> 'playing' -> 'upgrade' -> 'playing' ... -> 'gameover'.
// The DOM menus (index.html) read `game.state` and call its methods;
// the canvas draws the world every frame.

import { VIEW, WAVES, ENEMIES, COMBO } from './config.js';
import { clamp, mulberry32, pickWeighted } from './utils.js';
import {
  makePlayer, stepPlayer, playerCanFire, fireBullets,
  makeEnemy, stepEnemy, stepBullets, makeGem, stepGems,
} from './entities.js';
import { Particles } from './particles.js';
import { rollUpgrades } from './upgrades.js';

export class Game {
  constructor({ rng, sound, onStateChange }) {
    this.rng = rng;
    this.sound = sound;
    this.onStateChange = onStateChange;
    this.particles = new Particles();
    this.reset();
  }

  reset() {
    this.state = 'title';
    this.time = 0;
    this.score = 0;
    this.best = Number(localStorage.getItem('novaswarm-best') || 0);
    this.wave = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.player = makePlayer(VIEW.width / 2, VIEW.height / 2);
    this.enemies = [];
    this.bullets = [];
    this.gems = [];
    this.particles = new Particles();
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.breather = 0;
    this.upgradeChoices = [];
    this.takenUpgrades = {};
    this.banner = '';
    this.bannerAlpha = 0;
    this.hurtFlash = 0;
    this.waveClearBonusGiven = false;
    this.setState('title');
  }

  setState(next) {
    this.state = next;
    if (this.onStateChange) this.onStateChange(next, this);
  }

  get phaseLabel() {
    if (this.state === 'upgrade') return 'CHOOSE AN UPGRADE';
    if (this.state === 'gameover') return 'GAME OVER';
    if (this.state === 'paused') return 'PAUSED';
    return 'NOVA SWARM';
  }

  get enemiesLeft() {
    return this.enemies.length + this.spawnQueue.length;
  }

  get comboFrac() {
    return this.combo > 1 ? clamp(this.comboTimer / COMBO.windowSeconds, 0, 1) : 0;
  }

  startGame() {
    this.reset();
    this.setState('playing');
    this.sound.ensure();
    this.sound.startMusic();
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    const budget = WAVES.budgetBase + WAVES.budgetPerWave * (this.wave - 1);
    const kinds = Object.keys(ENEMIES).filter((k) => this.wave >= WAVES.unlockWave[k]);
    const queue = [];
    let spent = 0;
    while (spent < budget) {
      const kind = kinds[Math.floor(this.rng() * kinds.length)];
      queue.push(kind);
      spent += WAVES.weights[kind];
    }
    this.spawnQueue = queue;
    this.spawnTimer = 0.6;
    this.waveClearBonusGiven = false;
    this.showBanner(`WAVE ${this.wave}`);
  }

  showBanner(text) {
    this.banner = text;
    this.bannerAlpha = 1;
  }

  spawnOne() {
    const kind = this.spawnQueue.shift();
    if (!kind) return;
    // Spawn just outside a random edge, away from the player.
    const margin = 30;
    const edge = Math.floor(this.rng() * 4);
    let x, y;
    if (edge === 0) { x = this.rng() * VIEW.width; y = -margin; }
    else if (edge === 1) { x = VIEW.width + margin; y = this.rng() * VIEW.height; }
    else if (edge === 2) { x = this.rng() * VIEW.width; y = VIEW.height + margin; }
    else { x = -margin; y = this.rng() * VIEW.height; }
    this.enemies.push(makeEnemy(kind, x, y, this.wave));
  }

  chooseUpgrade(id) {
    const choice = this.upgradeChoices.find((u) => u.id === id);
    if (!choice || this.state !== 'upgrade') return;
    choice.apply(this.player);
    this.takenUpgrades[id] = (this.takenUpgrades[id] || 0) + 1;
    this.sound.upgrade();
    this.particles.shockwave(this.player.x, this.player.y, '#22d3ee', 120);
    this.setState('playing');
    this.nextWave();
  }

  addScore(base, x, y) {
    const mult = Math.max(1, this.combo);
    const gained = base * mult;
    this.score += gained;
    return gained;
  }

  collectGem(gem) {
    this.combo = Math.min(COMBO.maxMultiplier, this.combo + 1);
    this.comboTimer = COMBO.windowSeconds;
    const gained = this.addScore(COMBO.gemScore, gem.x, gem.y);
    this.particles.floatText(gem.x, gem.y - 10, `+${gained}`, '#fde047', 15);
    this.sound.gem(this.combo);
  }

  killEnemy(enemy, index) {
    this.enemies.splice(index, 1);
    this.kills += 1;
    const gained = this.addScore(enemy.score, enemy.x, enemy.y);
    this.particles.burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'bulwark' ? 26 : 14, 300);
    this.particles.shockwave(enemy.x, enemy.y, enemy.color, enemy.kind === 'bulwark' ? 110 : 55);
    this.particles.floatText(enemy.x, enemy.y - enemy.radius - 6, `+${gained}`, '#e2e8f0', 16);
    this.sound.enemyDie(enemy.kind === 'bulwark' || enemy.kind === 'splitter');
    // Drop 1-3 gems.
    const gems = enemy.kind === 'bulwark' ? 3 : enemy.kind === 'splitter' ? 2 : 1;
    for (let i = 0; i < gems; i++) {
      this.gems.push(makeGem(enemy.x + (this.rng() - 0.5) * 20, enemy.y + (this.rng() - 0.5) * 20, COMBO.gemScore));
    }
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const mite = makeEnemy('mite', enemy.x + (i === 0 ? -14 : 14), enemy.y, this.wave);
        this.enemies.push(mite);
      }
    }
  }

  hurtPlayer(enemy) {
    if (this.player.invuln > 0 || !this.player.alive) return;
    this.player.hp -= 1;
    this.player.invuln = 1.3;
    this.hurtFlash = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.sound.hurt();
    this.particles.burst(this.player.x, this.player.y, '#fb7185', 22, 320);
    if (this.player.hp <= 0) {
      this.player.alive = false;
      this.gameOver();
    }
  }

  gameOver() {
    this.best = Math.max(this.best, this.score);
    localStorage.setItem('novaswarm-best', String(this.best));
    this.sound.gameOver();
    this.sound.stopMusic();
    this.particles.burst(this.player.x, this.player.y, '#22d3ee', 60, 420, 0.9, 4);
    this.particles.shockwave(this.player.x, this.player.y, '#22d3ee', 180);
    this.setState('gameover');
  }

  update(input, dt) {
    this.time += dt;
    if (this.bannerAlpha > 0) this.bannerAlpha -= dt * 0.55;
    if (this.hurtFlash > 0) this.hurtFlash -= dt * 1.6;
    this.particles.update(dt);

    if (this.state !== 'playing') {
      // Keep the world gently alive behind menus.
      for (const e of this.enemies) stepEnemy(e, this.player, dt * 0.25, this.time);
      return;
    }

    // Combo decay.
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    stepPlayer(this.player, input, dt, VIEW.width, VIEW.height);
    if (playerCanFire(this.player, input)) {
      this.bullets.push(...fireBullets(this.player));
      this.sound.shoot();
    }
    stepBullets(this.bullets, dt);
    for (const e of this.enemies) stepEnemy(e, this.player, dt, this.time);
    stepGems(this.gems, this.player, dt);

    // Spawning.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnOne();
        const interval = Math.max(
          WAVES.spawnIntervalMin,
          WAVES.spawnInterval - (this.wave - 1) * 0.04,
        );
        this.spawnTimer = interval;
      }
    }

    // Bullets vs enemies.
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      let consumed = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (b.hitSet.has(e)) continue;
        const rr = e.radius + b.radius;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        e.hp -= b.damage;
        e.flash = 0.09;
        b.hitSet.add(e);
        this.particles.burst(b.x, b.y, '#a5f3fc', 3, 140, 0.3, 2);
        if (e.hp <= 0) {
          this.killEnemy(e, ei);
        }
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          this.bullets.splice(bi, 1);
          consumed = true;
        }
        break; // one enemy per bullet per frame
      }
      if (consumed) continue;
    }

    // Enemies vs player.
    if (this.player.alive) {
      for (const e of this.enemies) {
        const rr = e.radius + this.player.radius - 4;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        if (dx * dx + dy * dy < rr * rr) {
          this.hurtPlayer(e);
          break;
        }
      }
    }

    // Gems vs player.
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const rr = g.radius + this.player.radius + 6;
      const dx = g.x - this.player.x;
      const dy = g.y - this.player.y;
      if (dx * dx + dy * dy < rr * rr) {
        this.gems.splice(i, 1);
        this.collectGem(g);
      }
    }

    // Wave cleared: no enemies, none queued, player alive.
    if (this.enemies.length === 0 && this.spawnQueue.length === 0 && this.player.alive) {
      if (!this.waveClearBonusGiven) {
        this.waveClearBonusGiven = true;
        const bonus = 50 * this.wave;
        this.score += bonus;
        this.particles.floatText(this.player.x, this.player.y - 30, `WAVE BONUS +${bonus}`, '#facc15', 20);
        this.sound.waveClear();
      }
      this.breather -= dt;
      if (this.breather <= 0) {
        this.breather = WAVES.breatherSeconds;
        this.upgradeChoices = rollUpgrades(this.rng, this.takenUpgrades, 3);
        this.setState('upgrade');
      }
    } else {
      this.breather = WAVES.breatherSeconds;
    }
  }

  // ---- Screenshot staging (?shot=) ----
  // Deterministic setups so screenshots show the game at its best.
  stageShot(kind, seed) {
    const rng = mulberry32(seed || 1);
    this.reset();
    this.player = makePlayer(VIEW.width / 2, VIEW.height / 2);
    if (kind === 'start') {
      this.setState('title');
      // A few drifters drifting behind the title for life.
      for (let i = 0; i < 6; i++) {
        const e = makeEnemy(['mite', 'drifter', 'weaver'][i % 3], 120 + rng() * 1000, 90 + rng() * 540, 2);
        this.enemies.push(e);
      }
      return;
    }
    if (kind === 'play') {
      this.setState('playing');
      this.wave = 3;
      this.score = 1250;
      this.combo = 4;
      this.comboTimer = COMBO.windowSeconds * 0.7;
      this.player.angle = -0.5;
      // A busy mid-fight: enemies around, bullets in flight, gems and particles.
      const spots = [
        ['drifter', 880, 210], ['mite', 950, 330], ['weaver', 820, 470],
        ['splitter', 1010, 180], ['mite', 700, 150], ['drifter', 1060, 430],
        ['weaver', 620, 520], ['mite', 900, 560], ['bulwark', 1080, 300],
      ];
      for (const [k, x, y] of spots) this.enemies.push(makeEnemy(k, x, y, 3));
      for (let i = 0; i < 4; i++) {
        this.bullets.push({
          x: 700 + i * 55, y: 330 + i * 12,
          vx: 720, vy: -40 + i * 20,
          radius: 4, damage: 1, pierce: 0, life: 0.8, hitSet: new Set(),
        });
      }
      for (let i = 0; i < 5; i++) {
        this.gems.push(makeGem(760 + rng() * 320, 240 + rng() * 240, COMBO.gemScore));
      }
      this.particles.burst(880, 210, '#fb923c', 12, 260);
      this.particles.burst(1010, 180, '#c084fc', 10, 240);
      this.showBanner('');
      this.bannerAlpha = 0;
      return;
    }
    if (kind === 'upgrade') {
      this.wave = 4;
      this.score = 2310;
      this.upgradeChoices = rollUpgrades(rng, {}, 3);
      // A few drifters and gems behind the overlay, for life.
      for (let i = 0; i < 5; i++) {
        const e = makeEnemy(['mite', 'drifter', 'weaver'][i % 3], 140 + rng() * 1000, 110 + rng() * 500, 4);
        this.enemies.push(e);
      }
      for (let i = 0; i < 4; i++) {
        this.gems.push(makeGem(300 + rng() * 680, 180 + rng() * 360, COMBO.gemScore));
      }
      // Set the state last: the menu reads these fields when it opens.
      this.setState('upgrade');
      return;
    }
    if (kind === 'end') {
      this.wave = 6;
      this.score = 4860;
      this.kills = 132;
      this.best = 4860;
      this.player.hp = 0;
      this.player.alive = false;
      this.particles.burst(VIEW.width / 2, VIEW.height / 2, '#22d3ee', 40, 380, 0.9, 4);
      // Set the state last: the menu reads these fields when it opens.
      this.setState('gameover');
      return;
    }
    this.setState('title');
  }
}
