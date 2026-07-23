import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import { createInitialState, HEIGHT, update, WIDTH, type GameEvent, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';

// Dodges the nearest incoming bolt, otherwise steers toward and fires at
// the nearest turret; centers up and fires once the exhaust port is in
// range. No real lookahead beyond "what's closest right now" — an
// imperfect bot getting clipped and restarting is normal attract-mode
// behavior, not a bug to fix.
function computeInput(state: GameState): GameInput {
  const input: GameInput = { left: false, right: false, up: false, down: false, fire: false };
  const player = state.player;

  if (state.portActive) {
    if (player.x > 5) input.left = true;
    else if (player.x < -5) input.right = true;
    if (player.y > 5) input.up = true;
    else if (player.y < -5) input.down = true;
    input.fire = true;
    return input;
  }

  let nearestBolt = null;
  let nearestBoltZ = Infinity;
  for (const bolt of state.bolts) {
    if (bolt.z < nearestBoltZ) {
      nearestBoltZ = bolt.z;
      nearestBolt = bolt;
    }
  }
  if (nearestBolt && nearestBoltZ < 500) {
    if (nearestBolt.x > player.x) input.left = true;
    else input.right = true;
    if (nearestBolt.y > player.y) input.up = true;
    else input.down = true;
    return input;
  }

  let target = null;
  let nearestTurretZ = Infinity;
  for (const turret of state.turrets) {
    if (turret.z < nearestTurretZ) {
      nearestTurretZ = turret.z;
      target = turret;
    }
  }
  if (target) {
    if (target.x > player.x + 5) input.right = true;
    else if (target.x < player.x - 5) input.left = true;
    if (target.y > player.y + 5) input.down = true;
    else if (target.y < player.y - 5) input.up = true;
    if (Math.abs(target.x - player.x) < 20 && Math.abs(target.y - player.y) < 20) input.fire = true;
  }

  return input;
}

export function StarWarsDemo() {
  return (
    <EngineDemo
      width={WIDTH}
      height={HEIGHT}
      createInitialState={createInitialState}
      update={update}
      render={render}
      computeInput={computeInput}
      isGameOver={(state) => state.gameOver}
      className={styles.canvas}
      onStart={() => {
        ensureAudio();
        startMusic();
      }}
      onStop={() => stopMusic()}
      onFrame={(_state, _input, events) => {
        for (const event of events as GameEvent[]) {
          switch (event.type) {
            case 'fire':
              sfx.fire();
              break;
            case 'turretDestroyed':
              sfx.turretDestroyed();
              break;
            case 'enemyBoltFired':
              sfx.enemyBoltFired();
              break;
            case 'playerHit':
              sfx.playerHit();
              break;
            case 'portHit':
              sfx.portHit();
              break;
            case 'gameOver':
              sfx.gameOver();
              break;
          }
        }
      }}
    />
  );
}
