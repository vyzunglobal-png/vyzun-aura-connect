import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/vyzun/AppHeader";
import { SendSecretPanel } from "@/components/vyzun/SendSecretPanel";
import { useVyzun } from "@/lib/vyzun-store";

export const Route = createFileRoute("/ask/$username")({
  head: ({ params }) => ({ meta: [
    { title: `Send ${params.username} a secret — VYZUN` },
    { name: "description", content: "Send a kind, moderated anonymous secret on VYZUN." },
    { property: "og:title", content: `Secret Drop for ${params.username} — VYZUN` },
    { property: "og:description", content: "Drop a private note. Keep it anonymous, keep it kind." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SecretDropPage,
});

function SecretDropPage() {
  const { username } = Route.useParams();
  const { state } = useVyzun();
  return <div className="pb-28"><AppHeader /><main className="mx-auto max-w-lg px-5"><h1 className="mb-4 font-display text-xl font-semibold">Secret Drop · {username}</h1><SendSecretPanel username={state.profile.username} initialTo={username.replace(/^@/, "")} /></main></div>;
}