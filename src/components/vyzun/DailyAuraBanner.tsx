import { useEffect, useState } from "react";
import { Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuraCardView } from "./AuraCardView";
import { AuraModal, useAuraStreak } from "./AuraModal";
import { getDailyAura } from "@/lib/aura-daily";
import { useVyzun } from "@/lib/vyzun-store";

function dayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Interactive daily banner: midnight-regenerated vibe, morning ritual note and flame streak. */
export function DailyAuraBanner() {
  const { state } = useVyzun();
  const latest = state.auraCards[0] ?? null;
  const { streak } = useAuraStreak(state.profile.username);
  const [open, setOpen] = useState(false);
  const [morning, setMorning] = useState(false);

  useEffect(() => {
    const key = `vyzun.aura-visit.${state.profile.username}`;
    try {
      if (localStorage.getItem(key) !== dayKey()) {
        setMorning(true);
        localStorage.setItem(key, dayKey());
      }
    } catch { setMorning(true); }
  }, [state.profile.username]);

  const today = dayKey();
  const daily = latest ? getDailyAura(latest.id, latest.score, today) : null;

  return (
    <section aria-label="Today's 3D Aura Card" className="glass-card relative mt-4 overflow-hidden p-4 shadow-[var(--glow-neon)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-vyzun opacity-10" />
      <div className="relative flex items-center gap-3">
        <span className="squircle-glow grid h-12 w-12 shrink-0 place-items-center bg-background">
          <Sparkles className="h-6 w-6 text-cyan" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Today’s 3D Aura Card</p>
          <p className="truncate text-xs text-muted-foreground">
            {latest && daily
              ? `${daily.score}% · ${latest.headline} · new vibe every midnight`
              : "Scan once to unlock your daily living aura"}
          </p>
        </div>
        {latest && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/50 px-2 py-1 text-[11px] font-bold text-gold shadow-[0_0_12px_oklch(0.8_0.17_80/40%)]">
            <Flame className="h-3.5 w-3.5 fill-gold/30" /> {streak?.count ?? 0}
          </span>
        )}
      </div>

      {morning && latest && (
        <p role="status" className="relative mt-3 rounded-xl border border-cyan/30 bg-background/50 px-3 py-2 text-xs text-cyan">
          🌅 Your Aura shifted overnight. Tap to unlock today’s 3D Card.
        </p>
      )}
      {morning && !latest && (
        <p role="status" className="relative mt-3 rounded-xl border border-cyan/30 bg-background/50 px-3 py-2 text-xs text-cyan">
          🌅 Start your morning vibe ritual — scan to reveal today’s aura.
        </p>
      )}

      {latest ? (
        <Button onClick={() => setOpen(true)} className="relative mt-3 w-full rounded-xl bg-gradient-vyzun py-3 font-semibold text-primary-foreground shadow-[var(--glow-cyan)] tap active:tap-active">
          Open today’s card
        </Button>
      ) : (
        <p className="relative mt-3 text-center text-[11px] text-muted-foreground">Check and share your vibe daily to grow your Aura Flame 🔥</p>
      )}

      <AuraModal card={latest} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
