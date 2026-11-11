import { useEffect, useRef, useState } from "react";
import { Bell, Download, Send, Share2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuraCardView } from "./AuraCardView";
import { PaidActionSheet, type PaidAction } from "./PaidActionSheet";
import { useVyzun, type AuraCard } from "@/lib/vyzun-store";
import type { AuraActivity, LiveVibe } from "@/lib/aura-daily";
import type { AuraColor } from "@/lib/aura-palette";
import { downloadDataUrl, renderNodeToPng, shareImage } from "@/lib/aura-share";
import { enableMorningReminder, type ReminderStatus } from "@/lib/use-aura-daily";

const BOOST: PaidAction = {
  title: "Boost Campus Aura Points",
  price: "$2.99",
  description: "Lift today's Aura Card in campus discovery for 24 hours. Nothing is boosted until the payment is confirmed by the server.",
};

const REMINDER_COPY: Record<ReminderStatus, string> = {
  granted: "Morning reminder is on — it appears after 6 a.m. while VYZUN is open on this device.",
  denied: "Notifications are blocked. Allow them for this site in your browser settings.",
  unsupported: "This browser can't show notifications.",
  "open-in-new-tab": "Open VYZUN in its own tab to turn on the morning reminder.",
};

type Story = { dataUrl: string; blob: Blob };

export function AuraCardModal({
  card, live, palette, streak, activity, onClose, onShared,
}: {
  card: AuraCard;
  live: LiveVibe;
  palette: AuraColor[];
  streak: number;
  activity: AuraActivity;
  onClose: () => void;
  onShared: () => void;
}) {
  const { state, update } = useVyzun();
  const username = state.profile.username;
  const cardRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "story" | "save" | "post" | "share">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    setLink(`${window.location.origin}/?ref=${encodeURIComponent(username)}&aura=${encodeURIComponent(card.id)}`);
  }, [username, card.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (story ? setStory(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, story]);

  const stickerText = link ? link.replace(/^https?:\/\//, "").replace(/&aura=.*/, "") : "VYZUN";
  const shareText = `My VYZUN aura is ${live.score}% today. Beat my Aura → ${link}`;

  async function buildStory() {
    if (!storyRef.current) return null;
    const out = await renderNodeToPng(storyRef.current, 3);
    setStory(out);
    return out;
  }

  async function onStory() {
    setBusy("story"); setNotice(null);
    try { await buildStory(); } catch { setNotice("Couldn't create the story image. Please try again."); } finally { setBusy(null); }
  }

  async function onShareNow() {
    if (!story) return;
    setBusy("share");
    try {
      try { await navigator.clipboard?.writeText(link); } catch { /* clipboard optional */ }
      const result = await shareImage(story.blob, story.dataUrl, shareText, "vyzun-aura-story.png");
      if (result === "shared") { onShared(); setNotice("Shared! Your Aura Flame grows when you share again tomorrow."); setStory(null); }
      if (result === "downloaded") setNotice("Story image saved — add it to your Instagram or Snapchat story. Your link is copied for the link sticker.");
    } finally { setBusy(null); }
  }

  async function onSave() {
    setBusy("save"); setNotice(null);
    try {
      const out = story ?? (await buildStory());
      if (out) { downloadDataUrl(out.dataUrl, "vyzun-aura-story.png"); setNotice("Aura story image saved (1080 × 1920)."); }
    } catch { setNotice("Couldn't create the image. Please try again."); } finally { setBusy(null); }
  }

  async function onPost() {
    if (!cardRef.current) return;
    setBusy("post"); setNotice(null);
    try {
      const out = await renderNodeToPng(cardRef.current);
      update((s) => ({
        feed: [{ id: crypto.randomUUID(), author: s.profile.username, anonymous: false, body: `My aura reads ${live.score}% — ${card.headline}. Beat my Aura → VYZUN`, image: out.dataUrl, createdAt: Date.now(), reactions: { vibe: 0, curious: 0, savage: 0, lol: 0 }, mine: null }, ...s.feed],
      }));
      setNotice("Posted to your Vibe Feed.");
    } catch { setNotice("Couldn't create the image. Please try again."); } finally { setBusy(null); }
  }

  async function onReminder() {
    setNotice(REMINDER_COPY[await enableMorningReminder()]);
  }

  const shaped = [`${activity.scans} scan${activity.scans === 1 ? "" : "s"}`, `${activity.secrets} secret${activity.secrets === 1 ? "" : "s"}`, `${activity.posts} post${activity.posts === 1 ? "" : "s"}`].join(" · ");

  return (
    <div role="dialog" aria-modal="true" aria-label="Today's 3D Aura Card" className="aura-scope aura-overlay fixed inset-0 z-[60] overflow-y-auto px-4 pb-28 pt-4">
      <section className="anim-rise mx-auto max-w-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Your Aura Card</h2>
          <Button variant="ghost" onClick={onClose} className="text-sm text-muted-foreground">Close</Button>
        </div>

        <AuraCardView ref={cardRef} card={card} username={username} prime={state.profile.prime} live={live} palette={palette} streak={streak} />

        <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
          <button onClick={onStory} disabled={busy !== null} className="aura-cta-story flex h-14 items-center justify-center gap-2.5 rounded-full font-display text-base font-bold tracking-wide disabled:opacity-60">
            <Share2 className="h-5 w-5" /> {busy === "story" ? "PREPARING…" : "SHARE TO STORY"}
          </button>
          <button onClick={onSave} disabled={busy !== null} className="aura-cta-save flex h-14 items-center justify-center gap-2 rounded-full px-7 font-display text-base font-bold disabled:opacity-60">
            <Download className="h-5 w-5" /> {busy === "save" ? "…" : "SAVE"}
          </button>
        </div>
        <p className="mt-2.5 text-center text-sm font-medium">Beat my Aura ➔ <span className="aura-brand">VYZUN</span> · share daily to grow your 🔥 streak</p>

        <button onClick={() => setPaid(BOOST)} className="aura-cta-boost mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-full font-display text-base font-semibold">
          <Zap className="h-5 w-5 text-cyan" /> $2.99 · Boost Campus Aura Points
        </button>
        <Button variant="outline" onClick={onPost} disabled={busy !== null} className="mt-3 h-12 w-full rounded-full border-glass-border bg-transparent text-muted-foreground">
          <Send className="h-4 w-4" /> {busy === "post" ? "Posting…" : "Post to Vibe Feed"}
        </Button>
        <Button variant="ghost" onClick={onReminder} className="mt-2 w-full text-xs text-muted-foreground">
          <Bell className="h-4 w-4" /> Morning Vibe reminder
        </Button>

        {notice && <p aria-live="polite" className="mt-2 rounded-xl border border-glass-border px-3 py-2 text-center text-xs">{notice}</p>}
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Today's vibe used {shaped} on this device{activity.sharedToday ? " · shared today" : ""}. Refreshes at midnight.</p>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">Entertainment reading · not a measured personality or campus ranking.</p>
      </section>

      {/* off-screen 9:16 story canvas (360×640 → exported at 1080×1920) */}
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={storyRef} className="aura-scope aura-overlay relative flex h-[640px] w-[360px] flex-col items-center justify-center gap-3 px-6">
          <AuraCardView card={card} username={username} prime={state.profile.prime} live={live} palette={palette} streak={streak} still sticker={stickerText} className="w-[300px]" />
          <p className="whitespace-nowrap text-center text-[13px] font-semibold">Beat my Aura ➔ <span className="aura-brand">VYZUN</span></p>
        </div>
      </div>

      {story && (
        <div role="dialog" aria-modal="true" aria-label="Story preview" className="aura-overlay fixed inset-0 z-[65] flex flex-col items-center justify-center gap-4 p-5">
          <div className="flex w-full max-w-xs items-center justify-between">
            <p className="font-display text-base font-bold">Story preview · 9:16</p>
            <Button variant="ghost" size="icon" onClick={() => setStory(null)} aria-label="Close preview"><X className="h-5 w-5" /></Button>
          </div>
          <img src={story.dataUrl} alt="Your Aura story preview" className="max-h-[62dvh] rounded-2xl shadow-[var(--glow-neon)]" />
          <div className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-3">
            <button onClick={onShareNow} disabled={busy !== null} className="aura-cta-story flex h-12 items-center justify-center gap-2 rounded-full font-display font-bold disabled:opacity-60">
              <Share2 className="h-4 w-4" /> {busy === "share" ? "Opening…" : "Share now"}
            </button>
            <button onClick={onSave} disabled={busy !== null} className="aura-cta-save flex h-12 items-center justify-center gap-2 rounded-full px-5 font-display font-bold disabled:opacity-60">
              <Download className="h-4 w-4" /> Save
            </button>
          </div>
          <p className="max-w-xs text-center text-[11px] text-muted-foreground">Pick Instagram or Snapchat in the share menu. Your link is copied — paste it into the app's link sticker.</p>
          {notice && <p aria-live="polite" className="max-w-xs text-center text-xs">{notice}</p>}
        </div>
      )}

      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
    </div>
  );
}
