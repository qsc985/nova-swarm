// Between-wave upgrades: the choices that make each run different.
// The game offers 3 at random; the player takes one (click or keys 1-3).
// Every upgrade can be taken more than once; the card shows its level.

export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    icon: '»',
    desc: '+25% fire rate. Hold the trigger and watch the swarm melt.',
    apply: (p) => { p.fireRate *= 1.25; },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    icon: '◆',
    desc: '+1 bullet damage. Fewer shots to drop the big ones.',
    apply: (p) => { p.damage += 1; },
  },
  {
    id: 'twin',
    name: 'Twin Shot',
    icon: '✦',
    desc: '+1 projectile per shot, fanned out. More coverage, more kills.',
    apply: (p) => { p.projectiles = Math.min(5, p.projectiles + 1); },
  },
  {
    id: 'swift',
    name: 'Swift Thrusters',
    icon: '➤',
    desc: '+15% move speed. Outrun the swarm, reposition faster.',
    apply: (p) => { p.speed *= 1.15; },
  },
  {
    id: 'plating',
    name: 'Nano Plating',
    icon: '⬢',
    desc: '+1 max hull and repair 1 hull right now.',
    apply: (p) => {
      p.maxHp += 1;
      p.hp = Math.min(p.maxHp, p.hp + 1);
    },
  },
  {
    id: 'magnet',
    name: 'Magnet Coil',
    icon: '◎',
    desc: '+60% gem pickup radius. Hoard the combo, cash in faster.',
    apply: (p) => { p.magnet *= 1.6; },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    icon: '⟿',
    desc: 'Bullets punch through +1 enemy. Lines of mites, one shot.',
    apply: (p) => { p.pierce += 1; },
  },
];

export function rollUpgrades(rng, taken, count = 3) {
  // Prefer upgrades taken least, so a run stays varied.
  const pool = [...UPGRADES].sort((a, b) => (taken[a.id] || 0) - (taken[b.id] || 0));
  const chosen = [];
  const bag = [...pool];
  while (chosen.length < count && bag.length > 0) {
    const index = Math.floor(rng() * Math.min(4, bag.length));
    chosen.push(bag.splice(index, 1)[0]);
  }
  return chosen;
}
