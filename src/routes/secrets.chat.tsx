import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useVyzun } from "@/lib/vyzun-store";
import { SendSecretPanel } from "@/components/vyzun/SendSecretPanel";
import { MessageSafetyMenu } from "@/components/vyzun/MessageSafetyMenu";

export const Route = createFileRoute("/secrets/chat")({
  head: () => ({
    meta: [
      { title: "Secret Chat — VYZUN" },
      {
        name: "description",
        content:
          "Share your anonymous VYZUN link, receive secret messages and reply anonymously in a moderated Secret Chat Room.",
      },
      { property: "og:title", content: "Secret Chat — VYZUN" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Your anonymous VYZUN link: receive secrets and reply safely.",
      },
    ],
  }),
  component: SecretChatPage,
});

function SecretChatPage() {
  const { state, update } = useVyzun();
  return (
    <div className="pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/75 px-5 py-4 backdrop-blur-xl">
        <Link to="/secrets" aria-label="Back to Secrets" className="tap active:tap-active">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg font-semibold">Secret Chat</h1>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5">
        <SendSecretPanel username={state.profile.username} />

        <section className="glass-card p-5">
          <h2 className="text-sm font-semibold">Secret Chat Room</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Anonymous does not mean unmoderated. Reports are reviewed.
          </p>
          <div className="mt-4 space-y-3">
            {state.secrets.map((m) => (
              <div key={m.id} className="rounded-2xl border border-glass-border p-3.5">
                <p className="text-sm">{m.body}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">Hint: {m.hint}</p>
                {m.reply && <p className="mt-2 text-sm text-gradient">↳ {m.reply}</p>}
                <div className="mt-2 flex justify-end"><MessageSafetyMenu id={m.id} onBlocked={() => update(s => ({ secrets: s.secrets.filter(x => x.id !== m.id) }))} /></div>
              </div>
            ))}
            {state.secrets.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet — share your link.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
