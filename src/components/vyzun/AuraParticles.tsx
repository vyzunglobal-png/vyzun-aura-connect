import { useEffect, useRef } from "react";

const TOKENS = ["--aura-shine", "--aura-aqua", "--aura-violet", "--aura-gold", "--aura-rose"];

type Dust = { x: number; y: number; r: number; vx: number; vy: number; phase: number; speed: number; color: number };

/**
 * Floating cosmic dust on a canvas. Motion is time-based, so it stays smooth at
 * 60–120 Hz; it pauses off-screen / in background tabs and honours reduced motion.
 * `still` draws a single frame (used for image export).
 */
export function AuraParticles({ still = false, density = 1 }: { still?: boolean; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(canvas);
    const colors = TOKENS.map((t) => css.getPropertyValue(t).trim() || css.color);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0;
    let dust: Dust[] = [];

    const seed = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width); h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 3600) * density);
      dust = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + Math.random() * (i % 7 === 0 ? 1.9 : 1.1),
        vx: (Math.random() - 0.5) * 6,
        vy: -(3 + Math.random() * 10),
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.8,
        color: i % 3 === 0 ? 1 + (i % 4) : 0,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of dust) {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.phase + t * p.speed));
        ctx.fillStyle = colors[p.color] ?? colors[0]!;
        ctx.globalAlpha = 0.12 * twinkle;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.85 * twinkle;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    seed();
    draw(0);
    if (still || reduced) return;

    let raf = 0, last = performance.now(), visible = true;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const p of dust) {
        p.x += (p.vx + Math.sin(now / 1800 + p.phase) * 3) * dt;
        p.y += p.vy * dt;
        if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
        if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
      }
      draw(now / 1000);
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (visible) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => seed());
    ro.observe(canvas);
    start();
    return () => { stop(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [still, density]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
