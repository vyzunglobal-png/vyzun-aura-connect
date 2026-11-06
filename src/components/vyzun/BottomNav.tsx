import { Link, useRouterState } from "@tanstack/react-router";
import { Ghost, ScanFace, User, Video } from "lucide-react";
import { cn } from "@/lib/utils";

/** Exactly FOUR primary tabs. Never add a fifth. */
const TABS = [
  { to: "/", label: "Scan", icon: ScanFace },
  { to: "/secrets", label: "Secrets", icon: Ghost },
  { to: "/reels", label: "Reels", icon: Video },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-glass-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] tap active:tap-active",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-12 items-center justify-center rounded-xl",
                    active && "bg-gradient-vyzun text-primary-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-medium uppercase tracking-wide">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
