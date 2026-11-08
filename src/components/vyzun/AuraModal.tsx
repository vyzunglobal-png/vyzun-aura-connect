import { useEffect, useRef, useState } from "react";
import { Download, Send, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuraCardView } from "./AuraCardView";
import { PaidActionSheet, type PaidAction } from "./PaidActionSheet";
import { downloadDataUrl, renderNodeToPng, shareImage } from "@/lib/aura-share";
import { recordAuraShare, type AuraStreak } from "@/lib/aura-daily";
import { useVyzun, type AuraCard } from "@/lib/vyzun-store";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useAuraStreak(username: string) {
  const [streak, setStreak] = useState<AuraStreak | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`vyzun.aura-streak.${username}`);
      if (saved) setStreak(JSON.parse(saved) as AuraStreak);
    } catch { /* local streak is optional */ }
  }, [username]);
  function recordShare() {
    const next = recordAuraShare(streak, todayKey());
    setStreak(next);
    try { localStorage.setItem(`vyzun.aura-streak.${username}`, JSON.stringify(next)); } catch { /* device storage may be unavailable */ }
  }
  return { streak, recordShare };
}

/** Full-screen 9:16 holographic story modal shared by scan results and the daily banner. */
export function AuraModal({ card, open, onClose }: { card: AuraCard | null; open: boolean; onClose: () => void }) {
  const { state, update } = useVyzun();
  const { streak, recordShare } = useAuraStreak(state.profile.username);
  const cardRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState<null | "share" | "download" | "post">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paid, setPaid] = useState<PaidAction | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !card) return null;

  async function exportCard() {
    if (!cardRef.current) return null;
    return renderNodeToPng(cardRef.current);
  }

  async function onShare() {
    if (!card) return;
    setBusy("share");
    try {
      const out = await exportCard();
      if (!out) return;
      const result = await shareImage(
        out.blob,
        out.dataUrl,
        `My VYZUN aura is ${card.score}% — ${card.rarity}. Beat my Aura → ${window.location.origin}/?ref=${encodeURIComponent(state.profile.username)}&aura=${encodeURIComponent(card.id)}`,
      );
      if (result === "shared") recordShare();
      if (result === "downloaded") setNotice("Sharing isn’t available here — the image was saved instead.");
    } catch {
      setNotice("Couldn’t create the image. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onDownload() {
    setBusy("download");
    try {
      const out = await exportCard();
      if (out) {
        downloadDataUrl(out.dataUrl, "vyzun-aura.png");
        setNotice("Aura Card image saved.");
      }
    } catch {
      setNotice("Couldn’t create the image. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onPostToFeed() {
    if (!card) return;
    setBusy("post");
    try {
      const out = await exportCard();
      if (!out) return;
      update((s) => ({
        feed: [
          {
            id: crypto.randomUUID(),
            author: s.profile.username,
            anonymous: false,
            body: `My aura reads ${card.score} — ${card.headline}. Beat my Aura → VYZUN`,
            image: out.dataUrl,
            createdAt: Date.now(),
            reactions: { vibe: 0, curious: 0, savage: 0, lol: 0 },
            mine: null,
          },
          ...s.feed,
        ],
      }));
      setNotice("Posted to your Vibe Feed.");
    } catch {
      setNotice("Couldn’t create the image. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Your holographic Aura Card" className="fixed inset-0 z-[60] overflow-y-auto bg-background/90 p-4 pb-24 backdrop-blur-md">
      <section className="anim-rise mx-auto max-w-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today’s 3D Aura Card</h2>
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-1.5 text-xs text-muted-foreground tap active:tap-active">
            <X className="h-4 w-4" /> Close
          </Button>
        </div>

        <AuraCardView
          ref={cardRef}
          card={card}
          username={state.profile.username}
          prime={state.profile.prime}
          streak={streak?.count ?? 0}
          className="aura-hologram"
        />

        {/* Glowing story row */}
        <Button
          onClick={onShare}
          disabled={busy !== null}
          className="mt-4 h-auto w-full whitespace-normal rounded-xl bg-gradient-secret py-3.5 font-bold text-primary-foreground shadow-[0_0_22px_-2px_oklch(0.65_0.28_330/70%),0_0_30px_-4px_oklch(0.79_0.16_203/50%)] tap active:tap-active disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" />
          {busy === "share" ? "Preparing story…" : "✨ SHARE TO STORY"}
        </Button>
        <p className="mt-2 text-center text-xs font-semibold text-gradient">Beat my Aura ➔ VYZUN</p>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">9:16 story image with your VYZUN link · entertainment reading, not a measured ranking.</p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={onDownload}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-glass-border py-3 text-sm font-semibold tap active:tap-active disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {busy === "download" ? "Saving…" : "Save Image"}
          </button>
          <button
            onClick={onPostToFeed}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-glass-border py-3 text-sm font-semibold tap active:tap-active disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy === "post" ? "Posting…" : "Post to Vibe Feed"}
          </button>
        </div>

        <button
          onClick={() => setPaid({ title: "Aura Boost", price: "$2.99", description: "A verified purchase boosts your Aura Card’s visibility. Checkout is not connected yet — no charge was made." })}
          className="mt-3 w-full rounded-xl border border-gold/50 py-2.5 text-xs font-semibold text-gold tap active:tap-active"
        >
          ⚡ $2.99 · Boost this Aura
        </button>

        {notice && <p aria-live="polite" className="mt-3 text-center text-xs text-muted-foreground">{notice}</p>}
      </section>
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
    </div>
  );
}
