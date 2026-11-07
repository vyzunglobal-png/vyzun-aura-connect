import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Download, Flame, Heart, Megaphone, MessageSquare, Music2, Plus, Search, ShoppingBag, Swords, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelStudio } from "@/components/vyzun/ReelStudio";
import { ReelCommerce } from "@/components/vyzun/ReelCommerce";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { ActionDialog } from "@/components/vyzun/ActionDialog";
import { withSponsoredSlots } from "@/lib/reel-ad-engine";
import { useReelFeed, type ReelCategory } from "@/lib/reel-feed";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reels")({
  validateSearch: (search: Record<string, unknown>): { reel?: string } => typeof search['reel'] === "string" && /^[a-f0-9-]{36}$/i.test(search['reel']) ? { reel: search['reel'] } : {},
  head: () => ({
    meta: [
      { title: "VYZUN Reels — Vertical Video Feed" },
      {
        name: "description",
        content:
          "Watch full-screen vertical reels on VYZUN, vibe with creators and build your audience. Comedy, trending and more.",
      },
      { property: "og:title", content: "VYZUN Reels — Vertical Video Feed" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Full-screen vertical video, VYZUN reactions and creator discovery.",
      },
    ],
  }),
  component: ReelsPage,
});

const TABS: { key: ReelCategory; label: string; flame?: boolean }[] = [
  { key: "For You", label: "For You", flame: true },
  { key: "Vibe With", label: "Vibe With" },
  { key: "Trending", label: "Trending" },
];

/** Real like counts per reel from reel_reactions. */
function useReelLikeCounts(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["reel-like-counts", key],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("reel_reactions").select("reel_id").in("reel_id", ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.reel_id] = (counts[row.reel_id] ?? 0) + 1;
      return counts;
    },
  });
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ReelsPage() {
  const { reel: targetReel } = Route.useSearch();
  const { session } = useVyzunSession();
  const cache = useQueryClient();
  const [category, setCategory] = useState<ReelCategory>("For You");
  const feed = useReelFeed(category, session?.user.id, false, targetReel);
  useEffect(() => { if (targetReel && feed.data?.length) document.getElementById(`reel-${targetReel}`)?.scrollIntoView({ block: "start" }); }, [targetReel, feed.data]);
  const likeCounts = useReelLikeCounts((feed.data ?? []).map(r => r.id));
  const [studio, setStudio] = useState(false);
  const [products, setProducts] = useState(false);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState<string | null>(null);
  const status = (title: string, text: string) => setNotice({ title, text });

  async function like(id: string) {
    if (!session) { status("Sign in", "Sign in to react to a Reel."); return; }
    if (saving[id]) return;
    const previous = liked[id] ?? false;
    setLiked(value => ({ ...value, [id]: !previous })); setSaving(value => ({ ...value, [id]: true }));
    try {
      const { error } = previous ? await supabase.from("reel_reactions").delete().eq("reel_id", id).eq("user_id", session.user.id) : await supabase.from("reel_reactions").upsert({ reel_id: id, user_id: session.user.id, reaction: "vibe" }, { onConflict: "reel_id,user_id" });
      if (error) throw error;
      void cache.invalidateQueries({ queryKey: ["reel-reactions", id] });
      void cache.invalidateQueries({ queryKey: ["reel-like-counts"] });
    } catch { setLiked(value => ({ ...value, [id]: previous })); status("Reaction not saved", "The connection failed. Your reaction was rolled back."); }
    finally { setSaving(value => ({ ...value, [id]: false })); }
  }

  async function shareOrSave(id: string, videoUrl?: string | null) {
    const url = new URL("/reels", window.location.origin); url.searchParams.set("reel", id);
    if (navigator.share) {
      try { await navigator.share({ title: "VYZUN Reel", url: url.href }); return; } catch { return; }
    }
    if (videoUrl) {
      try {
        const blob = await (await fetch(videoUrl)).blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `vyzun-reel-${id}.mp4`;
        a.click();
        URL.revokeObjectURL(a.href);
        status("Saved", "The Reel was downloaded to your device.");
        return;
      } catch { /* fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url.href); status("Link copied", "Your Reel link is ready to share."); } catch { status("Share cancelled", "No story was posted."); }
  }

  const reels = feed.data ?? [];

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Seamless cosmic ambience — no boxed sections */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_-10%,oklch(0.45_0.22_292/45%),transparent_60%),radial-gradient(90%_50%_at_90%_110%,oklch(0.5_0.2_220/35%),transparent_60%),radial-gradient(70%_40%_at_0%_100%,oklch(0.5_0.24_330/30%),transparent_65%)]" />

      {/* Top header: search, glowing category pills, create button */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 py-3">
        <Button variant="ghost" size="icon" aria-label="Search Reels" className="h-10 w-10 shrink-0 rounded-full text-foreground drop-shadow-[0_0_8px_oklch(0.79_0.16_203/60%)]" onClick={() => status("Search", "Reel search is not connected yet.")}>
          <Search className="h-5 w-5" />
        </Button>
        <nav className="flex min-w-0 flex-1 items-center justify-center gap-2" aria-label="Reel categories">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              aria-pressed={category === tab.key}
              className={cn(
                "shrink-0 rounded-full p-[1.5px] transition-all tap active:tap-active",
                category === tab.key
                  ? "bg-gradient-secret shadow-[0_0_18px_-2px_oklch(0.65_0.28_330/70%),0_0_24px_-4px_oklch(0.58_0.26_292/60%)]"
                  : "bg-[linear-gradient(120deg,oklch(0.58_0.26_292/45%),oklch(0.79_0.16_203/45%))] opacity-80"
              )}
            >
              <span className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                category === tab.key ? "bg-background/80 text-foreground" : "bg-background/60 text-muted-foreground"
              )}>
                {tab.flame && <Flame className="h-3.5 w-3.5 text-gold drop-shadow-[0_0_6px_oklch(0.8_0.17_80/80%)]" />}
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
        <Button onClick={() => setStudio(true)} aria-label="Create Reel" className="h-10 w-10 shrink-0 rounded-full bg-gradient-vyzun p-0 shadow-[0_0_20px_-2px_oklch(0.58_0.26_292/80%),0_0_28px_-4px_oklch(0.79_0.16_203/60%)]">
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <main className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain pb-24">
        {!reels.length && (
          <section className="relative h-[calc(100dvh-4.5rem)] w-full snap-start overflow-hidden">
            <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-3 px-16 text-center">
              <Video className="h-12 w-12 text-cyan drop-shadow-[0_0_12px_oklch(0.79_0.16_203/70%)]" />
              <h1 className="font-display text-lg">{feed.isLoading ? "Loading Reels…" : feed.isError ? "Reels are on the way" : category === "Vibe With" && !session ? "Sign in to see Reels from people you vibe with" : "No published Reels yet"}</h1>
              {feed.isLoading ? <div role="status" className="h-2 w-40 animate-pulse rounded-full bg-muted" /> : feed.isError ? <><p className="text-xs text-muted-foreground">Still connecting to live Reels.</p><Button variant="ghost" className="h-7 text-xs text-cyan" onClick={() => void feed.refetch()}>Refresh</Button></> : <p className="text-xs text-muted-foreground">Be the first — tap + to create a Reel.</p>}
            </div>
          </section>
        )}

        {withSponsoredSlots(reels).map(item => item.kind === "ad" ? (
          <section key={`ad-${item.slot}`} data-sponsored-slot={item.slot} className="relative flex h-[calc(100dvh-4.5rem)] snap-start flex-col items-center justify-center gap-4 px-6 pb-24 pt-28 text-center">
            <span className="text-xs text-gold">Sponsored · House promotion</span>
            <Megaphone className="h-12 w-12 text-cyan drop-shadow-[0_0_12px_oklch(0.79_0.16_203/70%)]" />
            <h2 className="font-display text-xl">VYZUN for brands</h2>
            <Button onClick={() => setPaid({ title: "Native Reel Sponsorship", price: "Custom campaign quote", description: "External sponsored inventory and rewarded payouts are not connected. No cash reward is issued." })}>Explore sponsorship</Button>
          </section>
        ) : (
          <section id={`reel-${item.reel.id}`} key={item.reel.id} className="relative h-[calc(100dvh-4.5rem)] w-full snap-start overflow-hidden">
            <video src={item.reel.video_url ?? undefined} poster={item.reel.thumbnail_url ?? undefined} muted playsInline controls preload="metadata" className="absolute inset-0 h-full w-full object-contain" onEnded={() => setEndedFlag(item.reel.id)} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent" />
            {burst === item.reel.id && <span role="status" className="fire-burst pointer-events-none absolute inset-0 m-auto grid h-28 w-28 place-items-center text-6xl">🔥</span>}

            <div className="absolute inset-x-0 bottom-4 grid grid-cols-[minmax(0,1fr)_56px] items-end gap-3 px-4">
              {/* Creator row + caption */}
              <div className="min-w-0 space-y-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="squircle-glow h-11 w-11 shrink-0 overflow-hidden bg-muted">
                    {item.reel.creator?.avatar_url && <img src={item.reel.creator.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <Link to="/profile" search={{ u: item.reel.creator?.username }} className="flex min-w-0 items-center gap-1 truncate font-semibold">
                    @{item.reel.creator?.username ?? "creator"}
                    {item.reel.creator?.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan" />}
                  </Link>
                  <Button size="sm" className="anim-pulse-neon h-8 shrink-0 rounded-full bg-gradient-secret px-3 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-2px_oklch(0.65_0.28_330/80%),0_0_26px_-4px_oklch(0.58_0.26_292/70%)]" onClick={() => status("Vibe With", "Vibe With unlocks when a creator’s Reel is live.")}>
                    + Vibe With
                  </Button>
                </div>
                <p className="text-sm">{item.reel.caption}</p>
                {!!item.reel.hashtags.length && <p className="text-xs font-semibold text-cyan drop-shadow-[0_0_6px_oklch(0.79_0.16_203/60%)]">{item.reel.hashtags.join(" ")}</p>}
                <Button variant="outline" className="h-auto max-w-full whitespace-normal border-cyan/40 bg-background/70 px-2 py-2 text-xs" onClick={() => setProducts(true)}><ShoppingBag />Affiliate creator picks</Button>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Music2 className="h-3 w-3 shrink-0 anim-spin-slow" /><span className="truncate">{item.reel.audio_label ?? "Original audio"}</span></p>
              </div>

              {/* Engagement sidebar — bold, glowing, with counts */}
              <aside className="flex flex-col items-center gap-4" aria-label="Reel actions">
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="ghost" size="icon" aria-label="Like" aria-pressed={!!liked[item.reel.id]} onClick={() => void like(item.reel.id)} className="h-11 w-11">
                    <Heart className={cn("h-7 w-7 drop-shadow-[0_0_10px_oklch(0.65_0.28_15/70%)]", (liked[item.reel.id] ?? false) ? "fill-destructive text-destructive" : "text-foreground")} />
                  </Button>
                  <span className="text-xs font-bold text-foreground drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">{formatCount(likeCounts.data?.[item.reel.id] ?? 0)}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="ghost" size="icon" title="Flame & Aura Boost" aria-label="Flame & Aura Boost" onClick={() => { setBurst(item.reel.id); window.setTimeout(() => setBurst(null), 800); status("Flame & Aura Boost", "+10 Aura rewards require verified server eligibility. No points were issued."); }} className="h-11 w-11">
                    <Flame className="h-7 w-7 fill-gold/30 text-gold drop-shadow-[0_0_10px_oklch(0.8_0.17_80/80%)]" />
                  </Button>
                  <span className="text-xs font-bold text-foreground drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">{formatCount(item.reel.views_count)}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="ghost" size="icon" title="Comments" aria-label="Comments" onClick={() => status("Comments", "Moderated Reel comments are not connected yet.")} className="h-11 w-11">
                    <MessageSquare className="h-7 w-7 text-cyan drop-shadow-[0_0_10px_oklch(0.79_0.16_203/80%)]" />
                  </Button>
                  <span className="text-xs font-bold text-foreground drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">0</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="ghost" size="icon" title="Vibe Clash" aria-label="Vibe Clash" onClick={() => status("Vibe Clash", "A duel requires both participants’ shared Aura Cards and consent. No match was created.")} className="h-11 w-11">
                    <Swords className="h-7 w-7 text-[oklch(0.65_0.28_292)] drop-shadow-[0_0_10px_oklch(0.58_0.26_292/80%)]" />
                  </Button>
                  <span className="text-xs font-bold text-foreground drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">0</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="ghost" size="icon" title="Share / Save" aria-label="Share or save Reel" onClick={() => void shareOrSave(item.reel.id, item.reel.video_url)} className="h-11 w-11">
                    <Download className="h-7 w-7 text-cyan drop-shadow-[0_0_12px_oklch(0.79_0.16_203/90%)]" />
                  </Button>
                  <span className="text-[10px] font-bold text-foreground drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">Share / Save</span>
                </div>
              </aside>
            </div>
          </section>
        ))}
      </main>

      <ReelStudio open={studio} onClose={() => setStudio(false)} />
      <ReelCommerce open={products} onClose={() => setProducts(false)} />
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
      <ActionDialog title={notice?.title ?? null} description={notice?.text} onClose={() => setNotice(null)} />
    </div>
  );

  function setEndedFlag(id: string) {
    setEnded(value => ({ ...value, [id]: true }));
  }
}
