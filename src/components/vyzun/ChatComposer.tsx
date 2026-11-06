import { useEffect, useRef, useState } from "react";
import { Camera, Gift, ImagePlus, Mic, Send, Smile, Square, Swords, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "./ActionDialog";
import { validChatPreview } from "@/lib/chat-media";

/** Local drafts only until encrypted, moderated participant delivery is activated. */
export function ChatComposer({ onBattle, onLoot }: { onBattle: () => void; onLoot: () => void }) {
  const [draft, setDraft] = useState("");
  const [picker, setPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [media, setMedia] = useState<{ url: string; type: string; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);
  function preview(file?: File) {
    if (!file) return;
    if (!validChatPreview(file)) { setNotice("Choose a nonempty photo, video or audio file up to 20 MB."); return; }
    setMedia({ url: URL.createObjectURL(file), type: file.type, name: file.name });
  }
  async function record() {
    if (recording) { recorder.current?.stop(); return; }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setNotice("Voice recording is unavailable in this browser."); return; }
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { audio.getTracks().forEach(track => track.stop()); return; }
      stream.current = audio;
      const next = new MediaRecorder(audio); recorder.current = next;
      const parts: BlobPart[] = [];
      next.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
      next.onstop = () => { audio.getTracks().forEach(track => track.stop()); if (!alive.current) return; setRecording(false); preview(new File(parts, "voice-note.webm", { type: next.mimeType || "audio/webm" })); };
      next.start(); setRecording(true);
    } catch { setNotice("Microphone access was denied. Your draft is still here."); }
  }
  return <div className="space-y-3 border-t border-glass-border pt-3">
    {media && <div className="relative rounded-lg border border-cyan/30 p-3"><p className="mb-2 truncate text-xs text-muted-foreground">Private preview · {media.name}</p>{media.type.startsWith("image/") ? <img src={media.url} alt="Attachment preview" className="max-h-52 w-full object-contain" /> : media.type.startsWith("video/") ? <video src={media.url} controls className="max-h-52 w-full" /> : <audio src={media.url} controls className="w-full" />}<Button variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => setMedia(null)}><Trash2 /></Button></div>}
    {recording && <div role="status" className="flex h-12 items-center justify-center gap-1" aria-label="Recording voice note">{Array.from({ length: 18 }, (_, i) => <span key={i} className="voice-wave h-6 w-1 rounded-full bg-cyan" />)}</div>}
    {picker && <div className="flex flex-wrap gap-2 rounded-lg border border-glass-border p-2">{["✨", "🔥", "💜", "😂", "👀", "🫶", "🎉", "💎"].map(emoji => <Button variant="ghost" size="icon" key={emoji} onClick={() => setDraft(text => text + emoji)}>{emoji}</Button>)}<Button variant="outline" size="sm" onClick={() => setNotice("A licensed GIF catalogue is not connected yet. You can attach your own GIF.")}>GIF</Button></div>}
    <form onSubmit={event => { event.preventDefault(); setNotice("Encrypted chat delivery is not activated. Your message and attachments remain on this device; nothing was sent."); }}>
      <div className="flex items-end gap-2"><textarea rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} aria-label="Private message draft" placeholder="Message…" className="min-w-0 flex-1 resize-none rounded-lg border border-cyan/30 bg-glass px-3 py-2 text-sm" /><Button type="submit" size="icon" aria-label="Send private message" disabled={!draft.trim() && !media} className="h-11 w-11 bg-gradient-secret"><Send /></Button></div>
      <div className="mt-2 flex flex-wrap gap-1">{[{ label: "Emoji and GIF", icon: Smile, action: () => setPicker(value => !value) }, { label: "Attach photo or video", icon: ImagePlus, action: () => upload.current?.click() }, { label: "Camera", icon: Camera, action: () => camera.current?.click() }, { label: recording ? "Stop recording" : "Record voice note", icon: recording ? Square : Mic, action: () => void record() }, { label: "Aura Battle", icon: Swords, action: onBattle }, { label: "Secret Loot Box", icon: Gift, action: onLoot }].map(({ label, icon: Icon, action }) => <Button key={label} type="button" variant="ghost" size="icon" title={label} aria-label={label} onClick={action} className="text-cyan"><Icon /></Button>)}</div>
    </form>
    <p className="text-[11px] text-muted-foreground">Private drafts only · encrypted delivery awaiting activation</p>
    <input ref={upload} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={event => { preview(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={camera} type="file" accept="image/*,video/*" capture="user" className="hidden" onChange={event => { preview(event.target.files?.[0]); event.target.value = ""; }} />
    <ActionDialog title={notice ? "Chat status" : null} description={notice ?? undefined} onClose={() => setNotice(null)} />
  </div>;
}