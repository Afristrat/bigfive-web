'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import styles from './apercu.module.css';

type Ring = { n: number; k: number; r: number; speed: number; color: string };

// Cinq anneaux, un par facteur : polygones étoilés {n/k}, chacun tourne à sa vitesse.
// Teintes claires, car le cadran vit toujours sur la bande sombre (--sidebar).
const RINGS: readonly Ring[] = [
  { n: 8, k: 3, r: 0.3, speed: 0.016, color: '#8fb2ff' },
  { n: 10, k: 3, r: 0.4, speed: -0.012, color: '#44e0c6' },
  { n: 12, k: 5, r: 0.5, speed: 0.01, color: '#e68bf3' },
  { n: 16, k: 7, r: 0.6, speed: -0.008, color: '#ff9f7c' },
  { n: 20, k: 9, r: 0.7, speed: 0.006, color: '#86e6d2' }
];

const TAU = Math.PI * 2;

function ease(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

// Écart d'angle le plus court entre deux angles, entre -π et π.
function shortest(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function Instrument(): ReactNode {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv ? cv.getContext('2d') : null;
    if (!el || !cv || !ctx) return undefined;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    let size = 0;
    let raf = 0;
    let visible = true;
    let start = 0;
    let needle = -Math.PI / 2;
    let target = -Math.PI / 2;
    let pointerAt = 0;

    const resize = (): void => {
      const rect = el.getBoundingClientRect();
      size = Math.max(1, Math.round(rect.width));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(size * dpr);
      cv.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointer = (event: PointerEvent): void => {
      const rect = cv.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      target = Math.atan2(event.clientY - cy, event.clientX - cx);
      pointerAt = performance.now();
    };

    const draw = (now: number): void => {
      const t = reduce ? 0 : (now - start) / 1000;
      const reveal = reduce ? 1 : Math.min(1, t / 2.4);
      const R = size / 2;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(R, R);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Cadran gradué
      ctx.strokeStyle = 'rgba(255,255,255,0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.97, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.885, 0, TAU);
      ctx.stroke();
      const shown = Math.floor(360 * ease(reveal));
      for (let i = 0; i < shown; i++) {
        const major = i % 30 === 0;
        const mid = i % 10 === 0;
        const five = i % 5 === 0;
        const len = major ? 0.085 : mid ? 0.05 : five ? 0.032 : 0.016;
        const a = (i / 360) * TAU - Math.PI / 2;
        ctx.strokeStyle = major
          ? 'rgba(255,255,255,0.8)'
          : mid
            ? 'rgba(255,255,255,0.45)'
            : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97);
        ctx.lineTo(
          Math.cos(a) * R * (0.97 - len),
          Math.sin(a) * R * (0.97 - len)
        );
        ctx.stroke();
      }

      // Cinq anneaux entrelacés : chaque anneau découpe un liseré dans ceux du dessous.
      for (let index = RINGS.length - 1; index >= 0; index--) {
        const ring = RINGS[index];
        if (!ring) continue;
        const p = ease(reveal * 1.7 - (RINGS.length - 1 - index) * 0.17);
        if (p <= 0) continue;
        const radius = R * ring.r * (0.55 + 0.45 * p);
        const turn = t * ring.speed * TAU + index * 0.4;
        const points: [number, number][] = [];
        for (let i = 0; i < ring.n; i++) {
          const a = (i / ring.n) * TAU + turn - Math.PI / 2;
          points.push([Math.cos(a) * radius, Math.sin(a) * radius]);
        }
        const trace = (): void => {
          ctx.beginPath();
          for (let i = 0; i <= ring.n; i++) {
            const pt = points[(i * ring.k) % ring.n];
            if (!pt) continue;
            if (i === 0) ctx.moveTo(pt[0], pt[1]);
            else ctx.lineTo(pt[0], pt[1]);
          }
        };
        ctx.globalAlpha = p * 0.16;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = p;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 5;
        trace();
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1.8;
        trace();
        ctx.stroke();
        ctx.fillStyle = ring.color;
        points.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, TAU);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Aiguille : suit le curseur, dérive lentement sinon.
      const idle = now - pointerAt > 2500;
      const aim =
        idle && !reduce ? -Math.PI / 2 + Math.sin(t * 0.25) * 0.9 : target;
      needle += shortest(needle, aim) * 0.06;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = ease(reveal * 2 - 0.6);
      ctx.beginPath();
      ctx.moveTo(-Math.cos(needle) * R * 0.1, -Math.sin(needle) * R * 0.1);
      ctx.lineTo(Math.cos(needle) * R * 0.97, Math.sin(needle) * R * 0.97);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        Math.cos(needle) * R * 0.97,
        Math.sin(needle) * R * 0.97,
        4,
        0,
        TAU
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.03, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const frame = (now: number): void => {
      if (!start) start = now;
      draw(now);
      raf = visible && !reduce ? requestAnimationFrame(frame) : 0;
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !raf && !reduce) raf = requestAnimationFrame(frame);
    });
    const resizer = new ResizeObserver(() => {
      resize();
      if (reduce) draw(performance.now());
    });
    resize();
    observer.observe(el);
    resizer.observe(el);
    window.addEventListener('pointermove', onPointer, { passive: true });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizer.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return (
    <div ref={box} className={styles.cadran}>
      <canvas ref={canvas} aria-hidden='true' />
    </div>
  );
}
