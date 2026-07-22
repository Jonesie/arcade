import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import { createInitialState, PLAYER_W, update, WIDTH, HEIGHT, type GameEvent, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';

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
      onStart={() => {
        ensureAudio();
        startMusic();
      }}
      onStop={() => stopMusic()}
      onFrame={(_state, _input, events) => {
        for (const event of events as GameEvent[]) {
          switch (event.type) {
            case 'shoot':
              sfx.shoot();
              break;
            case 'enemyHit':
              sfx.enemyHit();
              break;
            case 'enemyKilled':
              sfx.enemyKilled();
              break;
            case 'enemyFire':
              sfx.enemyFire();
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
