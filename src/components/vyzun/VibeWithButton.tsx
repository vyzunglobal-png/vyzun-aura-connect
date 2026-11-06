import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { useVyzun } from "@/lib/vyzun-store";
import { cn } from "@/lib/utils";

/**
 * Primary social action on another user's profile.
 * Default: "+ Vibe With" (cyan → purple → pink gradient)
 * Active: "Vibing"  ·  Removing: "Unvibing"
 * VYZUN terminology: Vibers = followers, Vibing = following.
 */
export function VibeWithButton({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  const { state, update } = useVyzun();
  const [busy, setBusy] = useState<null | "vibing" | "unvibing">(null);
  const isVibing = state.vibingWith.includes(username);

  function toggle() {
    if (busy) return;
    if (isVibing) {
      setBusy("unvibing");
      window.setTimeout(() => {
        update((s) => ({
          vibingWith: s.vibingWith.filter((u) => u !== username),
          profile: { ...s.profile, vibing: Math.max(0, s.profile.vibing - 1) },
        }));
        setBusy(null);
      }, 350);
      return;
    }
    setBusy("vibing");
    window.setTimeout(() => {
      update((s) => ({
        vibingWith: [...s.vibingWith, username],
        profile: { ...s.profile, vibing: s.profile.vibing + 1 },
      }));
      setBusy(null);
    }, 350);
  }

  const label = busy === "unvibing" ? "Unvibing" : busy === "vibing" ? "Vibing" : isVibing ? "Vibing" : "Vibe With";

  return (
    <button
      onClick={toggle}
      aria-pressed={isVibing}
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold tap active:tap-active",
        isVibing && !busy
          ? "border border-glass-border text-foreground"
          : "bg-gradient-vyzun text-primary-foreground",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : isVibing ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <Plus className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
