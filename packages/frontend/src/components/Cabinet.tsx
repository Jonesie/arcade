import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isMusicMuted, subscribeMusicMuted, toggleMusicMuted } from '../audio/musicMuteState';
import { isSfxMuted, subscribeSfxMuted, toggleSfxMuted } from '../audio/sfxMuteState';
import { getGame } from '../games/registry';
import { Cigarette } from '../realMode/Cigarette';
import { RealModeOverlay } from '../realMode/RealModeOverlay';
import { isRealModeEnabled, subscribeRealMode, toggleRealMode } from '../realMode/realModeState';
import { ensureAudio as ensureRealModeAudio } from '../realMode/sound';
import { NavBar } from './NavBar';
import styles from './Cabinet.module.scss';

// A simple speaker-with-soundwaves glyph for the sound-effects toggle,
// drawn as inline SVG (rather than a Unicode/emoji glyph like the music
// note) so it reliably renders as a plain monochrome icon — using
// currentColor means it automatically picks up the button's lit/dimmed
// states from CSS, same as the music note's color does via text.
function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16.2 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M18.3 6.3a8 8 0 0 1 0 11.4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// A simple clenched-fist glyph for the Real Mode toggle (GitHub issue
// #6's chosen icon) — same inline-SVG-with-currentColor approach as
// SpeakerIcon above.
function FistIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M7 10V8a2 2 0 0 1 4 0v-.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2z"
        fill="currentColor"
      />
    </svg>
  );
}

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
 * (aria-hidden, pointer-events: none) — except three control-panel
 * buttons: blue/yellow are real site-wide mute toggles (music, sound
 * effects; see ../audio/musicMuteState and ../audio/sfxMuteState), and
 * red is the "Real Mode" toggle (GitHub issue #6) — random arcade-chaos
 * events layered over whatever game is on screen, see
 * ../realMode/RealModeOverlay. All three are persistent chrome shown on
 * every page, not owned by any one game's HUD.
 */
export function Cabinet({ children }: { children: ReactNode }) {
  const location = useLocation();
  const gameSlug = location.pathname.match(/^\/games\/([^/]+)/)?.[1];
  const game = gameSlug ? getGame(gameSlug) : undefined;

  const [musicMuted, setMusicMuted] = useState(isMusicMuted());
  useEffect(() => subscribeMusicMuted(setMusicMuted), []);

  const [sfxMuted, setSfxMuted] = useState(isSfxMuted());
  useEffect(() => subscribeSfxMuted(setSfxMuted), []);

  const [realMode, setRealMode] = useState(isRealModeEnabled());
  useEffect(() => subscribeRealMode(setRealMode), []);

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
            <div className={styles.screenBody}>
              <div className={styles.screenContent}>{children}</div>
              <RealModeOverlay />
            </div>
          </div>
        </div>

        <div className={styles.controlPanel}>
          {realMode && <Cigarette />}
          <div className={styles.cigaretteBurn} aria-hidden="true" />
          <div className={styles.joystick} aria-hidden="true">
            <div className={styles.joystickBall} />
          </div>
          <div className={styles.buttons}>
            <button
              type="button"
              className={`${styles.arcadeBtn} ${styles.red} ${styles.toggleBtn}`}
              onClick={() => {
                ensureRealModeAudio();
                toggleRealMode();
              }}
              aria-pressed={realMode}
              aria-label={realMode ? 'Turn Real Mode off' : 'Turn Real Mode on'}
              title={realMode ? 'Turn Real Mode off' : 'Turn Real Mode on'}
            >
              <FistIcon />
            </button>
            <button
              type="button"
              className={`${styles.arcadeBtn} ${styles.yellow} ${styles.toggleBtn}`}
              onClick={() => toggleSfxMuted()}
              aria-pressed={!sfxMuted}
              aria-label={sfxMuted ? 'Turn sound effects on' : 'Turn sound effects off'}
              title={sfxMuted ? 'Turn sound effects on' : 'Turn sound effects off'}
            >
              <SpeakerIcon />
            </button>
            <button
              type="button"
              className={`${styles.arcadeBtn} ${styles.blue} ${styles.toggleBtn}`}
              onClick={() => toggleMusicMuted()}
              aria-pressed={!musicMuted}
              aria-label={musicMuted ? 'Turn music on' : 'Turn music off'}
              title={musicMuted ? 'Turn music on' : 'Turn music off'}
            >
              ♪
            </button>
          </div>
        </div>

        <div className={styles.cabinetBase}>
          <a
            className={styles.coinUnit}
            href="https://www.buymeacoffee.com/jonesie"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buy me a coffee"
          >
            <div className={styles.coinSlot}>
              <div className={styles.coinSlotWindow}>
                <div className={styles.coinSlotLine} />
              </div>
            </div>
            <span className={styles.coinLabel}>Insert coin</span>
          </a>
        </div>
      </div>
    </div>
  );
}
