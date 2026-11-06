import { useEffect, useRef, useState } from "react";
import { Camera, Download, Square, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReelStudio({ open, onClose }: { open: boolean; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  useEffect(() => {
    active.current = open;
    if (!open) { setReady(false); setRecording(false); return; }
    return () => { active.current = false; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  }, [open]);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip); }, [clip]);
  async function startCamera() {
    setError(null);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      if (!active.current) { next.getTracks().forEach(t => t.stop()); return; }
      stream.current = next;
      if (video.current) { video.current.srcObject = next; await video.current.play(); }
      setReady(true);
    } catch { setError("Allow camera and microphone access to record a Reel."); }
  }
  function record() {
    if (!stream.current) return;
    if (typeof MediaRecorder === "undefined") { setError("Recording is not supported in this browser."); return; }
    setClip(null);
    const next = new MediaRecorder(stream.current);
    const chunks: Blob[] = [];
    next.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    next.onstop = () => { if (timer.current) clearTimeout(timer.current); if (!active.current) return; setClip(URL.createObjectURL(new Blob(chunks, { type: next.mimeType }))); setRecording(false); };
    recorder.current = next;
    next.start(); setRecording(true);
    timer.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, 60_000);
  }
  if (!open) return null;
  return <div className="fixed inset-0 z-[65] flex items-center justify-center bg-background/90 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Create Reel studio">
    <section className="w-full max-w-md overflow-y-auto rounded-2xl border border-glass-border bg-background p-4 max-h-[90dvh] pb-24">
      <header className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Create Reel</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close studio"><X /></Button></header>
      <div className="relative mt-3 aspect-[9/12] overflow-hidden rounded-xl bg-secondary">
        <video ref={video} muted playsInline className="h-full w-full object-cover" />
        {!ready && <Camera className="absolute inset-0 m-auto h-12 w-12 text-muted-foreground" />}
        {recording && <span role="status" className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground">Recording · 60s max</span>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <Button className="mt-3 h-auto w-full bg-gradient-vyzun py-3" onClick={recording ? () => recorder.current?.stop() : ready ? record : startCamera}>
        {recording ? <Square /> : <Video />}{recording ? "Stop recording" : ready ? "Record Reel" : "Enable camera & microphone"}
      </Button>
      {clip && <div className="mt-4 space-y-3"><video src={clip} controls playsInline className="max-h-72 w-full rounded-xl" />
        <textarea aria-label="Reel caption" placeholder="Caption your moment… #vyzunaura" value={caption} onChange={e => setCaption(e.target.value)} maxLength={500} className="w-full rounded-xl border border-glass-border bg-transparent p-3 text-sm" />
        <Button asChild variant="outline" className="w-full"><a href={clip} download="vyzun-reel.webm"><Download />Save recording</a></Button>
        <p className="text-xs text-muted-foreground">Saved privately. Public publishing is not enabled yet.</p>
      </div>}
    </section>
  </div>;
}