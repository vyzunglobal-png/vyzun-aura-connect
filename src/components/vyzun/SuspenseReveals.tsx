import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaidAction } from "./PaidActionSheet";

const TIERS = [
  { price: "$0.99", title: "Tier 1 Hint", unlocks: "Major & zodiac sign" },
  { price: "$2.99", title: "Tier 2 Hint", unlocks: "Mutual friends & Instagram teaser" },
  { price: "$9.99", title: "Tier 3 Hint", unlocks: "Approximate location & blurred photo" },
];

export function SuspenseReveals({ onPay }: { onPay: (action: PaidAction) => void }) {
  return <div className="mt-4 border-t border-glass-border pt-3">
    <p className="text-[11px] font-semibold text-muted-foreground">Who sent it?</p>
    <div className="mt-2 grid gap-2">{TIERS.map(t => <Button key={t.title} variant="ghost"
      onClick={() => onPay({ title: `Unlock ${t.title}`, price: t.price, description: `${t.unlocks}. Hints require sender consent. Location is approximate only; chat invitations require mutual opt-in.` })}
      className="h-auto w-full justify-start whitespace-normal rounded-xl bg-background/40 px-3 py-2 text-left">
      <Lock className="text-violet" /><span className="min-w-0 flex-1 text-xs"><span className="block font-semibold">{t.title}</span><span className="text-muted-foreground">{t.unlocks}</span></span>
      <span className="shrink-0 font-bold text-gradient">{t.price}</span>
    </Button>)}</div>
  </div>;
}