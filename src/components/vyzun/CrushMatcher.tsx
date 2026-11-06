import { useState } from "react";
import { HeartHandshake, Lock } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { PaidActionSheet, type PaidAction } from "@/components/vyzun/PaidActionSheet";

/**
 * Double-blind crush. Picks are never revealed to the other person; the paid
 * reveal only works on a server-confirmed mutual match. The card intentionally
 * carries only two controls: sign-in and the paid reveal.
 */
export function CrushMatcher() {
  const { isAuthenticated } = useVyzunSession();
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function signIn() {
    setSigningIn(true);
    setNotice(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) setNotice("Google sign-in didn’t complete. Please try again.");
    } catch {
      setNotice("Google sign-in is unavailable right now.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <section className="glass-card mt-8 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <HeartHandshake className="h-5 w-5 shrink-0 text-magenta" /> Double-Blind Crush
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Pick anonymously. They only ever learn if you both pick each other.
      </p>

      {isAuthenticated ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-glass-border px-4 py-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 text-cyan" />
          No verified mutual match yet.
        </p>
      ) : (
        <button
          onClick={() => void signIn()}
          disabled={signingIn}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-glass-border bg-background/60 py-3 text-sm font-semibold tap active:tap-active disabled:opacity-60"
        >
          <Lock className="h-4 w-4 shrink-0 text-cyan" />
          {signingIn ? "Opening sign-in…" : "Sign in to seal a private pick"}
        </button>
      )}

      <button
        onClick={() =>
          setPaid({
            title: "Reveal Identity & Instant Chat",
            price: "$4.99",
            description: "See who it is and open a private chat — only if you both picked each other.",
          })
        }
        className="mt-3 w-full rounded-xl bg-gradient-vyzun py-3 text-sm font-semibold text-primary-foreground shadow-[var(--glow-neon)] tap active:tap-active"
      >
        $4.99 · Reveal Identity &amp; Instant Chat
      </button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Reveal works only when both people picked each other.
      </p>
      {notice && <p role="status" className="mt-2 text-center text-xs text-muted-foreground">{notice}</p>}
      <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
    </section>
  );
}
