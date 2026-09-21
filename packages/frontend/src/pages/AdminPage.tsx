import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '../api/client';
import styles from './AdminPage.module.scss';

interface AdminUserRow {
  id: number;
  username: string | null;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  subscribed: boolean;
  blocked: boolean;
  createdAt: string;
  totalPoints: number | null;
}

/**
 * Admin-only (GitHub issue #12) — the route itself checks `user.isAdmin`
 * before rendering this, and every request here is re-checked server-side
 * by requireAdmin regardless, so this component doesn't need its own
 * access-denied handling beyond what the fetch's 403 naturally produces.
 */
export function AdminPage() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: AdminUserRow[] }>('/admin/users'),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }: { id: number; blocked: boolean }) =>
      api.post(`/admin/users/${id}/${blocked ? 'block' : 'unblock'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  // Only offered on blocked rows (the backend enforces the same), and
  // takes their scores with them — see the DELETE handler in
  // backend routes/admin.ts for why block and delete are kept distinct.
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  function confirmDelete(row: AdminUserRow) {
    const who = row.email ?? row.username ?? row.displayName;
    const points = row.totalPoints ?? 0;
    const scoresNote = points > 0 ? ` and their ${points} points of scores` : '';
    if (window.confirm(`Permanently delete ${who}${scoresNote}? This frees their email to register again.`)) {
      deleteMutation.mutate(row.id);
    }
  }

  const mutationError = blockMutation.error ?? deleteMutation.error;

  const [hideBlocked, setHideBlocked] = useState(false);
  const allUsers = usersQuery.data?.users ?? [];
  const blockedCount = allUsers.filter((u) => u.blocked).length;
  const visibleUsers = hideBlocked ? allUsers.filter((u) => !u.blocked) : allUsers;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>
        <label className={styles.toggle}>
          <input type="checkbox" checked={hideBlocked} onChange={(e) => setHideBlocked(e.target.checked)} />
          Hide blocked ({blockedCount})
        </label>
      </div>
      {usersQuery.isError && <p className={styles.error}>Could not load users.</p>}
      {mutationError && (
        <p className={styles.error}>
          {mutationError instanceof ApiError ? mutationError.message : 'Could not update that user.'}
        </p>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Display name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Subscribed</th>
            <th>Points</th>
            <th>Joined</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map((row) => (
            <tr key={row.id} className={row.blocked ? styles.blockedRow : undefined}>
              <td>{row.displayName}</td>
              <td>{row.username ?? '—'}</td>
              <td>
                {row.email ?? '—'}
                {row.email && (row.emailVerified ? ' ✅' : ' ⚠️')}
              </td>
              <td>{row.subscribed ? 'Yes' : 'No'}</td>
              <td>{row.totalPoints ?? 0}</td>
              <td>{new Date(row.createdAt).toLocaleDateString()}</td>
              <td>{row.blocked ? 'Blocked' : 'Active'}</td>
              <td className={styles.actions}>
                <button
                  type="button"
                  disabled={blockMutation.isPending || deleteMutation.isPending}
                  onClick={() => blockMutation.mutate({ id: row.id, blocked: !row.blocked })}
                >
                  {row.blocked ? 'Unblock' : 'Block'}
                </button>
                {row.blocked && (
                  <button
                    type="button"
                    className={styles.danger}
                    disabled={blockMutation.isPending || deleteMutation.isPending}
                    onClick={() => confirmDelete(row)}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {usersQuery.data && visibleUsers.length === 0 && (
        <p className={styles.error}>{allUsers.length === 0 ? 'No users yet.' : 'All users are blocked.'}</p>
      )}
    </div>
  );
}
