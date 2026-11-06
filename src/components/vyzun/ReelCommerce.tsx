import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Product = { id: string; title: string; product_url: string; commission_rate: number | null; merchant: string | null };
export function ReelCommerce({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let current = true;
    setLoading(true); setError(null);
    supabase.from("affiliate_products").select("id,title,product_url,commission_rate,merchant").eq("is_active", true).limit(20).then(({ data, error }) => {
      if (!current) return;
      setProducts(data ?? []); setLoading(false); if (error) setError("Products could not be loaded.");
    });
    return () => { current = false; };
  }, [open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-end bg-background/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Creator affiliate products">
    <section className="mx-auto max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-glass-border bg-background p-5 pb-24">
      <header className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-5 w-5 text-cyan" />Creator picks</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close products"><X /></Button></header>
      <p className="mt-2 text-xs text-muted-foreground">Affiliate links · eligible creators can earn 5–20% commission. Actual rates vary by product.</p>
      {loading ? <p role="status" className="py-6 text-sm">Loading products…</p> : error ? <p role="alert" className="py-6 text-sm text-destructive">{error}</p> : products.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No active products yet.</p> : <div className="mt-4 space-y-3">{products.map(p => {
        let safe = false; try { safe = new URL(p.product_url).protocol === "https:"; } catch { /* Invalid merchant URL */ }
        return <div key={p.id} className="border-b border-glass-border py-3"><p className="text-sm font-semibold">{p.title}</p><p className="mt-1 text-xs text-muted-foreground">{p.merchant ?? "Merchant"}{p.commission_rate !== null ? ` · ${p.commission_rate}% commission` : ""}</p>{safe && <Button asChild variant="outline" className="mt-3"><a href={p.product_url} target="_blank" rel="noopener noreferrer sponsored">Shop product</a></Button>}</div>;
      })}</div>}
    </section>
  </div>;
}