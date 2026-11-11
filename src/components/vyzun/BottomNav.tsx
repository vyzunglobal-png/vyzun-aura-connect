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
    <nav aria-label="Primary" className="nav-glass fixed inset-x-0 bottom-0 z-40 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pb-2 pt-2.5 text-[12px] tap active:tap-active",
                  active ? "text-foreground" : "text-foreground/85",
                )}
              >
                <span className={cn("flex h-10 w-14 items-center justify-center rounded-2xl transition-shadow", active && "nav-active-tile")}>
                  <Icon className={cn("h-6 w-6", active && "drop-shadow-[0_0_6px_var(--color-magenta)]")} strokeWidth={2.2} />
                </span>
                <span className="font-bold uppercase tracking-wide">{label}</span>
                <span aria-hidden className={cn("nav-underline w-10", !active && "invisible")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
