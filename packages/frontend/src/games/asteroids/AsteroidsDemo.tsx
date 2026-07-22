import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import { createInitialState, update, WIDTH, HEIGHT, type GameEvent, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, sfx } from './sound';

// Rotate to face the nearest asteroid, thrust and fire once roughly
// aimed. No collision-avoidance — getting clipped and restarting is fine
// for a short attract-mode clip.
function computeInput(state: GameState): GameInput {
  const ship = state.ship;
  if (state.asteroids.length === 0) return { left: false, right: false, thrust: false, fire: false };

  let target = state.asteroids[0];
  let bestDist = Infinity;
  for (const asteroid of state.asteroids) {
    const dist = Math.hypot(asteroid.x - ship.x, asteroid.y - ship.y);
    if (dist < bestDist) {
      bestDist = dist;
      target = asteroid;
    }
  }

  const dx = target.x - ship.x;
  const dy = target.y - ship.y;
  const desiredAngle = Math.atan2(dx, -dy);
  let diff = desiredAngle - ship.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const aimed = Math.abs(diff) < 0.25;
  return { left: diff < -0.08, right: diff > 0.08, thrust: aimed, fire: aimed };
}

export function AsteroidsDemo() {
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
      onFrame={(_state, _input, events) => {
        for (const event of events as GameEvent[]) {
          switch (event.type) {
            case 'shoot':
              sfx.shoot();
              break;
            case 'explosion':
              sfx.explosion();
              break;
            case 'shipDestroyed':
              sfx.shipDestroyed();
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
