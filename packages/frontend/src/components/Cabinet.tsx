import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isMuted, subscribeMuted, toggleMuted } from '../audio/muteState';
import { getGame } from '../games/registry';
import { NavBar } from './NavBar';
import styles from './Cabinet.module.scss';

// Real photos of the actual Dog House (Christchurch), not committed to git —
// see public/branding/README.md. One is picked at random per page load and
// shown full-page, faded behind the cabinet.
const BACKDROP_IMAGES = ['/branding/doghouse-2.jpg', '/branding/doghouse-3.jpg'];
// '/branding/doghouse-1.jpg', has a person in it, so it's not suitable for a backdrop.

// The right-hand marquee line cycles through the shopfront's actual menu
// board items rather than sitting on "Video Games" forever.
const MARQUEE_WORDS = ['Video Games', 'Burgers', 'Hot Chips', 'Hot Dogs', 'Beatings'];
const MARQUEE_WORD_INTERVAL_MS = 3000;

/**
 * Decorative 1980s-arcade-cabinet chrome around the real site. The neon
 * marquee doubles as the home link and hosts the site nav, so the title
 * isn't repeated inside the screen. `children` (the routed page) render
 * inside the CRT screen unchanged, except the per-game title: Cabinet reads
 * the current game from the route (useLocation, not useParams — this
 * renders above <Routes>, outside any Route's matched subtree, so
 * useParams wouldn't see :slug here) and renders it in a fixed header
 * above .screenContent, so it stays put on the fixed-height desktop layout
 * instead of scrolling away with the game itself. Most of the rest of the
 * cabinet (bezel screws, joystick, coin slot) is purely decorative
 * (aria-hidden, pointer-events: none) — except one control-panel button,
 * which is a real site-wide mute toggle (see ../audio/muteState) since it's
 * persistent chrome shown on every page, not owned by any one game's HUD.
 */
export function Cabinet({ children }: { children: ReactNode }) {
  const location = useLocation();
  const gameSlug = location.pathname.match(/^\/games\/([^/]+)/)?.[1];
  const game = gameSlug ? getGame(gameSlug) : undefined;

  const [muted, setMuted] = useState(isMuted());
  useEffect(() => subscribeMuted(setMuted), []);

  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setWordIndex((i) => (i + 1) % MARQUEE_WORDS.length), MARQUEE_WORD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Picked once per mount (Cabinet wraps every route and doesn't remount on
  // navigation, so this is effectively "once per page load," not per page).
  const [backdrop] = useState(() => BACKDROP_IMAGES[Math.floor(Math.random() * BACKDROP_IMAGES.length)]);

  return (
    <div className={styles.root}>
      <div className={styles.backdrop} style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />
      <div className={styles.cabinet}>
        <div className={styles.marquee}>
          <div className={styles.marqueeRow}>
            <Link to="/" className={styles.marqueeLink} aria-label="The Dog House — home">
              <div className={styles.neonText}>The Dog</div>
              <div className={styles.neonText}>House</div>
            </Link>
            <Link to="/" className={styles.marqueeLink} aria-label="24 Hour Video Games — home">
              <div className={styles.neonText}>24 Hour</div>
              <div className={`${styles.neonText} ${styles.cyclingWord}`} key={wordIndex}>
                {MARQUEE_WORDS[wordIndex]}
              </div>
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
            <div className={`${styles.arcadeBtn} ${styles.red}`} aria-hidden="true" />
            <div className={`${styles.arcadeBtn} ${styles.yellow}`} aria-hidden="true" />
            <button
              type="button"
              className={`${styles.arcadeBtn} ${styles.blue} ${styles.musicBtn}`}
              onClick={() => toggleMuted()}
              aria-pressed={!muted}
              aria-label={muted ? 'Turn music on' : 'Turn music off'}
              title={muted ? 'Turn music on' : 'Turn music off'}
            >
              ♪
            </button>
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
