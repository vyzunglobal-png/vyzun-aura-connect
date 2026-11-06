import { Lock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PaidAction = {
  title: string;
  price: string;
  description: string;
};

/**
 * One shared checkout sheet for every real-money action.
 * Payment is always confirmed by the server; nothing unlocks on the device alone.
 */
export function PaidActionSheet({ action, onClose }: { action: PaidAction | null; onClose: () => void }) {
  if (!action) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-background/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={action.title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
         className="glass-card mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-in slide-in-from-bottom"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Checkout</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{action.title}</h2>
          </div>
           <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="shrink-0">
            <X className="h-5 w-5" />
           </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{action.description}</p>
        <p className="mt-5 font-display text-3xl font-bold text-gradient">{action.price}</p>

         <Button
          disabled
           className="mt-5 h-auto w-full whitespace-normal rounded-xl bg-gradient-vyzun py-3 font-semibold text-primary-foreground opacity-60"
        >
          <Lock className="h-4 w-4" /> Pay {action.price}
         </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
          Secure card checkout opens here once payments are switched on.
        </p>
      </div>
    </div>
  );
}
