import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Bookmark, Flame, Gift, Heart, MessageSquare, Music2, Plus, Repeat2, Share2, ShoppingBag, Swords, Video, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelStudio } from "@/components/vyzun/ReelStudio";
import { ReelCommerce } from "@/components/vyzun/ReelCommerce";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { ActionDialog } from "@/components/vyzun/ActionDialog";
import { withSponsoredSlots } from "@/lib/reel-ad-engine";
import { useReelFeed } from "@/lib/reel-feed";
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

function ReelsPage() {
  const { reel: targetReel } = Route.useSearch();
  const { session } = useVyzunSession();
  const cache = useQueryClient();
  const feed = useReelFeed("For You", session?.user.id, false, targetReel);
  useEffect(() => { if (targetReel && feed.data?.length) document.getElementById(`reel-${targetReel}`)?.scrollIntoView({ block: "start" }); }, [targetReel, feed.data]);
  const [studio, setStudio] = useState(false);
  const [products, setProducts] = useState(false);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState<string | null>(null);
  const [ended, setEnded] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
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
    } catch { setLiked(value => ({ ...value, [id]: previous })); status("Reaction not saved", "The connection failed. Your reaction was rolled back."); }
    finally { setSaving(value => ({ ...value, [id]: false })); }
  }
  async function share(id: string) {
    const url = new URL("/reels", window.location.origin); url.searchParams.set("reel", id);
    try { if (navigator.share) await navigator.share({ title: "VYZUN Reel", url: url.href }); else { await navigator.clipboard.writeText(url.href); status("Link copied", "Your Reel link is ready to share."); } } catch { status("Share cancelled", "No story was posted."); }
  }
  return <div className="fixed inset-0 flex flex-col bg-background">
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 py-3">
      <Button onClick={() => setStudio(true)} className="pointer-events-auto h-9 shrink-0 bg-gradient-vyzun px-3 text-xs shadow-[var(--glow-neon)]"><Plus />Create Reel</Button>
    </header>
    <main className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain pb-24">
      {!feed.data?.length && <section className="relative h-[calc(100dvh-4.5rem)] w-full snap-start overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-background" />
        <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-3 px-16 text-center"><Video className="h-12 w-12 text-cyan" /><h1 className="font-display text-lg">{feed.isLoading ? "Loading Reels…" : feed.isError ? "Reels are on the way" : "No published Reels yet"}</h1>{feed.isLoading ? <div role="status" className="h-2 w-40 animate-pulse rounded-full bg-muted" /> : feed.isError ? <><p className="text-xs text-muted-foreground">Still connecting to live Reels.</p><Button variant="ghost" className="h-7 text-xs text-cyan" onClick={() => void feed.refetch()}>Refresh</Button></> : <p className="text-xs text-muted-foreground">Be the first — tap Create Reel.</p>}</div>
        <div className="absolute inset-x-0 bottom-4 grid grid-cols-[minmax(0,1fr)_44px] items-end gap-3 px-4">
          <div className="min-w-0 space-y-2"><div className="flex items-center gap-2"><span className="squircle-glow h-9 w-9 shrink-0 overflow-hidden bg-muted" /><span className="truncate font-semibold text-muted-foreground">@creator</span><Button variant="outline" className="anim-pulse-neon h-7 shrink-0 bg-gradient-secret px-2 text-xs text-primary-foreground shadow-[var(--glow-neon)]" onClick={() => status("Vibe With", "Vibe With unlocks when a creator’s Reel is live.")}>+ Vibe With</Button></div><p className="text-sm text-muted-foreground">Caption appears here</p><p className="text-xs text-cyan">#vyzunaura</p><Button variant="outline" className="h-auto border-cyan/40 bg-background/70 px-2 py-2 text-xs" onClick={() => setProducts(true)}><ShoppingBag />Affiliate creator picks</Button><p className="flex items-center gap-1 text-xs text-muted-foreground"><Music2 className="h-3 w-3 shrink-0 anim-spin-slow" />Original audio</p></div>
          <aside className="flex flex-col items-center gap-1 rounded-lg border border-cyan/30 bg-background/60 py-2 backdrop-blur-md" aria-label="Reel actions">
            <Button variant="ghost" size="icon" aria-label="Like" onClick={() => status("Like", "Likes open when a published Reel is on screen.")}><Heart className="text-magenta drop-shadow-[0_0_6px_rgba(236,72,153,0.55)]" /></Button>
            <Button variant="ghost" size="icon" aria-label="Comments" onClick={() => status("Comments", "Moderated Reel comments are not connected yet.")}><MessageSquare className="text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" /></Button>
            <Button variant="ghost" size="icon" aria-label="Flame & Aura Boost" onClick={() => status("Flame & Aura Boost", "Boosts need a live Reel. No points were issued.")}><Flame className="text-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.55)]" /></Button>
            <Button variant="ghost" size="icon" aria-label="Vibe Clash" onClick={() => status("Vibe Clash", "A duel requires both participants’ consent. No match was created.")}><Swords className="text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" /></Button>
            <Button variant="ghost" size="icon" aria-label="Share Reel" onClick={() => status("Share", "Sharing opens once a Reel is published.")}><Share2 className="text-cyan" /></Button>
          </aside>
        </div>
      </section>}
      {withSponsoredSlots(feed.data ?? []).map(item => item.kind === "ad" ? <section key={`ad-${item.slot}`} data-sponsored-slot={item.slot} className="flex h-[calc(100dvh-4.5rem)] snap-start flex-col items-center justify-center gap-4 bg-background px-6 pb-24 pt-28 text-center"><span className="text-xs text-gold">Sponsored · House promotion</span><Megaphone className="h-12 w-12 text-cyan" /><h2 className="font-display text-xl">VYZUN for brands</h2><Button onClick={() => setPaid({ title: "Native Reel Sponsorship", price: "Custom campaign quote", description: "External sponsored inventory and rewarded payouts are not connected. No cash reward is issued." })}>Explore sponsorship</Button></section> : <section id={`reel-${item.reel.id}`} key={item.reel.id} className="relative h-[calc(100dvh-4.5rem)] w-full snap-start overflow-hidden bg-background">
        <video src={item.reel.video_url ?? undefined} poster={item.reel.thumbnail_url ?? undefined} muted playsInline controls preload="metadata" className="absolute inset-0 h-full w-full object-contain" onEnded={() => setEnded(value => ({ ...value, [item.reel.id]: true }))} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent" />
        {burst === item.reel.id && <span role="status" className="fire-burst pointer-events-none absolute inset-0 m-auto grid h-28 w-28 place-items-center text-6xl">🔥</span>}
        <div className="absolute inset-x-0 bottom-4 grid grid-cols-[minmax(0,1fr)_44px] items-end gap-3 px-4">
          <div className="min-w-0 space-y-2"><div className="flex min-w-0 items-center gap-2"><span className="squircle-glow h-10 w-10 shrink-0 overflow-hidden bg-muted">{item.reel.creator?.avatar_url && <img src={item.reel.creator.avatar_url} alt="" className="h-full w-full object-cover" />}</span><Link to="/profile" search={{ u: item.reel.creator?.username }} className="flex min-w-0 items-center gap-1 truncate font-semibold">@{item.reel.creator?.username ?? "creator"}{item.reel.creator?.is_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan" />}</Link><Button size="sm" className="anim-pulse-neon h-7 shrink-0 bg-gradient-secret px-2 text-xs text-primary-foreground shadow-[var(--glow-neon)]" onClick={() => status("Vibe With", "Vibe With unlocks when a creator’s Reel is live.")}>+ Vibe With</Button></div>{item.reel.creator?.bio && <p className="line-clamp-2 text-xs text-muted-foreground">{item.reel.creator.bio}</p>}<p className="text-sm">{item.reel.caption}</p><p className="text-xs text-cyan">{item.reel.hashtags.join(" ")}</p><Button variant="outline" className="h-auto max-w-full whitespace-normal border-cyan/40 bg-background/70 px-2 py-2 text-xs" onClick={() => setProducts(true)}><ShoppingBag />Affiliate creator picks</Button><p className="flex items-center gap-1 text-xs text-muted-foreground"><Music2 className="h-3 w-3 shrink-0" /><span className="truncate">{item.reel.audio_label ?? "Original audio"}</span></p><p className="text-[10px] text-muted-foreground">{item.reel.views_count.toLocaleString()} views</p></div>
          <aside className="flex flex-col items-center gap-1 rounded-lg border border-cyan/30 bg-background/60 py-2 backdrop-blur-md" aria-label="Reel actions">
            <Button variant="ghost" size="icon" aria-label="Like" aria-pressed={!!liked[item.reel.id]} onClick={() => void like(item.reel.id)}><Heart className={cn("drop-shadow-[0_0_6px_rgba(236,72,153,0.55)]", (liked[item.reel.id] ?? false) ? "fill-magenta text-magenta" : "text-magenta")} /></Button>
            <Button variant="ghost" size="icon" title="Flame & Aura Boost" aria-label="Flame & Aura Boost" onClick={() => { setBurst(item.reel.id); window.setTimeout(() => setBurst(null), 800); status("Flame & Aura Boost", "+10 Aura rewards require verified server eligibility. No points were issued."); }}><Flame className="text-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.55)]" /></Button>
            <Button variant="ghost" size="icon" title="Vibe Clash" aria-label="Vibe Clash" onClick={() => status("Vibe Clash", "A duel requires both participants’ shared Aura Cards and consent. No match was created.")}><Swords className="text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" /></Button>
            <Button variant="ghost" size="icon" title="Secret Loot Drop" aria-label="Secret Loot Drop" onClick={() => status("Secret Loot Drop", ended[item.reel.id] ? "Full view completed. No approved reward inventory is available yet." : "Finish watching this Reel to check loot eligibility. No reward has been issued.")}><Gift className="text-magenta drop-shadow-[0_0_6px_rgba(236,72,153,0.55)]" /></Button>
            <Button variant="ghost" size="icon" title="Comments" aria-label="Comments" onClick={() => status("Comments", "Moderated Reel comments are not connected yet.")}><MessageSquare className="text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" /></Button>
            <Button variant="ghost" size="icon" title="ReVibe" aria-label="ReVibe" onClick={() => void share(item.reel.id)}><Repeat2 /></Button>
            <Button variant="ghost" size="icon" title="Remix" aria-label="Remix" onClick={() => status("Remix", "Creator remix permission and licensed source media are required before remixing.")}><Plus /></Button>
            <Button variant="ghost" size="icon" title="Save on this visit" aria-label="Save Reel" aria-pressed={bookmarks.includes(item.reel.id)} onClick={() => setBookmarks(value => value.includes(item.reel.id) ? value.filter(id => id !== item.reel.id) : [...value, item.reel.id])}><Bookmark className={cn(bookmarks.includes(item.reel.id) && "fill-cyan text-cyan")} /></Button>
            <Button variant="ghost" size="icon" title="Story / Snapchat share" aria-label="Share Reel" onClick={() => void share(item.reel.id)}><Share2 /></Button>
          </aside>
        </div>
      </section>)}
    </main>
    <ReelStudio open={studio} onClose={() => setStudio(false)} /><ReelCommerce open={products} onClose={() => setProducts(false)} /><PaidActionSheet action={paid} onClose={() => setPaid(null)} /><ActionDialog title={notice?.title ?? null} description={notice?.text} onClose={() => setNotice(null)} />
  </div>;
}
