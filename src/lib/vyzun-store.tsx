import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 * VYZUN local state (guest-first).
 * All state persists to localStorage so guests get a full experience.
 * When Lovable Cloud is enabled this layer syncs to the database.
 * There is intentionally NO virtual currency and NO leaderboard here.
 * ------------------------------------------------------------------ */

export type ThemeName = "dark-neon" | "light-glass";

export type AuraCard = {
  id: string;
  mode: "secrets" | "love" | "future";
  score: number;
  rarity: string;
  percentile: number;
  headline: string;
  lines: string[];
  photo?: string | null;
  createdAt: number;
};

export type SecretMessage = {
  id: string;
  body: string;
  hint: string;
  createdAt: number;
  reply?: string;
  read?: boolean;
};

export type VibePost = {
  id: string;
  author: string;
  anonymous: boolean;
  body: string;
  image?: string | null;
  createdAt: number;
  reactions: Record<ReactionKey, number>;
  mine?: ReactionKey | null;
};

export type ReactionKey = "vibe" | "curious" | "savage" | "lol";

export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "vibe", emoji: "❤️", label: "Vibe" },
  { key: "curious", emoji: "👀", label: "Curious" },
  { key: "savage", emoji: "🔥", label: "Savage" },
  { key: "lol", emoji: "😂", label: "LOL" },
];

export type Profile = {
  username: string;
  displayName: string;
  bio: string;
  verified: boolean;
  prime: boolean;
  primeCreator: boolean;
  vibers: number;
  vibing: number;
  authMode: "guest" | "google" | "phone" | null;
};

export type Audience = "everyone" | "vibers" | "nobody";

export type VyzunSettings = {
  whoCanSendSecrets: Audience;
  whoCanMessage: Audience;
  whoCanCall: Audience;
  crushMatcher: boolean;
  searchable: boolean;
  readReceipts: boolean;
  reelAutoplayCellular: boolean;
  dataSaver: boolean;
  videoQuality: "auto" | "low" | "medium" | "high";
  haptics: boolean;
  uiSounds: boolean;
  reducedMotion: boolean;
  push: {
    vibes: boolean;
    secrets: boolean;
    secretReplies: boolean;
    directMessages: boolean;
    calls: boolean;
    brandInvitations: boolean;
    creatorEarnings: boolean;
  };
  blocked: string[];
  muted: string[];
};

export type VyzunState = {
  hydrated: boolean;
  onboarded: boolean;
  theme: ThemeName;
  language: string;
  profile: Profile;
  settings: VyzunSettings;
  auraCards: AuraCard[];
  scans: { id: string; mode: string; createdAt: number }[];
  secrets: SecretMessage[];
  feed: VibePost[];
  vibingWith: string[];
  crush: string | null;
};

export const APP_VERSION = "1.0.0";

const KEY = "vyzun.state.v1";


const seedSecrets: SecretMessage[] = [
  {
    id: "s1",
    body: "You have no idea how much your last reel made my day. Please keep going.",
    hint: "Someone from your city",
    createdAt: Date.now() - 1000 * 60 * 42,
  },
  {
    id: "s2",
    body: "We talked once in a queue and I still think about that conversation.",
    hint: "Someone you met this year",
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
  },
];

const seedFeed: VibePost[] = [
  {
    id: "f1",
    author: "anon",
    anonymous: true,
    body: "Confession: I moved cities alone at 19 and it was the best decision of my life.",
    createdAt: Date.now() - 1000 * 60 * 18,
    reactions: { vibe: 214, curious: 61, savage: 12, lol: 4 },
    mine: null,
  },
  {
    id: "f2",
    author: "riyavibes",
    anonymous: false,
    body: "Editing my first reel at 3am. If it flops, at least the coffee was good ☕",
    createdAt: Date.now() - 1000 * 60 * 96,
    reactions: { vibe: 88, curious: 20, savage: 31, lol: 44 },
    mine: null,
  },
];

export function defaultSettings(): VyzunSettings {
  return {
    whoCanSendSecrets: "everyone",
    whoCanMessage: "everyone",
    whoCanCall: "vibers",
    crushMatcher: true,
    searchable: true,
    readReceipts: true,
    reelAutoplayCellular: false,
    dataSaver: false,
    videoQuality: "auto",
    haptics: true,
    uiSounds: true,
    reducedMotion: false,
    push: {
      vibes: true,
      secrets: true,
      secretReplies: true,
      directMessages: true,
      calls: true,
      brandInvitations: true,
      creatorEarnings: true,
    },
    blocked: [],
    muted: [],
  };
}

function defaultState(): VyzunState {

  return {
    hydrated: false,
    onboarded: false,
    theme: "dark-neon",
    language: "en",
    profile: {
      username: "you",
      displayName: "New Vyzuner",
      bio: "Watch. Create. Vibe. Earn.",
      verified: false,
      prime: false,
      primeCreator: false,
      vibers: 0,
      vibing: 0,
      authMode: null,
    },
    settings: defaultSettings(),
    auraCards: [],

    scans: [],
    secrets: seedSecrets,
    feed: seedFeed,
    vibingWith: [],
    crush: null,
  };
}

type Ctx = {
  state: VyzunState;
  update: (patch: Partial<VyzunState> | ((s: VyzunState) => Partial<VyzunState>)) => void;
  reset: () => void;
};

const VyzunContext = createContext<Ctx | null>(null);

export function VyzunProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VyzunState>(defaultState);

  useEffect(() => {
    let next = { ...defaultState(), hydrated: true };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<VyzunState>;
        next = {
          ...next,
          ...saved,
          settings: {
            ...defaultSettings(),
            ...(saved.settings ?? {}),
            push: { ...defaultSettings().push, ...(saved.settings?.push ?? {}) },
          },
          hydrated: true,
        };
      }
    } catch {
      /* ignore corrupt local state */
    }

    setState(next);
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const { hydrated: _h, ...persist } = state;
      localStorage.setItem(KEY, JSON.stringify(persist));
    } catch {
      /* storage may be unavailable */
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-light", state.theme === "light-glass");
  }, [state.theme]);

  const update = useCallback<Ctx["update"]>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    setState({ ...defaultState(), hydrated: true });
  }, []);

  const value = useMemo(() => ({ state, update, reset }), [state, update, reset]);
  return <VyzunContext.Provider value={value}>{children}</VyzunContext.Provider>;
}

export function useVyzun() {
  const ctx = useContext(VyzunContext);
  if (!ctx) throw new Error("useVyzun must be used inside VyzunProvider");
  return ctx;
}

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "sw", label: "Kiswahili" },
  { code: "fa", label: "فارسی" },
];

export const RTL_LANGUAGES = ["ar", "fa", "he", "ur"];
