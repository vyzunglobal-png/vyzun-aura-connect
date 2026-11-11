import { useCallback, useEffect, useRef, useState } from "react";
import {
  activeStreakCount,
  localDayKey,
  msUntilNextLocalMidnight,
  recordAuraShare,
  shouldSendMorningRitual,
  type AuraStreak,
} from "./aura-daily";

export const MORNING_RITUAL_TEXT = "Your Aura shifted overnight. Tap to unlock today's 3D Card";
const MORNING_KEY = "vyzun.aura-morning";

/** Today's local day key; re-renders just after each local midnight. Null until mounted (SSR-safe). */
export function useLocalDay() {
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const now = new Date();
      setDay(localDayKey(now));
      timer = window.setTimeout(tick, msUntilNextLocalMidnight(now));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return day;
}

/** Device-local streak + "opened today" state for the daily Aura ritual. */
export function useAuraDaily(username: string) {
  const day = useLocalDay();
  const [streak, setStreak] = useState<AuraStreak | null>(null);
  const [openedDay, setOpenedDay] = useState<string | null>(null);
  const streakKey = `vyzun.aura-streak.${username}`;
  const openedKey = `vyzun.aura-opened.${username}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(streakKey);
      setStreak(saved ? (JSON.parse(saved) as AuraStreak) : null);
      setOpenedDay(localStorage.getItem(openedKey));
    } catch { /* device storage is optional */ }
  }, [streakKey, openedKey]);

  const recordShare = useCallback(() => {
    if (!day) return;
    setStreak((prev) => {
      const next = recordAuraShare(prev, day);
      try { localStorage.setItem(streakKey, JSON.stringify(next)); } catch { /* optional */ }
      return next;
    });
  }, [day, streakKey]);

  const markOpened = useCallback(() => {
    if (!day) return;
    setOpenedDay(day);
    try { localStorage.setItem(openedKey, day); } catch { /* optional */ }
  }, [day, openedKey]);

  return {
    day,
    streakCount: day ? activeStreakCount(streak, day) : 0,
    sharedToday: !!day && streak?.lastShareDay === day,
    openedToday: !!day && openedDay === day,
    recordShare,
    markOpened,
  };
}

export type ReminderStatus = "granted" | "denied" | "unsupported" | "open-in-new-tab";

/** Must be called from a tap. Browsers block the prompt inside embedded previews. */
export async function enableMorningReminder(): Promise<ReminderStatus> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (window.top !== window.self) return "open-in-new-tab";
  const result = await Notification.requestPermission();
  return result === "granted" ? "granted" : "denied";
}

/**
 * Morning Vibe Ritual: once per local day from 6 a.m., shows a device notification
 * while VYZUN is open (including a background tab). Closed-app push needs a push service.
 */
export function useMorningAuraRitual(enabled: boolean, onOpen: () => void) {
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const now = new Date();
      let last: string | null = null;
      try { last = localStorage.getItem(MORNING_KEY); } catch { /* optional */ }
      if (!shouldSendMorningRitual(last, now)) return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      try {
        const n = new Notification("VYZUN", { body: MORNING_RITUAL_TEXT, icon: "/favicon.png", tag: "vyzun-aura-morning" });
        n.onclick = () => { window.focus(); openRef.current(); n.close(); };
        localStorage.setItem(MORNING_KEY, localDayKey(now));
      } catch { /* some mobile browsers only allow notifications from an installed app */ }
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [enabled]);
}
