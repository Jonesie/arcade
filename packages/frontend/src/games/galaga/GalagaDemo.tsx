import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import { createInitialState, PLAYER_W, update, WIDTH, HEIGHT, type GameInput, type GameState } from './engine';
import { render } from './render';

// Track under whichever enemy (formation or diving) is closest and fire
// continuously — doesn't dodge dive attacks, same "imperfect bot, restarts
// on death" reasoning as the other demos.
function computeInput(state: GameState): GameInput {
  if (state.enemies.length === 0) return { left: false, right: false, fire: true };

  let target = state.enemies[0];
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    const dist = Math.abs(enemy.x - state.player.x);
    if (dist < bestDist) {
      bestDist = dist;
      target = enemy;
    }
  }
  const targetX = target.x - PLAYER_W / 2;
  return { left: state.player.x > targetX + 2, right: state.player.x < targetX - 2, fire: true };
}

export function GalagaDemo() {
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
    />
  );
}
