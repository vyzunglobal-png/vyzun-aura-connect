import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { getCreatorSummary } from "@/lib/vyzun-account.functions";
import { useVyzunSession } from "@/hooks/use-vyzun-session";

/**
 * Real-money creator accounting — never a virtual wallet.
 * Every figure comes from the server-side creator earnings ledger; with no
 * settled ledger rows yet everything reads zero. Nothing here fabricates
 * earnings, payouts or successful transactions.
 */
const SOURCE_LABELS: Record<string, string> = {
  reel_revenue_share: "Ad revenue share",
  brand_mission: "Brand Missions",
  affiliate: "Affiliate / shopping",
  fan_subscription: "Fan subscriptions",
  paid_interaction: "Paid creator interactions",
  challenge: "Creator challenges",
  sponsored: "Sponsored content",
};

export function CreatorDashboardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAuthenticated } = useVyzunSession();
  const fetchSummary = useServerFn(getCreatorSummary);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["creator-summary"],
    queryFn: () => fetchSummary(),
    enabled: open && isAuthenticated,
  });

  if (!open) return null;

  const currency = data?.currency ?? "INR";
  const money = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const totals = data?.totals ?? { total: 0, thisMonth: 0, pending: 0, available: 0, paid: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/60 backdrop-blur-sm">
      <div className="glass-card max-h-[85vh] w-full overflow-y-auto rounded-b-none p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Creator Dashboard</h2>
          <button onClick={onClose} aria-label="Close" className="tap active:tap-active">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isAuthenticated && (
          <p className="mt-4 rounded-xl border border-glass-border p-4 text-sm text-muted-foreground">
            Sign in to open your real-money earnings ledger. Guest mode keeps content local and has
            no earnings account.
          </p>
        )}

        {isAuthenticated && isError && (
          <p role="alert" className="mt-4 rounded-xl border border-glass-border p-4 text-sm">
            Couldn't load your earnings right now. Pull up again to retry.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "Total earnings", value: totals.total },
            { label: "This month", value: totals.thisMonth },
            { label: "Pending (fraud checks)", value: totals.pending },
            { label: "Available to withdraw", value: totals.available },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-glass-border p-3">
              <p className="font-display text-lg font-bold">
                {isLoading && isAuthenticated ? (
                  <span className="inline-block h-5 w-20 animate-pulse rounded bg-muted" />
                ) : (
                  !isAuthenticated || isError || !data ? "—" : money(s.value)
                )}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-5 text-sm font-semibold">Revenue sources</h3>
        <ul className="mt-2 space-y-2">
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-xl border border-glass-border px-3 py-2 text-sm"
            >
              <span>{label}</span>
              <span className="text-muted-foreground">{data && !isError ? money(data.bySource?.[key] ?? 0) : "—"}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-semibold">Payout history</h3>
        {data?.payouts?.length ? (
          <ul className="mt-2 space-y-2">
            {data.payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-glass-border px-3 py-2 text-sm"
              >
                <span>
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: p.currency,
                    maximumFractionDigits: 0,
                  }).format(Number(p.amount))}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{p.state}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-xl border border-glass-border px-3 py-3 text-xs text-muted-foreground">
            No payouts yet.
          </p>
        )}

        <div className="mt-5 rounded-xl border border-glass-border p-4 text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">Payouts</p>
          <p className="mt-1">
            Monetization: <span className="text-foreground">{data?.eligibilityState ?? "not_applied"}</span> ·
            Payout method: <span className="text-foreground">{data?.payoutMethodState ?? "not_configured"}</span> ·
            Tax details: <span className="text-foreground">{data?.taxStatus ?? "not_provided"}</span>
          </p>
          <p className="mt-2">
            Withdrawals open once you meet the configured eligibility rules and payout threshold, and
            a compliant payout provider (UPI / bank transfer) is connected for your country. Earnings
            stay pending until fraud checks complete. VYZUN never guarantees creator income.
          </p>
          <button
            disabled
            className="mt-3 w-full rounded-xl bg-gradient-vyzun py-2.5 font-semibold text-primary-foreground opacity-70"
          >
            Withdraw earnings
          </button>
        </div>
      </div>
    </div>
  );
}
