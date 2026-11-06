import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, MessageCircle, X } from "lucide-react";
import { REACTIONS, useVyzun, type ReactionKey } from "@/lib/vyzun-store";
import { cn } from "@/lib/utils";
import { SecretCard } from "@/components/vyzun/SecretCard";
import { CampusRadar } from "@/components/vyzun/CampusRadar";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";
import { SendSecretPanel } from "@/components/vyzun/SendSecretPanel";
import { SuspenseReveals } from "@/components/vyzun/SuspenseReveals";
import { MessageSafetyMenu } from "@/components/vyzun/MessageSafetyMenu";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { moderateMessage } from "@/lib/message-safety.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/secrets/")({
  validateSearch: (search: Record<string, unknown>): { to?: string } => typeof search['to'] === "string" ? { to: search['to'].replace(/^@/, "").slice(0, 30) } : {},
  head: () => ({
    meta: [
      { title: "VYZUN Secrets — Anonymous Inbox, Vibe Feed & Campus Map" },
      {
        name: "description",
        content: "Get anonymous secrets, reply privately, post to the Vibe Feed and explore your campus radar map on VYZUN.",
      },
      { property: "og:title", content: "VYZUN Secrets — Anonymous Inbox, Vibe Feed & Campus Map" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Anonymous secrets that burn in 24 hours, the Vibe Feed and a live campus radar.",
      },
    ],
  }),
  component: SecretsPage,
});

function SecretsPage() {
  const { state, update } = useVyzun();
  const { to } = Route.useSearch();
  const { session } = useVyzunSession();
  const moderation = useServerFn(moderateMessage);
  const [posting, setPosting] = useState(false);
  const inbox = useQuery({ queryKey: ["secret-inbox", session?.user.id], enabled: !!session, queryFn: async () => {
    const { data, error } = await supabase.from("secret_messages").select("id,body,hint,created_at").eq("recipient_id", session?.user.id ?? "").eq("is_hidden", false).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map(m => ({ id: m.id, body: m.body, hint: m.hint, createdAt: new Date(m.created_at).getTime() }));
  } });
  const messages = session ? (inbox.data ?? []) : state.secrets;
  async function removeSecret(id: string) {
    if (session) { const { error } = await supabase.from("secret_messages").update({ is_hidden: true }).eq("id", id); if (error) { setMediaError("Could not hide this message."); return; } await inbox.refetch(); }
    else update(s => ({ secrets: s.secrets.filter(x => x.id !== id) }));
  }
  async function replySecret(id: string, text: string) {
    if (!session) { setMediaError("Sign in to send a private reply."); return; }
    try { const safe = await moderation({ data: { body: text } }); if (!safe.allowed) { setMediaError("Please keep replies kind."); return; }
      const { error } = await supabase.from("secret_replies").insert({ message_id: id, author_id: session.user.id, body: text });
      setMediaError(error ? "Could not send reply." : "Private reply sent.");
    } catch { setMediaError("Safety checks are unavailable. Reply was not sent."); }
  }
  const [tab, setTab] = useState<"inbox" | "feed" | "map">("inbox");
  const [draft, setDraft] = useState("");
  const [anon, setAnon] = useState(true);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function react(id: string, key: ReactionKey) {
    update((s) => ({
      feed: s.feed.map((p) => {
        if (p.id !== id) return p;
        const reactions = { ...p.reactions };
        if (p.mine) reactions[p.mine] = Math.max(0, reactions[p.mine] - 1);
        if (p.mine === key) return { ...p, reactions, mine: null };
        reactions[key] += 1;
        return { ...p, reactions, mine: key };
      }),
    }));
  }

  function pickImage(file: File | undefined) {
    setMediaError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMediaError("Please choose a photo.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMediaError("Photo is larger than 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setMediaError("Could not read that photo.");
    reader.readAsDataURL(file);
  }

  async function post() {
    const body = draft.trim();
    if (!body && !image) return;
    if (!session) { setMediaError("Sign in to publish a confession."); return; }
    if (image) { setMediaError("Photo posts need image moderation before public publishing; please post text for now."); return; }
    setPosting(true);
    let postId = "";
    try { const safe = await moderation({ data: { body } }); if (!safe.allowed) { setMediaError("Bullying or hate speech is prohibited."); return; }
      const { data: saved, error } = await supabase.from("vibe_feed").insert({ author_id: session.user.id, body, is_anonymous: anon, moderation_state: "clean" }).select("id").single();
      if (error || !saved) { setMediaError("Post could not be published."); return; }
      postId = saved.id;
    }
    catch { setMediaError("Safety checks are unavailable. Post was not published."); return; }
    finally { setPosting(false); }
    update((s) => ({
      feed: [
        {
          id: postId,
          author: anon ? "anon" : s.profile.username,
          anonymous: anon,
          body,
          image,
          createdAt: Date.now(),
          reactions: { vibe: 0, curious: 0, savage: 0, lol: 0 },
          mine: null,
        },
        ...s.feed,
      ],
    }));
    setDraft("");
    setImage(null);
    setMediaError(null);
    if (fileRef.current) fileRef.current.value = "";
  }


  return (
      <div className="pb-28">
      <header className="sticky top-0 z-30 bg-background/75 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            <span aria-hidden>👻 </span>SECRETS
          </h1>
          <div className="flex items-center gap-2">
          <Link to="/messages" aria-label="Open messages" className="bg-gradient-vyzun grid h-11 w-11 place-items-center rounded-xl text-primary-foreground shadow-[var(--glow-neon)]"><MessageCircle className="h-5 w-5" /></Link>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-glass-border bg-background/40 p-1">
          {(
            [
              ["inbox", "Anonymous Inbox"],
              ["feed", "Vibe Feed"],
              ["map", "Campus Map"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                "rounded-xl py-2 text-xs font-semibold text-muted-foreground transition-colors",
                tab === t && "bg-gradient-vyzun text-primary-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5">
        {tab === "inbox" && (
          <section className="space-y-3">
            <SendSecretPanel username={state.profile.username} initialTo={to ?? ""} />
            {inbox.isLoading && session && <p role="status" className="text-sm text-muted-foreground">Loading inbox…</p>}
            {inbox.isError && <p role="alert" className="text-sm text-destructive">Inbox could not be loaded.</p>}
            {messages.length === 0 && !inbox.isLoading && (
              <div className="glass-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No secrets yet. Share your link to get anonymous notes.</p>
              </div>
            )}
            {messages.map((m) => (
              <SecretCard
                key={m.id}
                message={m}
                onPay={setPaid}
                onReply={(text) => void replySecret(m.id, text)}
                onDelete={() => void removeSecret(m.id)}
              />
            ))}
          </section>
        )}

        {tab === "map" && <CampusRadar onPay={setPaid} />}


        {tab === "feed" && (
          <section>
            <div className="glass-card p-4">
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">🔒 Protected by AI moderation. Bullying or hate speech is strictly prohibited.</p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Share a secret, confession or vibe…"
                aria-label="New Vibe Feed post"
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />

              {image && (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-glass-border">
                  <img src={image} alt="Attached photo preview" className="max-h-56 w-full object-cover" />
                  <button
                    onClick={() => {
                      setImage(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-glass-border bg-background/80 backdrop-blur tap active:tap-active"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {mediaError && <p className="mt-2 text-xs text-destructive">{mediaError}</p>}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickImage(e.target.files?.[0])}
              />

              <div className="mt-2 flex min-w-0 items-center gap-2">
                <button
                  onClick={() => setAnon((a) => !a)}
                  className={cn(
                    "min-w-0 truncate rounded-full border border-glass-border px-3 py-1.5 text-xs tap active:tap-active",
                    anon && "bg-gradient-vyzun text-primary-foreground",
                  )}
                >
                  {anon ? "Anonymous" : `@${state.profile.username}`}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach photo"
                  title="Attach photo"
                  className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-glass-border text-cyan tap active:tap-active"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <button
                  onClick={post}
                  disabled={posting || (!draft.trim() && !image)}
                  className="shrink-0 rounded-xl bg-gradient-vyzun px-4 py-2 text-sm font-semibold text-primary-foreground tap active:tap-active disabled:opacity-50"
                >
                  {posting ? "Checking…" : "Post"}
                </button>
              </div>
            </div>


            <div className="mt-4 space-y-3">
              {state.feed.map((p) => (
                <article key={p.id} className="glass-card p-4">
                  <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">
                    {p.anonymous ? "Anonymous" : `@${p.author}`}
                  </p>{p.anonymous && <MessageSafetyMenu id={p.id} kind="feed" onBlocked={() => update(s => ({ feed: s.feed.filter(x => x.id !== p.id) }))} />}</div>
                  {p.body && <p className="mt-1.5 text-sm">{p.body}</p>}
                  {p.image && (
                    <img
                      src={p.image}
                      alt="Vibe Feed attachment"
                      loading="lazy"
                      className="mt-3 max-h-80 w-full rounded-xl border border-glass-border object-cover"
                    />
                  )}
                  {p.anonymous && <SuspenseReveals onPay={setPaid} />}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REACTIONS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => react(p.id, r.key)}
                        aria-label={r.label}
                        className={cn(
                          "flex items-center gap-1 rounded-full border border-glass-border px-2.5 py-1 text-xs tap active:tap-active",
                          p.mine === r.key && "bg-gradient-vyzun text-primary-foreground",
                        )}
                      >
                        <span aria-hidden>{r.emoji}</span>
                        {p.reactions[r.key]}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      {mediaError && tab === "inbox" && <p role="status" className="mx-auto max-w-lg px-5 pt-3 text-sm text-muted-foreground">{mediaError}</p>}

      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
    </div>
  );
}
