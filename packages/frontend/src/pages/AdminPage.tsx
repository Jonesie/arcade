import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  return (
    <div>
      <h1 className={styles.title}>Users</h1>
      {usersQuery.isError && <p className={styles.error}>Could not load users.</p>}
      {blockMutation.isError && (
        <p className={styles.error}>
          {blockMutation.error instanceof ApiError ? blockMutation.error.message : 'Could not update that user.'}
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
          {usersQuery.data?.users.map((row) => (
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
              <td>
                <button
                  type="button"
                  disabled={blockMutation.isPending}
                  onClick={() => blockMutation.mutate({ id: row.id, blocked: !row.blocked })}
                >
                  {row.blocked ? 'Unblock' : 'Block'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {usersQuery.data?.users.length === 0 && <p className={styles.error}>No users yet.</p>}
    </div>
  );
}
