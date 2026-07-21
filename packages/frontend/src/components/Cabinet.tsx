import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getGame } from '../games/registry';
import { NavBar } from './NavBar';
import styles from './Cabinet.module.scss';

/**
 * Decorative 1980s-arcade-cabinet chrome around the real site. The neon
 * marquee doubles as the home link and hosts the site nav, so the title
 * isn't repeated inside the screen. `children` (the routed page) render
 * inside the CRT screen unchanged, except the per-game title: Cabinet reads
 * the current game from the route (useLocation, not useParams — this
 * renders above <Routes>, outside any Route's matched subtree, so
 * useParams wouldn't see :slug here) and renders it in a fixed header
 * above .screenContent, so it stays put on the fixed-height desktop layout
 * instead of scrolling away with the game itself. The rest of the cabinet
 * (bezel screws, joystick, buttons, coin slot) is purely decorative
 * (aria-hidden, pointer-events: none).
 */
export function Cabinet({ children }: { children: ReactNode }) {
  const location = useLocation();
  const gameSlug = location.pathname.match(/^\/games\/([^/]+)/)?.[1];
  const game = gameSlug ? getGame(gameSlug) : undefined;

  return (
    <div className={styles.root}>
      <div className={styles.cabinet}>
        <div className={styles.marquee}>
          <div className={styles.marqueeRow}>
            <Link
              to="/"
              className={`${styles.marqueeLink} ${styles.neonText} ${styles.marquee24}`}
              aria-label="24 Hour — home"
            >
              24 Hour
            </Link>
            <Link to="/" className={styles.marqueeLink} aria-label="The Dog House — home">
              <div className={styles.neonText}>The Dog</div>
              <div className={styles.neonText}>House</div>
            </Link>
          </div>
          <NavBar />
        </div>

        <div className={styles.bezel}>
          <div className={`${styles.screw} ${styles.tl}`} aria-hidden="true" />
          <div className={`${styles.screw} ${styles.tr}`} aria-hidden="true" />
          <div className={`${styles.screw} ${styles.bl}`} aria-hidden="true" />
          <div className={`${styles.screw} ${styles.br}`} aria-hidden="true" />
          <div className={styles.screen}>
            {game && <h1 className={styles.screenHeader}>{game.name}</h1>}
            <div className={styles.screenContent}>{children}</div>
          </div>
        </div>

        <div className={styles.controlPanel} aria-hidden="true">
          <div className={styles.joystick}>
            <div className={styles.joystickBall} />
          </div>
          <div className={styles.buttons}>
            <div className={`${styles.arcadeBtn} ${styles.red}`} />
            <div className={`${styles.arcadeBtn} ${styles.yellow}`} />
            <div className={`${styles.arcadeBtn} ${styles.blue}`} />
          </div>
        </div>

        <div className={styles.cabinetBase} aria-hidden="true">
          <div className={styles.coinUnit}>
            <div className={styles.coinSlot}>
              <div className={styles.coinSlotWindow}>
                <div className={styles.coinSlotLine} />
              </div>
            </div>
            <span className={styles.coinLabel}>Insert coin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
