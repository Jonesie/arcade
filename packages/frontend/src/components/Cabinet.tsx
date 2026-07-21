import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from './NavBar';
import styles from './Cabinet.module.scss';

/**
 * Decorative 1980s-arcade-cabinet chrome around the real site. The neon
 * marquee doubles as the home link and hosts the site nav, so the title
 * isn't repeated inside the screen. `children` (the routed page) render
 * inside the CRT screen unchanged. The rest of the cabinet (bezel screws,
 * joystick, buttons, coin slot, base plate) is purely decorative
 * (aria-hidden, pointer-events: none).
 */
export function Cabinet({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.cabinet}>
        <div className={styles.marquee}>
          <div className={styles.marqueeRow}>
            <div className={`${styles.neonText} ${styles.marquee24}`} aria-hidden="true">
              24 Hour
            </div>
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
          <div className={styles.screen}>{children}</div>
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
          <div className={styles.coinUnit}>
            <div className={styles.coinSlot}>
              <div className={styles.coinSlotLine} />
            </div>
            <span className={styles.coinLabel}>Insert coin</span>
          </div>
        </div>

        <div className={styles.cabinetBase} aria-hidden="true">
          <span className={styles.plate}>Player 1</span>
        </div>
      </div>
    </div>
  );
}
