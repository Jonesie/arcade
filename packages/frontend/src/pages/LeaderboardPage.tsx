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

// Cycles through a fixed palette per rank, like a classic arcade
// high-score table where every row gets its own color rather than a
// uniform theme — see the reference screenshot this page is styled after.
const RANK_COLORS = ['#f2f0fb', '#ff4d4d', '#4dd8ff', '#b06bff', '#4ade80', '#ffe14d', '#5cf27a', '#5fa8ff', '#ffb454', '#f2f0fb'];

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}ST`;
  if (j === 2 && k !== 12) return `${n}ND`;
  if (j === 3 && k !== 13) return `${n}RD`;
  return `${n}TH`;
}

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

  const isEmpty = tab === 'global' ? globalQuery.data?.leaderboard.length === 0 : gameQuery.data?.leaderboard.length === 0;

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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Points</th>
              <th>Plays</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {globalQuery.data?.leaderboard.map((row, i) => (
              <tr key={row.username} style={{ color: RANK_COLORS[i % RANK_COLORS.length] }}>
                <td>{ordinal(i + 1)}</td>
                <td>{row.totalPoints}</td>
                <td>{row.totalPlays}</td>
                <td>{row.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
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
              <tr key={row.username} style={{ color: RANK_COLORS[i % RANK_COLORS.length] }}>
                <td>{ordinal(i + 1)}</td>
                <td>{row.bestScore}</td>
                <td>{row.plays}</td>
                <td>{row.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isEmpty && <p className={styles.empty}>No scores yet — be the first!</p>}
    </div>
  );
}
