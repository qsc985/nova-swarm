// NOVA SWARM — bootstrap, game loop and DOM menus.
// The canvas draws the world and the HUD; the menus (title, upgrade,
// game over, pause) are DOM overlays so their buttons stay crisp and
// clickable. ?shot=start|play|upgrade|end stages a fixed scene (with
// ?seed=) so screenshots are reproducible.

import { VIEW } from './config.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';
import { Game } from './game.js';
import { UPGRADES } from './upgrades.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = new Input(canvas);
const renderer = new Renderer(canvas);
const sound = new SoundEngine();

const screens = {
  title: document.getElementById('title-screen'),
  upgrade: document.getElementById('upgrade-screen'),
  gameover: document.getElementById('gameover-screen'),
  pause: document.getElementById('pause-screen'),
};
const upgradeCards = document.getElementById('upgrade-cards');
const finalScore = document.getElementById('final-score');
const finalStats = document.getElementById('final-stats');
const bestScoreEls = document.querySelectorAll('[data-best]');
const muteButton = document.getElementById('mute-button');

function hideScreens() {
  for (const el of Object.values(screens)) el.classList.add('hidden');
}

function showScreen(name) {
  hideScreens();
  if (screens[name]) screens[name].classList.remove('hidden');
}

const game = new Game({
  rng: Math.random,
  sound,
  // Note: this runs during `new Game` too (the constructor resets to the
  // title), so it must use the instance passed in, not the `game` const
  // being initialised.
  onStateChange: (state, g) => {
    if (state === 'title') {
      showScreen('title');
    } else if (state === 'upgrade') {
      renderUpgradeCards(g);
      showScreen('upgrade');
    } else if (state === 'gameover') {
      finalScore.textContent = g.score.toLocaleString('en-US');
      finalStats.textContent = `Wave ${g.wave} · ${g.kills} kills · Best ${g.best.toLocaleString('en-US')}`;
      showScreen('gameover');
    } else if (state === 'paused') {
      showScreen('pause');
    } else {
      hideScreens();
    }
    for (const el of bestScoreEls) el.textContent = g.best.toLocaleString('en-US');
  },
});

function renderUpgradeCards(g) {
  upgradeCards.innerHTML = '';
  g.upgradeChoices.forEach((choice, index) => {
    const level = g.takenUpgrades[choice.id] || 0;
    const card = document.createElement('button');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <span class="upgrade-key">${index + 1}</span>
      <span class="upgrade-icon">${choice.icon}</span>
      <span class="upgrade-name">${choice.name}${level > 0 ? ` <span class="upgrade-level">Lv ${level + 1}</span>` : ''}</span>
      <span class="upgrade-desc">${choice.desc}</span>
    `;
    card.addEventListener('click', () => {
      sound.uiClick();
      game.chooseUpgrade(choice.id);
    });
    upgradeCards.appendChild(card);
  });
}

function refreshMuteButton() {
  muteButton.textContent = sound.muted ? '🔇' : '🔊';
  muteButton.setAttribute('aria-label', sound.muted ? 'Unmute (M)' : 'Mute (M)');
}

muteButton.addEventListener('click', () => {
  sound.ensure();
  sound.toggleMute();
  refreshMuteButton();
});

document.getElementById('start-button').addEventListener('click', () => {
  sound.ensure();
  sound.uiClick();
  game.startGame();
});
document.getElementById('restart-button').addEventListener('click', () => {
  sound.ensure();
  sound.uiClick();
  game.startGame();
});
document.getElementById('resume-button').addEventListener('click', () => {
  sound.uiClick();
  game.setState('playing');
});

function togglePause() {
  if (game.state === 'playing') {
    game.setState('paused');
    sound.stopMusic();
  } else if (game.state === 'paused') {
    game.setState('playing');
    sound.startMusic();
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === 'm') {
    sound.ensure();
    sound.toggleMute();
    refreshMuteButton();
  }
  if (key === 'Enter' && (game.state === 'title' || game.state === 'gameover')) {
    sound.ensure();
    game.startGame();
  }
  if (key === 'r' && game.state === 'gameover') {
    sound.ensure();
    game.startGame();
  }
  if ((key === 'p' || key === 'Escape') && (game.state === 'playing' || game.state === 'paused')) {
    togglePause();
  }
  if (game.state === 'upgrade' && ['1', '2', '3'].includes(key)) {
    const choice = game.upgradeChoices[Number(key) - 1];
    if (choice) {
      sound.uiClick();
      game.chooseUpgrade(choice.id);
    }
  }
});

// First gesture unlocks audio (browsers block it before then).
window.addEventListener('pointerdown', () => sound.ensure(), { once: true });

refreshMuteButton();

// Exposed for automated play-testing (and the curious): the live game.
window.__novaSwarm = game;

// ---- Screenshot staging (?shot=) ----
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1);

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
  last = now;

  if (shot) {
    // Frozen, staged scene: settle particles a touch, then render only.
    game.update(input, 0);
  } else {
    game.update(input, dt);
  }

  renderer.drawBackground(game.time);
  renderer.beginWorld(dt);
  for (const e of game.enemies) renderer.drawEnemy(e);
  for (const g of game.gems) renderer.drawGem(g, game.time);
  for (const b of game.bullets) renderer.drawBullet(b);
  if (game.player.alive) renderer.drawShip(game.player, game.time);
  game.particles.draw(renderer.ctx);
  renderer.endWorld();
  renderer.drawHud({
    score: game.score,
    best: game.best,
    wave: Math.max(1, game.wave),
    hp: Math.max(0, game.player.hp),
    maxHp: game.player.maxHp,
    combo: game.combo,
    comboFrac: game.comboFrac,
    enemiesLeft: game.enemiesLeft,
    phase: game.state,
    phaseLabel: game.phaseLabel,
    banner: game.banner,
    bannerAlpha: game.bannerAlpha,
    hurtFlash: game.hurtFlash,
  });

  // Screen shake decays even when the world is frozen.
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shot) {
  game.stageShot(shot, seed);
  // Aim the ship at the action so the staged angle survives the loop.
  input.mouseX = 950;
  input.mouseY = 280;
  // Let the staged bursts spread a little so they read as explosions.
  for (let i = 0; i < 7; i++) game.particles.update(0.05);
  document.body.classList.add('shot-mode');
} else {
  game.setState('title');
}

requestAnimationFrame(frame);
