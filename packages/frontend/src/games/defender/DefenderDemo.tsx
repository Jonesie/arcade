import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import { createInitialState, update, WIDTH, HEIGHT, WORLD_WIDTH, wrapDelta, type GameEvent, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, setThrust, sfx, stopThrust } from './sound';

// Fly toward whichever enemy is nearest (by shortest wraparound distance),
// matching altitude, and fire once roughly on target. Never uses the
// smart bomb and doesn't actively protect humanoids — a simple bot,
// consistent with the other demos' "imperfect is fine" approach.
function computeInput(state: GameState): GameInput {
  const player = state.player;
  if (state.enemies.length === 0) {
    return { left: false, right: false, up: false, down: false, fire: false, smartBomb: false };
  }

  let target = state.enemies[0];
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    const dist = Math.abs(wrapDelta(player.x, enemy.x, WORLD_WIDTH));
    if (dist < bestDist) {
      bestDist = dist;
      target = enemy;
    }
  }

  const dx = wrapDelta(player.x, target.x, WORLD_WIDTH);
  const dy = target.y - player.y;
  const aimed = Math.abs(dx) < 30 && Math.abs(dy) < 20;

  return {
    left: dx < -4,
    right: dx > 4,
    up: dy < -4,
    down: dy > 4,
    fire: aimed,
    smartBomb: false,
  };
}

export function DefenderDemo() {
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
      onStart={() => ensureAudio()}
      onStop={() => stopThrust()}
      onFrame={(_state, input, events) => {
        setThrust(input.left || input.right || input.up || input.down);
        for (const event of events as GameEvent[]) {
          switch (event.type) {
            case 'shoot':
              sfx.shoot();
              break;
            case 'enemyKilled':
              sfx.enemyKilled();
              break;
            case 'humanoidGrabbed':
              sfx.humanoidGrabbed();
              break;
            case 'humanoidRescued':
              sfx.humanoidRescued();
              break;
            case 'humanoidLost':
              sfx.humanoidLost();
              break;
            case 'smartBomb':
              sfx.smartBomb();
              break;
            case 'playerHit':
              sfx.playerHit();
              break;
            case 'waveClear':
              sfx.waveClear();
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
