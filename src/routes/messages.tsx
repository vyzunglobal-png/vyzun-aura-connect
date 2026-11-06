import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MessagesView } from "@/components/vyzun/MessagesView";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [
    { title: "Messages & VYZUN AI — VYZUN" },
    { name: "description", content: "Your private chats and VYZUN creative AI companion." },
    { property: "og:title", content: "Messages & VYZUN AI — VYZUN" },
    { property: "og:description", content: "Connect privately and create with your VYZUN AI companion." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: MessagesPage,
});
function MessagesPage() {
  return <div className="min-h-dvh pb-28"><header className="sticky top-0 z-30 flex items-center gap-3 bg-background/80 px-5 py-4 backdrop-blur-md"><Link to="/secrets" aria-label="Back to Secrets"><ArrowLeft className="h-5 w-5" /></Link><h1 className="font-display text-xl font-semibold">Messages</h1></header><main className="mx-auto max-w-lg px-5 py-4"><MessagesView /></main></div>;
}