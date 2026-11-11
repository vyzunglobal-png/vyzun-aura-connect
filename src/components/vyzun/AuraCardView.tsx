import { forwardRef, useEffect, useRef, type CSSProperties } from "react";
import { BadgeCheck, Crown, Link2, MessageCircleHeart, ScanFace } from "lucide-react";
import type { AuraCard } from "@/lib/vyzun-store";
import type { LiveVibe } from "@/lib/aura-daily";
import { DEFAULT_PALETTE, type AuraColor } from "@/lib/aura-palette";
import { AuraParticles } from "./AuraParticles";
import { Logo, Wordmark } from "./Logo";
import { cn } from "@/lib/utils";

const GAUGES = [
  { key: "creativity", label: "Creativity", color: "var(--aura-violet)" },
  { key: "depth", label: "Depth", color: "var(--aura-aqua)" },
  { key: "confidence", label: "Confidence", color: "var(--aura-rose)" },
  { key: "energy", label: "Energy", color: "var(--aura-gold)" },
] as const;

export function rarityFor(score: number) {
  if (score >= 95) return "Mythic";
  if (score >= 88) return "Legendary";
  if (score >= 70) return "Epic";
  if (score >= 50) return "Rare";
  return "Common";
}

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="aura-glass flex flex-col items-center gap-[1.6cqw] rounded-[4cqw] px-[1cqw] py-[2.6cqw]">
      <div className="relative h-[13.5cqw] w-[13.5cqw]">
        <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
          <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="4.5" />
          <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-[4.6cqw] font-bold">{value}</span>
      </div>
      <span className="text-[2.7cqw] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
    </div>
  );
}

type Props = {
  card: AuraCard;
  username: string;
  live: LiveVibe;
  palette?: AuraColor[];
  prime?: boolean;
  streak?: number;
  /** Story export: no tilt/animation, and an Instagram-style link sticker. */
  still?: boolean;
  sticker?: string;
  className?: string;
};

export const AuraCardView = forwardRef<HTMLElement, Props>(function AuraCardView(
  { card, username, live, palette = DEFAULT_PALETTE, prime, streak = 0, still = false, sticker, className },
  ref,
) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const rarity = rarityFor(live.score);
  const ultra = rarity === "Legendary" || rarity === "Mythic";
  const quote = card.lines[0] ?? card.headline;
  const ring = Object.fromEntries(palette.slice(0, 4).map((p, i) => [`--p${i + 1}`, p.token])) as CSSProperties;

  // Pointer tilt-parallax with eased motion; idle sway is CSS.
  useEffect(() => {
    const el = tiltRef.current;
    if (!el || still || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0, mx = 50, my = 28, tmx = 50, tmy = 28;
    const loop = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; mx += (tmx - mx) * 0.12; my += (tmy - my) * 0.12;
      el.style.transform = `perspective(1100px) rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`;
      el.style.setProperty("--mx", `${mx.toFixed(1)}%`);
      el.style.setProperty("--my", `${my.toFixed(1)}%`);
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(tmx - mx) > 0.05 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tx = (px - 0.5) * 14; ty = (0.5 - py) * 12; tmx = px * 100; tmy = py * 100; kick();
    };
    const leave = () => { tx = 0; ty = 0; tmx = 50; tmy = 28; kick(); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); el.removeEventListener("pointercancel", leave); };
  }, [still]);

  return (
    <div className={cn("aura-scope relative", still ? "aura-still" : "aura-sway", className)}>
      <div ref={tiltRef} className="aura-tilt relative">
        {/* static bloom behind the frame (blur computed once) */}
        {!still && <div aria-hidden className="aura-bloom aura-cut absolute -inset-1 [--cut:30px]" />}
        <article ref={ref} aria-label={`Aura Card for @${username}`} className="aura-line aura-cut relative aspect-[9/16] w-full p-[2px] [--cut:30px]">
          <div className="aura-gap aura-cut h-full w-full p-[5px] [--cut:29px]">
            <div className="aura-line-alt aura-cut h-full w-full p-[1.5px] [--cut:27px]">
              <div className="aura-body aura-cut relative flex h-full w-full flex-col overflow-hidden px-[5.5cqw] pb-[4.5cqw] pt-[5cqw] [--cut:26px]">
                <div aria-hidden className="aura-halo -top-[18%] left-[12%] h-[40%] w-[76%] bg-violet/35" />
                <div aria-hidden className="aura-halo bottom-[8%] -right-[20%] h-[34%] w-[60%] bg-cyan/15 [animation-delay:-4s]" />
                <div aria-hidden className="aura-halo bottom-[30%] -left-[25%] h-[28%] w-[50%] bg-magenta/15 [animation-delay:-7s]" />
                <AuraParticles still={still} />
                <div aria-hidden className="aura-shine" />

                <header className="relative flex items-center justify-between">
                  <p className="flex items-center gap-[1.4cqw] text-[4.2cqw] font-semibold">
                    @{username}
                    {prime && <BadgeCheck className="h-[4.2cqw] w-[4.2cqw] text-cyan" aria-label="Prime" />}
                  </p>
                  <span className="aura-flame flex items-center gap-[1cqw] rounded-full px-[2.8cqw] py-[1cqw] text-[4cqw] font-bold" aria-label={`Aura Flame streak ${streak} days`}>
                    <span aria-hidden className="aura-flame-icon inline-block">🔥</span>{streak}
                  </span>
                </header>

                {/* cosmic energy ring portrait */}
                <div className="relative mx-auto mt-[3cqw] flex flex-col items-center">
                  <span className="aura-crown relative z-20 -mb-[2.6cqw] flex items-center gap-[1.2cqw] rounded-full px-[3cqw] py-[0.8cqw] text-[3cqw] font-bold tracking-[0.22em]">
                    <Crown className="h-[3.4cqw] w-[3.4cqw] fill-current" /> {ultra ? "ULTRA RARE" : rarity.toUpperCase()}
                  </span>
                  <div className="relative h-[38cqw] w-[38cqw]" style={ring}>
                    <div aria-hidden className="aura-ring-bloom anim-spin-slow absolute -inset-[3cqw] rounded-full" />
                    <div aria-hidden className="aura-ring anim-spin-slow absolute -inset-[1.6cqw] rounded-full" />
                    <div aria-hidden className="aura-orbit absolute -inset-[4.5cqw]">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <span key={i} className="anim-pulse-neon absolute h-[1.3cqw] w-[1.3cqw] rounded-full bg-cyan shadow-[var(--glow-cyan)]" style={{ top: `${50 - 50 * Math.cos((i * 2 * Math.PI) / 7)}%`, left: `${50 + 50 * Math.sin((i * 2 * Math.PI) / 7)}%`, animationDelay: `${-i * 0.4}s` }} />
                      ))}
                    </div>
                    <div className="aura-portrait relative h-full w-full overflow-hidden rounded-full">
                      {card.photo ? (
                        <img src={card.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center"><ScanFace strokeWidth={1.6} className="h-[15cqw] w-[15cqw] text-cyan drop-shadow-[0_0_8px_var(--color-cyan)]" /></div>
                      )}
                      <div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-violet/10 via-transparent to-magenta/20 mix-blend-screen" />
                    </div>
                  </div>
                </div>

                <div className="relative mt-[4cqw] text-center">
                  <p className="aura-score font-display text-[17cqw] font-bold leading-[0.95]">{live.score}%</p>
                  <p className="aura-headline mt-[1cqw] font-display text-[7.4cqw] font-bold leading-tight">{card.headline}</p>
                  <p className="mt-[1.2cqw] text-[3.3cqw] text-muted-foreground">24-Hour Live Vibe · Top {Math.max(1, 100 - live.score)}% · entertainment reading</p>
                </div>

                <div className="relative mt-[3.4cqw] grid grid-cols-4 gap-[2cqw]">
                  {GAUGES.map((g) => <Gauge key={g.key} label={g.label} color={g.color} value={live.stats[g.key]} />)}
                </div>

                <div className="relative mt-[3cqw] flex items-center justify-center gap-[2.4cqw]">
                  <span className="mr-[1cqw] text-[3cqw] font-medium uppercase tracking-[0.2em] text-muted-foreground">Aura Palette</span>
                  {palette.slice(0, 4).map((c) => (
                    <span key={c.name} title={c.name} className="aura-orb h-[7cqw] w-[7cqw] rounded-full" style={{ "--orb": c.token } as CSSProperties} />
                  ))}
                </div>
                <p className="relative mt-[1cqw] text-center text-[2.7cqw] tracking-wide text-muted-foreground">{palette.slice(0, 3).map((c) => c.name).join(" · ")}</p>

                <blockquote className="aura-glass relative mt-[2.6cqw] rounded-full px-[4cqw] py-[2.2cqw] text-center text-[4cqw] italic leading-snug">“{quote}”</blockquote>
                <div className="aura-mood relative mt-[2.4cqw] flex items-center gap-[2.6cqw] rounded-[5cqw] px-[3.6cqw] py-[2.4cqw]">
                  <MessageCircleHeart className="h-[6cqw] w-[6cqw] shrink-0 text-magenta" />
                  <p className="text-[3.7cqw] leading-snug"><span className="font-semibold text-magenta">Campus Mood</span> · {live.prompt}</p>
                </div>

                {sticker && (
                  <div className="aura-sticker relative mx-auto mt-auto flex items-center gap-[1.6cqw] rounded-[3cqw] px-[3.4cqw] py-[1.8cqw] text-[3.5cqw] font-bold">
                    <Link2 className="h-[4cqw] w-[4cqw] text-violet" /> <span className="max-w-[60cqw] truncate">{sticker}</span>
                  </div>
                )}
                <footer className={cn("relative flex items-center justify-between", sticker ? "mt-[2.4cqw]" : "mt-auto")}>
                  <span className="text-[4.4cqw] font-semibold">Beat my Aura ➔ <span className="aura-brand">VYZUN</span></span>
                  <span className="flex items-center gap-[1.6cqw]">
                    <Logo className="h-[6.6cqw] w-[6.6cqw]" />
                    <Wordmark className="text-[5.2cqw]" />
                  </span>
                </footer>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
});
