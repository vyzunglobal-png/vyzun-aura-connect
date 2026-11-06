import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, MessageCircle, Phone, Search, Send, Video } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useVyzunSession } from "@/hooks/use-vyzun-session";
import { askVyzunAI } from "@/lib/companion.functions";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChatComposer } from "./ChatComposer";
import { ActionDialog } from "./ActionDialog";
import { PaidActionSheet, type PaidAction } from "./PaidActionSheet";

const TASKS = [{ key: "hooks", label: "Video hooks" }, { key: "scripts", label: "Scripts" }, { key: "bio", label: "Bio" }, { key: "safety", label: "Brand safety" }] as const;
type Task = typeof TASKS[number]["key"];

const ICEBREAKERS = ["How do I reveal a crush?", "What is Aura Score?", "How to pin on Campus Map?", "What is Vibe Clash?"] as const;

type ChatRow = { id: string; kind: string; last_message_at: string | null };
type PeopleMap = Record<string, { username: string; avatar_url: string | null }>;

function ago(ts: string | null) {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/** Shared full-screen and sheet content. No fabricated threads, unread counts or delivery states. */
export function MessagesView() {
  const { session } = useVyzunSession();
  const ask = useServerFn(askVyzunAI);
  const [active, setActive] = useState<string | null>(null);
  const [task, setTask] = useState<Task>("hooks");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ prompt: string; text: string }[]>([]);
  const [search, setSearch] = useState("");
  const [battle, setBattle] = useState(false);
  const [paid, setPaid] = useState<PaidAction | null>(null);
  const threads = useQuery({
    queryKey: ["direct-chats", session?.user.id], enabled: !!session, retry: 1, staleTime: 15_000,
    queryFn: async () => {
      const uid = session?.user.id ?? "";
      const { data: chatRows, error } = await supabase.from("chats").select("id,kind,last_message_at").order("last_message_at", { ascending: false }).limit(30);
      if (error) throw error;
      const chats: ChatRow[] = chatRows ?? [];
      const ids = chats.map(chat => chat.id);
      if (!ids.length) return { chats, people: {} as PeopleMap, unread: {} as Record<string, number> };
      const [participants, unreadRows] = await Promise.all([
        supabase.from("chat_participants").select("chat_id,user_id").in("chat_id", ids).neq("user_id", uid),
        supabase.from("chat_messages").select("chat_id").in("chat_id", ids).neq("sender_id", uid).is("read_at", null).limit(500),
      ]);
      if (participants.error) throw participants.error;
      if (unreadRows.error) throw unreadRows.error;
      const memberIds = [...new Set((participants.data ?? []).map(row => row.user_id))];
      const { data: profiles, error: profileError } = memberIds.length
        ? await supabase.from("profiles").select("id,username,avatar_url").in("id", memberIds)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const people: PeopleMap = {};
      for (const row of participants.data ?? []) {
        const profile = profiles?.find(item => item.id === row.user_id);
        if (profile) people[row.chat_id] = { username: profile.username, avatar_url: profile.avatar_url };
      }
      const unread: Record<string, number> = {};
      for (const row of unreadRows.data ?? []) unread[row.chat_id] = (unread[row.chat_id] ?? 0) + 1;
      return { chats, people, unread };
    },
  });
  const messages = useQuery({ queryKey: ["direct-chat", session?.user.id, active], enabled: !!session && !!active && active !== "ai", retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("id,body,sender_id,created_at").eq("chat_id", active ?? "").is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []).reverse();
    },
  });

  const visibleChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    const chats = threads.data?.chats ?? [];
    if (!query) return chats;
    return chats.filter(chat => (threads.data?.people[chat.id]?.username ?? "").toLowerCase().includes(query));
  }, [search, threads.data]);

  async function send() {
    const prompt = draft.trim();
    if (!prompt || busy) return;
    if (!session) { setNotice("Sign in to talk with VYZUN AI."); return; }
    setBusy(true); setNotice(null);
    try {
      const result = await ask({ data: { prompt, context: task } });
      if (result.ok) { setAnswers(items => [...items, { prompt, text: result.text }]); setDraft(""); }
      else setNotice(result.text);
    } catch { setNotice("VYZUN AI could not connect. Your prompt is still here."); }
    finally { setBusy(false); }
  }

  function openAI(prompt?: string) {
    setActive("ai");
    setNotice(null);
    if (prompt) setDraft(prompt);
  }

  return <section className="space-y-4">
    {!active ? <>
      <button onClick={() => openAI()} className="glass-card relative w-full p-4 text-left shadow-[var(--glow-neon)] tap active:tap-active">
        <span aria-hidden className="bg-gradient-secret absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary-foreground">PINNED ›</span>
        <div className="flex items-center gap-3">
          <span className="squircle-glow grid h-14 w-14 shrink-0 place-items-center overflow-hidden bg-background p-2"><Logo className="h-full w-full" /></span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-semibold">✨ VYZUN AI <BadgeCheck className="h-4 w-4 text-cyan" /></span>
            <span className="block text-xs text-muted-foreground">Verified Vibe Guide · always pinned first</span>
          </span>
        </div>
      </button>
      <div className="flex flex-wrap gap-2" aria-label="Icebreaker prompts">{ICEBREAKERS.map(prompt => <button key={prompt} onClick={() => openAI(prompt)} className="rounded-full border border-glass-border px-3 py-1.5 text-xs tap active:tap-active hover:border-cyan/60">{prompt}</button>)}</div>
      <label className="flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search chats" maxLength={30} className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </label>
      {!session && <p className="text-sm text-muted-foreground">Sign in to see your private chats.</p>}
      {threads.isLoading && <div role="status" aria-label="Loading chats" className="h-16 animate-pulse rounded-xl bg-muted" />}
      {threads.isError && <div role="alert" className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Your chats couldn’t connect.</p><Button variant="outline" onClick={() => void threads.refetch()}>Retry</Button></div>}
      {session && threads.isSuccess && visibleChats.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{search.trim() ? "No chats match that name." : "No active chats yet."}</p>}
      {visibleChats.map((thread, i) => {
        const person = threads.data?.people[thread.id];
        const unread = threads.data?.unread[thread.id] ?? 0;
        return <Button key={thread.id} variant="outline" onClick={() => { setActive(thread.id); setNotice(null); }} className="h-auto w-full justify-start gap-3 p-3">
          <span className="squircle-glow grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-muted text-sm font-bold text-cyan">{person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover" /> : person?.username?.[0]?.toUpperCase() ?? <MessageCircle className="h-4 w-4" />}</span>
          <span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{person?.username ? `@${person.username}` : `Private chat ${i + 1}`}</span>{thread.last_message_at && <span className="block text-[11px] text-muted-foreground">Active {ago(thread.last_message_at)} ago</span>}</span>
          {unread > 0 && <span aria-label={`${unread} unread`} className="bg-gradient-secret grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-primary-foreground">{unread > 9 ? "9+" : unread}</span>}
        </Button>;
      })}
    </> : <>
      <div className="flex items-center justify-between gap-3"><Button variant="ghost" size="sm" onClick={() => { setActive(null); setNotice(null); }}><ArrowLeft className="h-4 w-4" />All chats</Button><h2 className="text-sm font-semibold">{active === "ai" ? "VYZUN AI" : "Private chat"}</h2>{active !== "ai" && <div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Audio call" onClick={() => setNotice("Calling is not connected yet. No call was placed.")}><Phone className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Video call" onClick={() => setNotice("Video calling is not connected yet. No call was placed.")}><Video className="h-4 w-4" /></Button></div>}</div>
      {active === "ai" ? <>
        <div className="chat-ambience rounded-lg border border-magenta/30 p-4"><p className="text-sm leading-relaxed">Hey, I’m VYZUN AI ✨ What’s your next vibe? Let’s create something that feels like you.</p><div className="mt-3 flex flex-wrap gap-2">{["Give me a fun icebreaker", "Write a viral Reel hook", "Help me refresh my bio"].map(prompt => <Button key={prompt} size="sm" variant="outline" className="h-auto whitespace-normal text-left text-xs" onClick={() => setDraft(prompt)}>{prompt}</Button>)}</div><div className="mt-3 flex gap-2"><Button asChild size="sm" variant="outline"><Link to="/">Scan Face Now</Link></Button><Button asChild size="sm" variant="outline"><Link to="/secrets" search={{}}>Open Secrets</Link></Button></div></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="AI task">{TASKS.map(t => <Button key={t.key} size="sm" variant={task === t.key ? "default" : "outline"} onClick={() => setTask(t.key)}>{t.label}</Button>)}</div>
        <div className="min-h-40 space-y-4" aria-live="polite">{answers.map((answer, i) => <div key={i} className="space-y-2"><p className="ml-auto max-w-[90%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground">{answer.prompt}</p><p className="whitespace-pre-wrap rounded-xl border border-glass-border px-4 py-3 text-sm leading-relaxed">{answer.text}</p></div>)}{busy && <p role="status" className="animate-pulse text-sm text-cyan">VYZUN AI is thinking…</p>}</div>
        <form onSubmit={e => { e.preventDefault(); void send(); }} className="flex items-end gap-2"><textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={2} aria-label="Message VYZUN AI" placeholder="What are you creating?" className="min-w-0 flex-1 resize-none rounded-xl border border-glass-border bg-background px-3 py-2 text-sm" /><Button type="submit" aria-label="Send to VYZUN AI" disabled={busy || !draft.trim()} className="bg-gradient-secret h-11 w-11 shrink-0 p-0"><Send className="h-4 w-4" /></Button></form>
      </> : <>
        <div className="chat-ambience rounded-lg border border-cyan/30 p-3"><p className="text-xs font-semibold text-cyan">Aura Match · —</p><div className="mt-2 h-1 rounded-full bg-muted" /><p className="mt-2 text-[11px] text-muted-foreground">Compatibility needs both participants’ shared Aura Cards.</p></div>
        <Button variant="outline" className="h-auto w-full whitespace-normal border-magenta/40 py-3" onClick={() => setPaid({ title: "Instant Identity Unmask", price: "$4.99", description: "Identity is revealed only with both participants’ consent and verified payment. No verified mutual match is available." })}>$4.99 · Instant Identity Unmask</Button>
        {messages.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading messages…</p>}
        {messages.isError && <p role="alert" className="text-sm text-destructive">Messages could not be loaded.</p>}
        {messages.data?.map(message => <p key={message.id} className={cn("max-w-[90%] whitespace-pre-wrap rounded-xl border border-glass-border px-4 py-3 text-sm", message.sender_id === session?.user.id && "ml-auto bg-primary text-primary-foreground")}>{message.body ?? "Media message"}</p>)}
        <ChatComposer onBattle={() => setBattle(true)} onLoot={() => setPaid({ title: "Secret Loot Box", price: "$1.99", description: "Self-destructing secrets require encrypted delivery, recipient consent and 24-hour expiry. Reward odds must be disclosed before any verified purchase. Delivery is not activated." })} />
      </>}
    </>}
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    <ActionDialog title={battle ? "Aura Battle" : null} description="A holographic duel needs both participants’ shared Aura Cards and consent. No opponent score or match is available yet." onClose={() => setBattle(false)}><Button asChild className="bg-gradient-vyzun"><Link to="/">Create your Aura Card</Link></Button></ActionDialog>
    <PaidActionSheet action={paid} onClose={() => setPaid(null)} />
  </section>;
}
