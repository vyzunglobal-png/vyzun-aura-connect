import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Camera,
  Crown,
  MessageCircle,
  QrCode,
  Settings,
  Sparkles,
  Wallet2,
  Gem,
  Plane,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelStudio } from "@/components/vyzun/ReelStudio";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { useVyzun } from "@/lib/vyzun-store";
import { CreatorDashboardSheet } from "@/components/vyzun/CreatorDashboardSheet";
import { PrimeSheet } from "@/components/vyzun/PrimeSheet";
import { SettingsSheet } from "@/components/vyzun/SettingsSheet";
import { VibeWithButton } from "@/components/vyzun/VibeWithButton";
import { QRCodeSVG } from "qrcode.react";
import { ActionDialog } from "@/components/vyzun/ActionDialog";
import { secretDropLink } from "@/lib/vyzun-links";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>) => ({
    u: typeof search['u'] === "string" && search['u'].trim() ? String(search['u']).trim().slice(0, 30) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your VYZUN Profile — Vibers, Reels & Creator Tools" },
      {
        name: "description",
        content:
          "Manage your VYZUN identity: Vibers, Vibing, Reels, Aura Cards, Scan history, Prime and the Creator Dashboard.",
      },
      { property: "og:title", content: "Your VYZUN Profile" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Vibers, Reels, Aura Cards, Prime and real-money creator earnings on VYZUN.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state } = useVyzun();
  const { u } = Route.useSearch();
  const [tab, setTab] = useState<"posts" | "reels" | "aura">("posts");
  const [sheet, setSheet] = useState<null | "prime" | "creator" | "settings">(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLink, setQrLink] = useState("");
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  useEffect(() => { setQrLink(secretDropLink(window.location.origin, u ?? state.profile.username)); }, [state.profile.username, u]);
  const p = state.profile;
  const isSelf = !u || u.toLowerCase() === p.username.toLowerCase();
  const viewedName = isSelf ? p.displayName : (u ?? p.username);
  const viewedHandle = isSelf ? p.username : (u ?? p.username);

  return (
    <div className="pb-28">
      <header className="mx-auto max-w-lg px-5 pt-6">
        {!isSelf && (
          <Link to="/profile" search={{ u: undefined }} className="text-xs text-muted-foreground tap active:tap-active">
            ← Back to your profile
          </Link>
        )}
        <div className="mt-2 flex items-center gap-4">
          <div className="relative">
            <span className="profile-squircle grid h-20 w-20 place-items-center rounded-3xl border-2 border-cyan bg-gradient-vyzun text-2xl font-bold text-primary-foreground">{viewedHandle[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-1.5 truncate text-xl font-semibold">
              {viewedName}
              {isSelf && p.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-cyan" />}
            </h1>
            <p className="text-sm text-muted-foreground">@{viewedHandle}</p>
            {isSelf && <p className="mt-1 text-sm">{p.bio}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Vibers", value: isSelf ? p.vibers : "—" },
            { label: "Vibing", value: isSelf ? p.vibing : "—" },
            { label: "Aura Cards", value: isSelf ? state.auraCards.length : "—" },
          ].map((s) => (
            <div key={s.label} className="glass-card py-3">
              <p className="font-display text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {isSelf ? (
            <Button variant="outline" onClick={() => setSheet("settings")} className="h-11 flex-1">
              Edit Profile
            </Button>
          ) : (
            <>
              <VibeWithButton username={viewedHandle} />
              <Button asChild variant="outline" className="flex min-w-0 flex-1"><Link to="/messages">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">Message</span>
              </Link></Button>
            </>
          )}
          <Button variant="outline" onClick={() => setQrOpen(true)}
            aria-label="Share QR"
            className="grid w-11 shrink-0 place-items-center rounded-xl border border-glass-border tap active:tap-active"
          >
            <QrCode className="h-4 w-4" />
          </Button>
          {isSelf && (
            <Button variant="outline"
              onClick={() => setSheet("settings")}
              aria-label="Settings"
              className="grid w-11 shrink-0 place-items-center rounded-xl border border-glass-border tap active:tap-active"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>


        {isSelf && <div className="mt-4 space-y-2">
          <Button variant="outline" onClick={() => setSheet("prime")} className="h-auto w-full justify-start gap-3 border-magenta/30 bg-glass py-2 text-left"><Crown className="text-gold" /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">VYZUN Platinum Pass</span><span className="block text-[10px] text-muted-foreground">$19.99 – $49.99/mo</span></span></Button>
          <Button variant="outline" onClick={() => setSheet("creator")} className="h-auto w-full justify-start gap-3 border-cyan/30 bg-glass py-2 text-left"><Wallet2 className="text-cyan" /><span><span className="block text-xs font-semibold">Creator Dashboard</span><span className="block text-[10px] text-muted-foreground">Missions · earnings · analytics</span></span></Button>
        </div>}
      </header>

      <main className="mx-auto mt-6 max-w-lg px-5">
        <section className="mb-5 border-y border-glass-border py-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Crown className="h-5 w-5 text-gold" />Luxury Trophy Cabinet</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[{ name: "Virtual Crown", price: "$49", icon: Crown }, { name: "Private Jet", price: "$199", icon: Plane }, { name: "Diamond Aura", price: "$499", icon: Gem }].map(({ name, price, icon: Icon }) => <Button key={name} variant="outline"
              onClick={() => setPaid({ title: name, price, description: `Send a ${name} digital gift to an eligible creator. No physical item. Gifts appear only after verified payment.` })}
              className="h-auto min-h-20 flex-col whitespace-normal border-cyan/30 bg-gradient-vyzun px-2 py-2 text-center">
              <Icon className="mb-1 text-primary-foreground !size-6" /><span className="text-[10px] text-primary-foreground">{name}</span>
            </Button>)}
          </div>
        </section>
        <div className="flex gap-2">
          {(["posts", "reels", "aura"] as const).map((t) => (
            <Button variant="outline"
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-xl border border-glass-border py-2 text-sm capitalize tap active:tap-active",
                tab === t && "bg-gradient-vyzun text-primary-foreground",
              )}
            >
              {t === "aura" ? "Aura Cards" : t === "posts" ? "Posts" : "Reels"}
            </Button>
          ))}
        </div>

        {tab === "posts" && <div className="flex flex-col items-center gap-3 py-8 text-center"><MessageCircle className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">Your public posts live in Vibe Feed.</p><Button asChild className="bg-gradient-vyzun"><Link to="/secrets" search={{}}>Open Vibe Feed</Link></Button></div>}

        {tab === "reels" && (
          <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
            <Video className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">Your first Reel starts here.</p>
            <Button className="bg-gradient-vyzun" onClick={() => setStudioOpen(true)}>+ Create Reel</Button>
          </div>
        )}

        {tab === "aura" && (
          <div className="mt-4 space-y-2">
            {state.auraCards.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center"><Sparkles className="h-8 w-8 text-magenta" /><p className="text-sm text-muted-foreground">No Aura Card yet!</p><Button asChild className="bg-gradient-vyzun"><Link to="/">Scan Face Now</Link></Button></div>
            )}
            {state.auraCards.map((c) => (
              <div key={c.id} className="glass-card flex items-center gap-3 p-4">
                <Sparkles className="h-5 w-5 text-magenta" />
                <div>
                  <p className="text-sm font-medium">{c.headline}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.rarity} · score {c.score} · top {c.percentile}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "aura" && state.scans.length > 0 && (
          <div className="mt-4 space-y-2">
            {state.scans.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center"><Camera className="h-8 w-8 text-cyan" /><p className="text-sm text-muted-foreground">No scans yet.</p><Button asChild className="bg-gradient-vyzun"><Link to="/">Start Live Face Scan</Link></Button></div>
            )}
            {state.scans.map((s) => (
              <div key={s.id} className="glass-card flex items-center justify-between p-4 text-sm">
                <span className="capitalize">{s.mode} scan</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

      </main>

      <ActionDialog title={qrOpen ? "Your VYZUN QR" : null} description="Share your anonymous inbox." onClose={() => setQrOpen(false)}>{qrLink && <><div className="mx-auto rounded-lg bg-primary-foreground p-4"><QRCodeSVG value={qrLink} size={200} /></div><p className="text-gradient-secret truncate text-sm font-bold">vyzun.app/ask/@{u ?? state.profile.username}</p><Button onClick={async () => { try { await navigator.clipboard.writeText(qrLink); setQrNotice("Link copied"); } catch { setQrNotice("Copy is unavailable. You can select the link above."); } }}>Copy Link</Button>{qrNotice && <p role="status" className="text-xs text-cyan">{qrNotice}</p>}</>}</ActionDialog>
      <PrimeSheet open={sheet === "prime"} onClose={() => setSheet(null)} />
      <ReelStudio open={studioOpen} onClose={() => setStudioOpen(false)} />
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
      <CreatorDashboardSheet open={sheet === "creator"} onClose={() => setSheet(null)} />
      <SettingsSheet
        open={sheet === "settings"}
        onClose={() => setSheet(null)}
        onOpenPrime={() => setSheet("prime")}
        onOpenCreator={() => setSheet("creator")}
      />

    </div>
  );
}
