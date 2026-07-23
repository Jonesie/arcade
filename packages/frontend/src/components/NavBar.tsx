import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './NavBar.module.scss';

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className={styles.links}>
      <Link to="/">Games</Link>
      <Link to="/leaderboard">Leaderboard</Link>
      {user ? (
        <>
          {user.isAdmin && <Link to="/admin">Admin</Link>}
          <Link to="/profile" className={styles.user}>
            {user.displayName}
            {user.email && !user.emailVerified && <span className={styles.unverified}> ⚠️</span>}
          </Link>
          <button onClick={() => void logout()}>Log out</button>
        </>
      ) : (
        <>
          <Link to="/login">Log in</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
