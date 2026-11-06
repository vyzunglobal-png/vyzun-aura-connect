import { useState } from "react";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { blockReceivedSender, reportReceivedMessage } from "@/lib/message-safety.functions";

export function MessageSafetyMenu({ id, kind = "secret", onBlocked }: { id: string; kind?: "secret" | "feed"; onBlocked: () => void }) {
  const { isAuthenticated } = useVyzunSession();
  const report = useServerFn(reportReceivedMessage);
  const block = useServerFn(blockReceivedSender);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function act(action: "report" | "block") {
    if (!isAuthenticated) { setNotice("Sign in to report or block a sender."); return; }
    if (!/^[0-9a-f-]{36}$/i.test(id)) { setNotice("This is a preview message, not a real sender."); return; }
    setBusy(true);
    try { if (action === "report") { await report({ data: { id, kind } }); setNotice("Report submitted for review."); } else { await block({ data: { id, kind } }); onBlocked(); } }
    catch (e) { setNotice(e instanceof Error ? e.message : "Action failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="relative">
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busy} aria-label="Message actions" title="Report or block"><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void act("report")}><Flag />Report</DropdownMenuItem><DropdownMenuItem onSelect={() => void act("block")} className="text-destructive"><Ban />Block sender</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    {notice && <p role="status" className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-glass-border bg-popover p-3 text-xs text-popover-foreground">{notice}</p>}
  </div>;
}