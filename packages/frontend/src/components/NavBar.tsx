import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './NavBar.module.scss';

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className={styles.links}>
      <Link to="/leaderboard">Leaderboard</Link>
      {user ? (
        <>
          <span className={styles.user}>{user.displayName}</span>
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
