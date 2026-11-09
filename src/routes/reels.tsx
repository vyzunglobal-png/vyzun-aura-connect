import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Download, Flame, Heart, Megaphone, MessageSquare, Music2, Plus, Search, ShoppingBag, Swords, Video, Share2, Copy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelStudio } from "@/components/vyzun/ReelStudio";
import { ReelCommerce } from "@/components/vyzun/ReelCommerce";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  if (n >= 1_000) return n.toLocaleString("en-US");
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
  const [shareTarget, setShareTarget] = useState<{ id: string; videoUrl?: string | null } | null>(null);
  const [downloading, setDownloading] = useState(false);
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

  function reelLink(id: string) {
    const url = new URL("/reels", window.location.origin);
    url.searchParams.set("reel", id);
    return url.href;
  }

  async function shareReel(id: string) {
    try {
      if (navigator.share) await navigator.share({ title: "VYZUN Reel", url: reelLink(id) });
      else { await navigator.clipboard.writeText(reelLink(id)); status("Link copied", "Your Reel link is ready to share."); }
      setShareTarget(null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) status("Could not share", "Try copying the Reel link instead.");
    }
  }

  async function downloadReel(id: string, videoUrl?: string | null) {
    if (!videoUrl || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Download unavailable");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `vyzun-reel-${id}.mp4`;
      document.body.appendChild(a);
      a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      setShareTarget(null);
      status("Download started", "Your browser will save the video to your device’s downloads.");
    } catch { status("Download unavailable", "The video could not be downloaded. You can still share or copy its link."); }
    finally { setDownloading(false); }
  }

  const reels = feed.data ?? [];

  return (
    <div className="reels-stage fixed inset-0 flex flex-col">
      <div aria-hidden className="reels-cosmos pointer-events-none absolute inset-0" />
      <header className="reels-header absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 py-3">
        <Button variant="ghost" size="icon" aria-label="Search Reels" title="Search Reels" className="reel-search h-9 w-9 shrink-0 rounded-full" onClick={() => status("Search", "Reel search is not connected yet.")}><Search className="size-5" /></Button>
        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1.5" aria-label="Reel categories">
          {TABS.map(tab => <Button key={tab.key} variant="reelCategory" aria-pressed={category === tab.key} onClick={() => setCategory(tab.key)} className="shrink-0 gap-1">
            {tab.flame && <Flame className="fill-gold text-gold" />}{tab.label}
          </Button>)}
        </nav>
        <Button variant="reelCreate" size="icon" onClick={() => setStudio(true)} aria-label="Create Reel" title="Create Reel" className="h-10 w-10 shrink-0 rounded-full p-0"><Plus className="size-5" /></Button>
      </header>

      <main className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain pb-24">
        {!reels.length && (
          <section className="relative h-[calc(100dvh-4.5rem)] w-full snap-start overflow-hidden">
            <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-3 px-16 text-center">
              <Video className="h-12 w-12 text-cyan" />
              <h1 className="font-display text-lg">{feed.isLoading ? "Loading Reels…" : feed.isError ? "Reels are on the way" : category === "Vibe With" && !session ? "Sign in to see Reels from people you vibe with" : "No published Reels yet"}</h1>
              {feed.isLoading ? <div role="status" className="h-2 w-40 animate-pulse rounded-full bg-muted" /> : feed.isError ? <><p className="text-xs text-muted-foreground">Still connecting to live Reels.</p><Button variant="ghost" className="h-7 text-xs text-cyan" onClick={() => void feed.refetch()}>Refresh</Button></> : <p className="text-xs text-muted-foreground">Be the first — tap + to create a Reel.</p>}
            </div>
          </section>
        )}

        {withSponsoredSlots(reels).map(item => item.kind === "ad" ? (
          <section key={`ad-${item.slot}`} data-sponsored-slot={item.slot} className="relative flex h-[calc(100dvh-4.5rem)] snap-start flex-col items-center justify-center gap-4 px-6 pb-24 pt-28 text-center">
            <span className="text-xs text-gold">Sponsored · House promotion</span>
            <Megaphone className="h-12 w-12 text-cyan" />
            <h2 className="font-display text-xl">VYZUN for brands</h2>
            <Button onClick={() => setPaid({ title: "Native Reel Sponsorship", price: "Custom campaign quote", description: "External sponsored inventory and rewarded payouts are not connected. No cash reward is issued." })}>Explore sponsorship</Button>
          </section>
        ) : (
          <section id={`reel-${item.reel.id}`} key={item.reel.id} className="relative h-[calc(100dvh-4.5rem)] w-full snap-start overflow-hidden">
            <video src={item.reel.video_url ?? undefined} poster={item.reel.thumbnail_url ?? undefined} muted playsInline controls preload="metadata" className="absolute inset-0 h-full w-full object-contain" />
            <div className="reel-scrim pointer-events-none absolute inset-x-0 bottom-0 h-2/3" />
            {burst === item.reel.id && <span role="status" className="fire-burst pointer-events-none absolute inset-0 m-auto grid h-28 w-28 place-items-center text-6xl">🔥</span>}

            <div className="absolute inset-x-0 bottom-4 grid grid-cols-[minmax(0,1fr)_56px] items-end gap-3 px-4">
              {/* Creator row + caption */}
              <div className="min-w-0 space-y-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="reel-portrait h-11 w-11 shrink-0">
                    <span className="reel-portrait-inner">{item.reel.creator?.avatar_url ? <img src={item.reel.creator.avatar_url} alt="Creator portrait" className="h-full w-full object-cover" /> : <UserRound className="size-6" />}</span>
                  </span>
                  <Link to="/profile" search={{ u: item.reel.creator?.username }} className="flex min-w-0 items-center gap-1 font-semibold text-sm"><span className="truncate">
                    @{item.reel.creator?.username ?? "creator"}
                    </span>{item.reel.creator?.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan" />}
                  </Link>
                  <Button variant="reelVibe" size="sm" className="h-8 shrink-0 rounded-full px-3 text-xs font-bold" onClick={() => status("Vibe With", "Creator connections are not available from Reels yet.")}>
                    + Vibe With
                  </Button>
                </div>
                <p className="reel-caption line-clamp-3 text-sm">{item.reel.caption}</p>
                {!!item.reel.hashtags.length && <p className="reel-caption line-clamp-2 text-xs font-semibold text-cyan">{item.reel.hashtags.join(" ")}</p>}
                <Button variant="outline" className="h-auto max-w-full whitespace-normal border-cyan/40 bg-background/70 px-2 py-2 text-xs" onClick={() => setProducts(true)}><ShoppingBag />Affiliate creator picks</Button>
                <p className="flex items-center gap-1 text-xs opacity-80"><Music2 className="h-3 w-3 shrink-0 anim-spin-slow" /><span className="truncate">{item.reel.audio_label ?? "Original audio"}</span></p>
              </div>

              {/* Engagement sidebar — bold, glowing, with counts */}
              <aside className="flex flex-col items-center gap-3" aria-label="Reel actions">
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="reelAction" size="icon" aria-label="Like" aria-pressed={!!liked[item.reel.id]} onClick={() => void like(item.reel.id)} className="reel-action-heart">
                    <Heart className="fill-current" />
                  </Button>
                  <span className="reel-count">{likeCounts.isSuccess ? formatCount(likeCounts.data[item.reel.id] ?? 0) : "—"}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="reelAction" size="icon" title="Flame & Aura Boost" aria-label="Flame & Aura Boost" onClick={() => { setBurst(item.reel.id); window.setTimeout(() => setBurst(null), 800); status("Flame & Aura Boost", "+10 Aura rewards require verified server eligibility. No points were issued."); }} className="reel-action-fire">
                    <Flame className="fill-current" />
                  </Button>
                  <span className="reel-count"><span aria-label="Boost count unavailable">—</span></span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="reelAction" size="icon" title="Comments" aria-label="Comments" onClick={() => status("Comments", "Moderated Reel comments are not connected yet.")} className="reel-action-comment">
                    <MessageSquare className="fill-current" />
                  </Button>
                  <span className="reel-count" aria-label="Count unavailable">—</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="reelAction" size="icon" title="Vibe Clash" aria-label="Vibe Clash" onClick={() => status("Vibe Clash", "A duel requires both participants’ shared Aura Cards and consent. No match was created.")} className="reel-action-clash">
                    <Swords className="" />
                  </Button>
                  <span className="reel-count" aria-label="Count unavailable">—</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="reelAction" size="icon" title="Share / Save" aria-label="Share or save Reel" onClick={() => setShareTarget({ id: item.reel.id, videoUrl: item.reel.video_url })} className="reel-action-share">
                    <Share2 />
                  </Button>
                  <span className="reel-count whitespace-nowrap !text-[10px]">Share / Save</span>
                </div>
              </aside>
            </div>
          </section>
        ))}
      </main>

      <Dialog open={!!shareTarget} onOpenChange={open => { if (!open) setShareTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Share / Save</DialogTitle><DialogDescription>VYZUN Reel</DialogDescription></DialogHeader>
          <Button variant="linkShare" onClick={() => { if (shareTarget) void shareReel(shareTarget.id); }}><Share2 />Share Reel</Button>
          <Button variant="outline" disabled={downloading || !shareTarget?.videoUrl} onClick={() => { if (shareTarget) void downloadReel(shareTarget.id, shareTarget.videoUrl); }}><Download />{downloading ? "Downloading…" : "Download video"}</Button>
          <Button variant="ghost" onClick={async () => { if (!shareTarget) return; try { await navigator.clipboard.writeText(reelLink(shareTarget.id)); setShareTarget(null); status("Link copied", "Your Reel link is ready to share."); } catch { status("Could not copy", "Try Share Reel instead."); } }}><Copy />Copy link</Button>
        </DialogContent>
      </Dialog>
      <ReelStudio open={studio} onClose={() => setStudio(false)} />
      <ReelCommerce open={products} onClose={() => setProducts(false)} />
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
      <ActionDialog title={notice?.title ?? null} description={notice?.text} onClose={() => setNotice(null)} />
    </div>
  );
}
