import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { GlobalLeaderboardTable, ordinal, RANK_COLORS } from '../components/GlobalLeaderboardTable';
import { games } from '../games/registry';
import styles from './LeaderboardPage.module.scss';

interface GameRow {
  userId: number;
  username: string | null;
  displayName: string;
  bestScore: number;
  plays: number;
}

type Tab = 'global' | (string & {});

export function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');

  const gameQuery = useQuery({
    queryKey: ['leaderboard', 'game', tab],
    queryFn: () => api.get<{ leaderboard: GameRow[] }>(`/leaderboard/games/${tab}`),
    enabled: tab !== 'global',
  });

  return (
    <div>
      <h1 className={styles.title}>High Scores</h1>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'global' ? styles.active : ''}`} onClick={() => setTab('global')}>
          Global
        </button>
        {games.map((game) => (
          <button
            key={game.slug}
            className={`${styles.tab} ${tab === game.slug ? styles.active : ''}`}
            onClick={() => setTab(game.slug)}
          >
            {game.name}
          </button>
        ))}
      </div>

      {tab === 'global' ? (
        <GlobalLeaderboardTable />
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Score</th>
                <th>Plays</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {gameQuery.data?.leaderboard.map((row, i) => (
                <tr key={row.userId} style={{ color: RANK_COLORS[i % RANK_COLORS.length] }}>
                  <td>{ordinal(i + 1)}</td>
                  <td>{row.bestScore}</td>
                  <td>{row.plays}</td>
                  <td>{row.displayName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {gameQuery.data?.leaderboard.length === 0 && <p className={styles.empty}>No scores yet — be the first!</p>}
        </>
      )}
    </div>
  );
}
