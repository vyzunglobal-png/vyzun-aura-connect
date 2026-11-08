import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Wand2 } from "lucide-react";
import { AppHeader } from "@/components/vyzun/AppHeader";
import { AuraModal } from "@/components/vyzun/AuraModal";
import { DailyAuraBanner } from "@/components/vyzun/DailyAuraBanner";
import { CrushMatcher } from "@/components/vyzun/CrushMatcher";
import { useVyzun, type AuraCard } from "@/lib/vyzun-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VYZUN Scan — AI Aura Scanner" },
      {
        name: "description",
        content:
          "Scan your vibe with the VYZUN AI scanner, generate an Aura Card and share it. Watch. Create. Vibe. Earn.",
      },
      { property: "og:title", content: "VYZUN Scan — AI Aura Scanner" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Generate your AI Aura Card on VYZUN and share your vibe with the world.",
      },
    ],
  }),
  component: ScanPage,
});

const MODES = [
  { key: "secrets", label: "Secrets", icon: Sparkles, blurb: "Hidden feelings & mystery" },
  { key: "love", label: "Love & Crush", icon: Heart, blurb: "Crush energy for fun" },
  { key: "future", label: "Future & Vibe", icon: Wand2, blurb: "Personality & vibe read" },
] as const;

const RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];

function generateAura(mode: AuraCard["mode"], photo?: string | null): AuraCard {
  const score = 40 + Math.floor(Math.random() * 60);
  const rarity = RARITIES[Math.min(RARITIES.length - 1, Math.floor(score / 21))];
  const copy: Record<AuraCard["mode"], { headline: string; lines: string[] }> = {
    secrets: {
      headline: "Quiet Storm Aura",
      lines: [
        "You keep more than you say — and people feel it.",
        "Someone has been meaning to tell you something.",
        "Your calm is read as confidence.",
      ],
    },
    love: {
      headline: "Magnetic Heart Aura",
      lines: [
        "You attract people who like depth over noise.",
        "A slow start suits you better than a spark.",
        "Someone rereads your messages.",
      ],
    },
    future: {
      headline: "Neon Momentum Aura",
      lines: [
        "The next 90 days reward consistency, not intensity.",
        "Your creative streak is early, not late.",
        "You do best when you build in public.",
      ],
    },
  };
  return {
    id: crypto.randomUUID(),
    mode,
    score,
    rarity: rarity ?? "Rare",
    percentile: Math.max(1, 100 - score),
    createdAt: Date.now(),
    photo: photo ?? null,
    ...copy[mode],
  };
}

function ScanPage() {
  const { update } = useVyzun();
  const [mode, setMode] = useState<AuraCard["mode"]>("secrets");
  const [scanning, setScanning] = useState(false);
  const [card, setCard] = useState<AuraCard | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const mountedRef = useRef(true);
  const scanTimerRef = useRef<number | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  async function requestCamera() {
    setCameraError(null);
    setScanning(true);
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview unavailable");
      video.srcObject = stream;
      await video.play();
      await new Promise(resolve => window.setTimeout(resolve, 1400));
      if (!mountedRef.current) return;
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth, video.videoHeight);
      if (!size) throw new Error("No camera frame");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No image context");
      ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);
      const shot = canvas.toDataURL("image/jpeg", 0.9);
      setPhoto(shot);
      runScan(shot);
    } catch (error) {
      if (!mountedRef.current) return;
      setScanning(false);
      setCameraError(error instanceof DOMException && error.name === "NotAllowedError" ? "Camera permission was declined. Allow camera access, then try again." : "Camera unavailable. Check your front camera and try again. Gallery photos are not used.");
    } finally {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  function runScan(nextPhoto?: string | null) {
    const usePhoto = nextPhoto === undefined ? photo : nextPhoto;
    setScanning(true);
    scanTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      const next = generateAura(mode, usePhoto);
      setCard(next);
      setResultOpen(true);
      setScanning(false);
      update((s) => ({
        auraCards: [next, ...s.auraCards].slice(0, 30),
        scans: [{ id: next.id, mode, createdAt: next.createdAt }, ...s.scans].slice(0, 50),
      }));
    }, 1400);
  }

  return (
    <div className="pb-28">
      <AppHeader />

      <main className="mx-auto max-w-lg px-5">
        <h1 className="sr-only">VYZUN AI Scanner</h1>

        <DailyAuraBanner />

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border border-glass-border px-4 py-2 text-sm tap active:tap-active",
                mode === key && "bg-gradient-vyzun text-primary-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {MODES.find((m) => m.key === mode)?.blurb} · AI entertainment experience, not a prediction.
        </p>

        <div className="glass-card relative mt-5 aspect-[3/4] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-vyzun opacity-10" />
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          <div className="absolute inset-6 rounded-3xl border border-glass-border" />
          {["left-4 top-4", "right-4 top-4", "left-4 bottom-4", "right-4 bottom-4"].map((pos) => (
            <span
              key={pos}
              className={cn("absolute h-8 w-8 rounded-lg border-2 border-cyan/70", pos)}
              aria-hidden
            />
          ))}
          <div className="absolute left-1/2 top-1/2 h-40 w-32 -translate-x-1/2 -translate-y-1/2">
            <div className="h-40 w-32 rounded-[50%] border border-magenta/50 neon-ring" />
          </div>
          {scanning && (
            <div className="anim-scanline absolute inset-x-6 top-1/2 h-16 bg-gradient-vyzun opacity-40 blur-md" />
          )}
          <p className="absolute inset-x-0 bottom-6 text-center text-xs text-muted-foreground">
            {scanning ? "Reading your aura…" : "Align your face inside the frame"}
          </p>
        </div>

        {cameraError && (
          <p className="mt-3 rounded-xl border border-destructive/40 px-4 py-3 text-sm text-muted-foreground">
            {cameraError}
          </p>
        )}

        <Button
          onClick={requestCamera}
          disabled={scanning}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-vyzun py-3.5 font-semibold text-primary-foreground shadow-[var(--glow-cyan)] tap active:tap-active disabled:opacity-60"
        >
          {scanning ? "Scanning…" : "📸 Start Live Face Scan"}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          ⚡ Real-Time Camera Scan Only • Gallery Upload Disabled for Accuracy
        </p>

        {card && !resultOpen && (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setResultOpen(true)}>
            <Sparkles /> View your Aura Card
          </Button>
        )}

        <AuraModal card={card} open={resultOpen} onClose={() => setResultOpen(false)} />

        <CrushMatcher />
      </main>
    </div>
  );
}
