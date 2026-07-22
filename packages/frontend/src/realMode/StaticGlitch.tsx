import { useEffect, useRef } from 'react';
import styles from './StaticGlitch.module.scss';

// Deliberately low internal resolution (chunky noise, not per-device-pixel)
// — that's actually closer to real analog TV static than a hi-res version
// would be, and it's cheap to redraw every frame. Scaled up to fill
// whatever container it's placed in via CSS, same `image-rendering:
// pixelated` trick every game's canvas already uses.
const NOISE_WIDTH = 160;
const NOISE_HEIGHT = 120;

/**
 * "Machine failure" — an actual visual glitch treatment (per GitHub issue
 * #6) rather than just text: full-frame random noise redrawn every
 * animation frame, with occasional bright/dark horizontal tracking bars
 * for extra chaos. No assets — just Math.random() into an ImageData
 * buffer, same "synthesize everything" approach as the site's audio.
 */
export function StaticGlitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    let raf = 0;
    const imageData = ctx.createImageData(NOISE_WIDTH, NOISE_HEIGHT);

    function draw() {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx!.putImageData(imageData, 0, 0);

      if (Math.random() < 0.3) {
        const barY = Math.random() * NOISE_HEIGHT;
        const barH = 2 + Math.random() * 6;
        ctx!.fillStyle = Math.random() < 0.5 ? '#fff' : '#000';
        ctx!.fillRect(0, barY, NOISE_WIDTH, barH);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas ref={canvasRef} width={NOISE_WIDTH} height={NOISE_HEIGHT} className={styles.canvas} aria-hidden="true" />
  );
}
