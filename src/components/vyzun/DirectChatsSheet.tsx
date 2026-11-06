import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessagesView } from "./MessagesView";

export function DirectChatsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Direct Chats & Calls" className="fixed inset-0 z-50 flex items-end bg-background/60 backdrop-blur-sm">
      <div className="glass-card max-h-[85vh] w-full overflow-y-auto rounded-b-none p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Direct Chats &amp; Calls</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4"><MessagesView /></div>
      </div>
    </div>
  );
}
