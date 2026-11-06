import logoAsset from "@/assets/vyzun-logo.asset.json";
import { cn } from "@/lib/utils";

/**
 * Official VYZUN mark. Never recolor, crop or re-draw it.
 * `assembling` renders two clipped halves of the SAME asset so the
 * magnetic-assembly animation always settles into the exact official logo.
 */
export function Logo({
  className,
  assembling = false,
}: {
  className?: string;
  assembling?: boolean;
}) {
  if (!assembling) {
    return (
      <img
        src={logoAsset.url}
        alt="VYZUN"
        className={cn("select-none rounded-[28%] object-contain", className)}
        draggable={false}
      />
    );
  }

  return (
    <div className={cn("relative anim-snap", className)}>
      <img
        src={logoAsset.url}
        alt=""
        aria-hidden
        className="anim-shard-left absolute inset-0 h-full w-full rounded-[28%] object-contain"
        style={{ clipPath: "polygon(0 0, 52% 0, 52% 100%, 0 100%)" }}
        draggable={false}
      />
      <img
        src={logoAsset.url}
        alt="VYZUN"
        className="anim-shard-right absolute inset-0 h-full w-full rounded-[28%] object-contain"
        style={{ clipPath: "polygon(52% 0, 100% 0, 100% 100%, 52% 100%)" }}
        draggable={false}
      />
      <div className="anim-pulse-neon pointer-events-none absolute -inset-3 rounded-[32%] bg-gradient-vyzun opacity-0 blur-2xl" />
    </div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-gradient font-bold tracking-tight", className)}>
      VYZUN
    </span>
  );
}
