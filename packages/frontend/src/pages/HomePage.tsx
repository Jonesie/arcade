import { Link } from 'react-router-dom';
import { AttractMode } from '../components/AttractMode';
import { games, upcomingGames } from '../games/registry';
import { useAttractMode } from '../hooks/useAttractMode';
import styles from './HomePage.module.scss';

export function HomePage() {
  const idle = useAttractMode();

  if (idle) {
    return <AttractMode />;
  }

  return (
    <div>
      <p className={styles.intro}>Pick a game. High scores count toward the site-wide leaderboard.</p>
      <div className={styles.grid}>
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Link key={game.slug} to={`/games/${game.slug}`} className={styles.card}>
              <Icon />
              <h2 className={styles.cardTitle}>{game.name}</h2>
              <p className={styles.cardDescription}>{game.description}</p>
            </Link>
          );
        })}
      </div>

      {upcomingGames.length > 0 && (
        <>
          <h2 className={styles.sectionHeading}>Coming soon</h2>
          <div className={styles.grid}>
            {upcomingGames.map((game) => {
              const Icon = game.icon;
              return (
                <div key={game.slug} className={`${styles.card} ${styles.cardDisabled}`}>
                  <span className={styles.soonBadge}>Coming soon</span>
                  <Icon />
                  <h2 className={styles.cardTitle}>{game.name}</h2>
                  <p className={styles.cardDescription}>{game.description}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
