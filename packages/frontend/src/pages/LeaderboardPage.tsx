import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { games } from '../games/registry';
import styles from './LeaderboardPage.module.scss';

interface GlobalRow {
  username: string;
  displayName: string;
  totalPoints: number;
  totalPlays: number;
}

interface GameRow {
  username: string;
  displayName: string;
  bestScore: number;
  plays: number;
}

type Tab = 'global' | (string & {});

export function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');

  const globalQuery = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: () => api.get<{ leaderboard: GlobalRow[] }>('/leaderboard/global'),
    enabled: tab === 'global',
  });

  const gameQuery = useQuery({
    queryKey: ['leaderboard', 'game', tab],
    queryFn: () => api.get<{ leaderboard: GameRow[] }>(`/leaderboard/games/${tab}`),
    enabled: tab !== 'global',
  });

  return (
    <div>
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
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Total points</th>
              <th>Total plays</th>
            </tr>
          </thead>
          <tbody>
            {globalQuery.data?.leaderboard.map((row, i) => (
              <tr key={row.username}>
                <td className={styles.rank}>{i + 1}</td>
                <td>{row.displayName}</td>
                <td>{row.totalPoints}</td>
                <td>{row.totalPlays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Best score</th>
              <th>Plays</th>
            </tr>
          </thead>
          <tbody>
            {gameQuery.data?.leaderboard.map((row, i) => (
              <tr key={row.username}>
                <td className={styles.rank}>{i + 1}</td>
                <td>{row.displayName}</td>
                <td>{row.bestScore}</td>
                <td>{row.plays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(tab === 'global' ? globalQuery.data?.leaderboard.length === 0 : gameQuery.data?.leaderboard.length === 0) && (
        <p className={styles.empty}>No scores yet — be the first!</p>
      )}
    </div>
  );
}
