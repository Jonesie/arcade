import styles from '../attract/DemoCanvas.module.scss';
import { EngineDemo } from '../attract/EngineDemo';
import {
  createInitialState,
  HEIGHT,
  LADDERS,
  TOP_GIRDER_INDEX,
  update,
  WIDTH,
  type GameEvent,
  type GameInput,
  type GameState,
} from './engine';
import { render } from './render';
import { ensureAudio, sfx, startMusic, stopMusic } from './sound';

// Always heads for the nearest ladder leading up toward the girl, hopping
// over anything rolling close by. No lookahead beyond "is a barrel about
// to be under me" — an imperfect bot getting clipped and restarting is
// normal attract-mode behavior, not a bug to fix.
function computeInput(state: GameState): GameInput {
  const input: GameInput = { left: false, right: false, up: false, down: false, jump: false };
  const player = state.player;

  const danger = state.barrels.some(
    (b) => !b.falling && b.girderIndex === player.girderIndex && Math.abs(b.x - player.x) < 24 && Math.abs(b.x - player.x) > 3,
  );
  if (danger && !player.jumping && player.onLadderGapIndex === null) {
    input.jump = true;
  }

  if (player.onLadderGapIndex !== null) {
    input.up = true;
    return input;
  }
  if (player.girderIndex >= TOP_GIRDER_INDEX) {
    return input;
  }

  const laddersUp = LADDERS.filter((l) => l.gapIndex === player.girderIndex);
  let target = laddersUp[0];
  let bestDist = Infinity;
  for (const ladder of laddersUp) {
    const dist = Math.abs(ladder.x - player.x);
    if (dist < bestDist) {
      bestDist = dist;
      target = ladder;
    }
  }
  if (target) {
    if (Math.abs(target.x - player.x) < 4) input.up = true;
    else if (target.x > player.x) input.right = true;
    else input.left = true;
  }
  return input;
}

export function DonkeyKongDemo() {
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
            case 'jump':
              sfx.jump();
              break;
            case 'jumpOver':
              sfx.jumpOver();
              break;
            case 'hammerPickup':
              sfx.hammerPickup();
              break;
            case 'barrelSmash':
              sfx.barrelSmash();
              break;
            case 'playerHit':
              sfx.playerHit();
              break;
            case 'stageClear':
              sfx.stageClear();
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
