# NOVA SWARM

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/qsc985/nova-swarm/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/qsc985/nova-swarm/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arena survival shooter. Pilot the last ship in the void, blast the geometric swarm, chain kills into combos, grab gems, and pick an upgrade after every wave. How long can you last?

## Run it

```sh
node serve.mjs
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: the game is static files under `game/`.

## Controls

- **WASD / Arrow keys** — move
- **Mouse** — aim
- **Hold Click / Space** — fire
- **P** — pause, **M** — mute, **R** — restart (on game over)
- **1 / 2 / 3** — pick an upgrade between waves

## How it plays

- Survive waves of geometric enemies: fast Mites that dash, Drifting squares, sine-weaving Diamonds, Splitters that break into Mites, and armoured Bulwarks.
- Kills drop gems. Collect them fast to build a combo multiplier (up to ×8) before it decays.
- Clear a wave to choose 1 of 3 upgrades: faster fire, heavier rounds, twin shot, thrusters, hull plating, magnet coil, piercing rounds.
- Three hull hearts. Getting hit breaks the combo and grants brief invulnerability. Lose them all and the run ends — your best score is saved locally.

## Layout

- `game/index.html` — the page, canvas and DOM menus
- `game/src/` — the game, one job per file: `config` (tuning), `utils`, `audio` (synthesized WebAudio), `input`, `particles`, `entities`, `upgrades`, `render`, `game` (states, waves, collisions), `main` (loop and menus)
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to the output and writes `dossier.json`
- `screenshots/` — 3 screenshots of the game (title, play, game over)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
