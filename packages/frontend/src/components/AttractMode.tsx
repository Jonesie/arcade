import { useEffect, useState } from 'react';
import { games } from '../games/registry';
import styles from './AttractMode.module.scss';
import { GlobalLeaderboardTable } from './GlobalLeaderboardTable';

const LEADERBOARD_SLIDE_MS = 9000;
const GAME_SLIDE_MS = 9000;

type Slide = { kind: 'leaderboard' } | { kind: 'game'; index: number };

// Built once — the registry doesn't change at runtime.
const SLIDES: Slide[] = [{ kind: 'leaderboard' }, ...games.map((_, index) => ({ kind: 'game' as const, index }))];

/**
 * The home page's idle-timeout attract-mode content (GitHub issue #5):
 * cycles through the global leaderboard and a short self-play demo clip
 * per registered game. Rendered only while idle — HomePage owns the
 * idle/active decision (see hooks/useAttractMode) and swaps this in for
 * the normal interactive grid, so this component can assume it's always
 * "on" for as long as it's mounted.
 */
export function AttractMode() {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const slide = SLIDES[slideIndex];
    const duration = slide.kind === 'leaderboard' ? LEADERBOARD_SLIDE_MS : GAME_SLIDE_MS;
    const timer = setTimeout(() => setSlideIndex((i) => (i + 1) % SLIDES.length), duration);
    return () => clearTimeout(timer);
  }, [slideIndex]);

  const slide = SLIDES[slideIndex];
  const game = slide.kind === 'game' ? games[slide.index] : null;
  const Demo = game?.demo;

  return (
    <div className={styles.attract}>
      <p className={styles.badge}>Attract mode — press any key to play</p>

      {slide.kind === 'leaderboard' && (
        <div className={styles.leaderboardWrap}>
          <h2 className={styles.leaderboardTitle}>High Scores</h2>
          <GlobalLeaderboardTable />
        </div>
      )}

      {game && Demo && (
        <div className={styles.demoWrap}>
          <p className={styles.gameName}>{game.name}</p>
          <div className={styles.demoStage}>
            <Demo />
          </div>
        </div>
      )}
    </div>
  );
}
