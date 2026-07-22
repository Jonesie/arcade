import styles from './Cigarette.module.scss';

/**
 * A burning cigarette resting on the edge of the control panel — shown
 * whenever Real Mode is enabled, independent of the random events (see
 * GitHub issue #6: "an ambient decorative detail, not a timed event").
 */
export function Cigarette() {
  return (
    <div className={styles.cigarette} aria-hidden="true">
      <div className={styles.body} />
      <div className={styles.ember} />
      <div className={styles.smoke}>
        <span className={styles.wisp} />
        <span className={styles.wisp} />
        <span className={styles.wisp} />
      </div>
    </div>
  );
}
