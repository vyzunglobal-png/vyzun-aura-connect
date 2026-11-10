export type AuraStreak = { count: number; lastShareDay: string };

export const CAMPUS_MOOD_PROMPTS = [
  "What small win deserves a little more credit today?",
  "Which song sounds like your campus this week?",
  "What’s one thing you want to try before the weekend?",
  "Where do you feel most like yourself around campus?",
  "Who made your day better without knowing it?",
  "What would your 2 a.m. self tell your morning self?",
  "What’s one new thing you want to learn from someone?",
  "Which corner of campus has the best vibe today?",
] as const;

/** Local calendar day key, e.g. 2026-11-10. */
export function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Milliseconds until just after the next local midnight (never below 1s). */
export function msUntilNextLocalMidnight(now: Date) {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 100);
  return Math.max(1000, midnight.getTime() - now.getTime());
}

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export function getDailyAura(cardId: string, score: number, day: string) {
  const seed = hash(`${cardId}:${day}`);
  return {
    score: Math.max(1, Math.min(99, score + (seed % 7) - 3)),
    prompt: CAMPUS_MOOD_PROMPTS[seed % CAMPUS_MOOD_PROMPTS.length] ?? CAMPUS_MOOD_PROMPTS[0],
  };
}

/** Real activity counted on this device in the last 24 hours. Campus rank joins once campus data exists. */
export type AuraActivity = { scans: number; secrets: number; posts: number; sharedToday: boolean };

export const NO_ACTIVITY: AuraActivity = { scans: 0, secrets: 0, posts: 0, sharedToday: false };

export type LiveVibe = {
  score: number;
  prompt: string;
  stats: { creativity: number; depth: number; confidence: number; energy: number };
  boost: number;
};

/**
 * 24-hour live vibe: a stable daily variation of the base score plus a capped
 * bonus from real activity. Same inputs on the same day always give the same card.
 */
export function getLiveVibe(cardId: string, baseScore: number, day: string, activity: AuraActivity = NO_ACTIVITY): LiveVibe {
  const daily = getDailyAura(cardId, baseScore, day);
  const boost = Math.min(8, activity.scans + activity.secrets + activity.posts * 2 + (activity.sharedToday ? 2 : 0));
  const stat = (i: number, bonus: number) => {
    const h = hash(`${cardId}:${day}:${i}`);
    return clamp(daily.score - 6 + (h % 13) + bonus, 40, 99);
  };
  return {
    score: clamp(daily.score + boost, 1, 99),
    prompt: daily.prompt,
    boost,
    stats: {
      creativity: stat(0, Math.min(6, activity.posts * 2 + activity.scans)),
      depth: stat(1, Math.min(6, activity.secrets * 2)),
      confidence: stat(2, activity.sharedToday ? 4 : 0),
      energy: stat(3, Math.min(6, activity.scans + activity.secrets + activity.posts)),
    },
  };
}

/** Morning ritual fires once per local day, from 6 a.m. onwards. */
export function shouldSendMorningRitual(lastSentDay: string | null, now: Date) {
  return now.getHours() >= 6 && lastSentDay !== localDayKey(now);
}

/** Count one completed app share action per local calendar day; this cannot verify a story post. */
export function recordAuraShare(streak: AuraStreak | null, today: string): AuraStreak {
  if (streak?.lastShareDay === today) return streak;
  const yesterdayDate = new Date(`${today}T00:00:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate);
  return { count: streak?.lastShareDay === yesterday ? streak.count + 1 : 1, lastShareDay: today };
}

/** A streak only stays visible while it was extended today or yesterday. */
export function activeStreakCount(streak: AuraStreak | null, today: string) {
  if (!streak) return 0;
  const y = new Date(`${today}T00:00:00`);
  y.setDate(y.getDate() - 1);
  return streak.lastShareDay === today || streak.lastShareDay === localDayKey(y) ? streak.count : 0;
}
