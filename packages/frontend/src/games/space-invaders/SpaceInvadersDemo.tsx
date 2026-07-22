import { useRef } from 'react';
import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import { alienRect, createInitialState, PLAYER_W, update, WIDTH, HEIGHT, type GameEvent, type GameInput, type GameState } from './engine';
import { render } from './render';
import { ensureAudio, sfx } from './sound';

// Simple attract-mode bot: track under whichever alien is closest to the
// ship's current column and fire continuously. Doesn't dodge alien fire —
// an imperfect demo that occasionally dies and restarts reads as more
// authentic attract-mode footage than a bot playing flawlessly forever.
function computeInput(state: GameState): GameInput {
  const alive = state.aliens.filter((a) => a.alive);
  if (alive.length === 0) return { left: false, right: false, fire: true };

  let target = alive[0];
  let bestDist = Infinity;
  for (const alien of alive) {
    const rect = alienRect(state, alien);
    const dist = Math.abs(rect.x + rect.w / 2 - (state.player.x + PLAYER_W / 2));
    if (dist < bestDist) {
      bestDist = dist;
      target = alien;
    }
  }
  const rect = alienRect(state, target);
  const targetX = rect.x + rect.w / 2 - PLAYER_W / 2;
  return { left: state.player.x > targetX + 2, right: state.player.x < targetX - 2, fire: true };
}

export function SpaceInvadersDemo() {
  const marchBeatRef = useRef(0);

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
        marchBeatRef.current = 0;
        ensureAudio();
      }}
      onFrame={(_state, _input, events) => {
        for (const event of events as GameEvent[]) {
          switch (event.type) {
            case 'shoot':
              sfx.shoot();
              break;
            case 'invaderKilled':
              sfx.invaderHit();
              break;
            case 'ufoHit':
              sfx.ufoHit();
              break;
            case 'playerHit':
              sfx.playerHit();
              break;
            case 'waveClear':
              sfx.waveClear();
              break;
            case 'march':
              marchBeatRef.current += 1;
              sfx.march(marchBeatRef.current);
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
