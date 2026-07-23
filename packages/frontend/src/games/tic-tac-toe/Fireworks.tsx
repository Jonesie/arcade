import { useEffect, useRef } from 'react';
import styles from './Fireworks.module.scss';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const COLORS = ['#ff5252', '#ffca28', '#69f0ae', '#40c4ff', '#e040fb', '#ff6e40'];
const GRAVITY = 220;
const BURST_INTERVAL_S = 0.7;
const PARTICLES_PER_BURST = 28;

/**
 * A celebratory canvas particle burst for a Tic-Tac-Toe win (GitHub issue
 * #9) — synthesized like the site's sound effects, no image/gif asset.
 * Self-contained: mount to run, unmount to stop, no props needed. Repeats
 * bursts for as long as it stays mounted (the parent conditionally renders
 * this only while the win result is showing).
 */
export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    // Freshly-typed non-null bindings so the nested functions below (which
    // TS can't otherwise narrow through) keep the non-null type.
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    let particles: Particle[] = [];
    let lastTime = performance.now();
    let burstTimer = 0;
    let rafId: number;

    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function spawnBurst() {
      const cx = canvas.width * (0.2 + Math.random() * 0.6);
      const cy = canvas.height * (0.2 + Math.random() * 0.4);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLES_PER_BURST + Math.random() * 0.3;
        const speed = 80 + Math.random() * 120;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.4,
          color,
          size: 2 + Math.random() * 2,
        });
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      burstTimer -= dt;
      if (burstTimer <= 0) {
        spawnBurst();
        burstTimer = BURST_INTERVAL_S;
      }

      for (const p of particles) {
        p.life += dt;
        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      particles = particles.filter((p) => p.life < p.maxLife);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        const t = p.life / p.maxLife;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
