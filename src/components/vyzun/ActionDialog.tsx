import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ActionDialog({ title, description, children, onClose }: { title: string | null; description?: string | undefined; children?: ReactNode; onClose: () => void }) {
  return <Dialog open={!!title} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto border-cyan/30 bg-background sm:max-w-lg"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}