import type { ReactNode } from 'react';
import styles from './Cabinet.module.scss';

/**
 * Decorative 1980s-arcade-cabinet chrome around the real site. `children`
 * (nav + routed page) render inside the CRT screen unchanged — this only
 * adds the marquee/bezel/control-panel frame around them. All of the
 * cabinet parts are decorative (aria-hidden); real navigation and controls
 * live inside the screen exactly as before.
 */
export function Cabinet({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.cabinet}>
        <div className={styles.marquee} aria-hidden="true">
          <div className={styles.marqueeThe}>The</div>
          <div className={styles.marqueeText}>Dog House</div>
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
