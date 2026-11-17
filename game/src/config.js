// NOVA SWARM — tuning and constants.
// One place for every number that shapes how the game feels, so balance
// changes are a single edit here instead of a hunt through the logic.

export const VIEW = {
  width: 1280,
  height: 720,
};

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 340,
  drag: 0.88, // velocity kept per 1/60s step (lower = snappier stop)
  fireRate: 6.5, // shots per second
  bulletSpeed: 720,
  bulletDamage: 1,
  bulletRadius: 4,
  maxHp: 3,
  invulnSeconds: 1.3,
  magnetRadius: 90,
  color: '#22d3ee',
};

export const BULLET = {
  radius: 4,
  life: 0.9, // seconds before a bullet fades
};

export const ENEMIES = {
  mite: { radius: 11, hp: 1, speed: 150, score: 10, color: '#f472b6', shape: 'tri' },
  drifter: { radius: 15, hp: 2, speed: 105, score: 20, color: '#fb923c', shape: 'square' },
  weaver: { radius: 14, hp: 2, speed: 120, score: 25, color: '#facc15', shape: 'diamond' },
  splitter: { radius: 20, hp: 4, speed: 70, score: 40, color: '#c084fc', shape: 'hex' },
  bulwark: { radius: 28, hp: 9, speed: 48, score: 100, color: '#f87171', shape: 'penta' },
};

// Wave composition: each wave spends a budget; a kind costs its weight.
// Later waves unlock the tougher kinds.
export const WAVES = {
  budgetBase: 6,
  budgetPerWave: 4,
  weights: { mite: 1, drifter: 2, weaver: 2, splitter: 4, bulwark: 6 },
  unlockWave: { mite: 1, drifter: 1, weaver: 2, splitter: 3, bulwark: 5 },
  spawnInterval: 0.55, // seconds between spawns at the start of a wave
  spawnIntervalMin: 0.22,
  breatherSeconds: 2.5, // pause after a wave is cleared, before the upgrade screen
};

export const COMBO = {
  windowSeconds: 3.0,
  maxMultiplier: 8,
  gemScore: 10,
};

export const GEMS = {
  radius: 6,
  lifeSeconds: 9,
  attractRadius: 110,
  attractSpeed: 420,
};

export const PARTICLES = {
  max: 420,
};

export const COLORS = {
  background: '#070a18',
  grid: 'rgba(56, 189, 248, 0.07)',
  star: 'rgba(226, 232, 240, 0.55)',
  hudText: '#e2e8f0',
  hudDim: '#94a3b8',
  accent: '#22d3ee',
  danger: '#fb7185',
  gold: '#facc15',
};
