import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import styles from './GlobalLeaderboardTable.module.scss';

interface GlobalRow {
  username: string;
  displayName: string;
  totalPoints: number;
  totalPlays: number;
}

// Cycles through a fixed palette per rank, like a classic arcade
// high-score table where every row gets its own color rather than a
// uniform theme.
export const RANK_COLORS = [
  '#f2f0fb',
  '#ff4d4d',
  '#4dd8ff',
  '#b06bff',
  '#4ade80',
  '#ffe14d',
  '#5cf27a',
  '#5fa8ff',
  '#ffb454',
  '#f2f0fb',
];

export function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}ST`;
  if (j === 2 && k !== 12) return `${n}ND`;
  if (j === 3 && k !== 13) return `${n}RD`;
  return `${n}TH`;
}

/**
 * The global cross-game leaderboard table, standalone so both the
 * leaderboard page and the home page's attract mode (see AttractMode.tsx —
 * GitHub issue #5 calls for a "global scores only, no buttons" view while
 * cycling) can show it without duplicating the markup.
 */
export function GlobalLeaderboardTable() {
  const query = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: () => api.get<{ leaderboard: GlobalRow[] }>('/leaderboard/global'),
  });
  const rows = query.data?.leaderboard ?? [];

  return (
    <>
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
          {rows.map((row, i) => (
            <tr key={row.username} style={{ color: RANK_COLORS[i % RANK_COLORS.length] }}>
              <td>{ordinal(i + 1)}</td>
              <td>{row.totalPoints}</td>
              <td>{row.totalPlays}</td>
              <td>{row.displayName}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {query.isSuccess && rows.length === 0 && <p className={styles.empty}>No scores yet — be the first!</p>}
    </>
  );
}
