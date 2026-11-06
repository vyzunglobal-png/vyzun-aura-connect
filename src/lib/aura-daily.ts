export type AuraStreak = { count: number; lastShareDay: string };

export const CAMPUS_MOOD_PROMPTS = [
  "What small win deserves a little more credit today?",
  "Which song sounds like your campus this week?",
  "What’s one thing you want to try before the weekend?",
  "Where do you feel most like yourself around campus?",
  "Who made your day better without knowing it?",
  "What would your 2 a.m. self tell your morning self?",
  "What’s one new thing you want to learn from someone?",
] as const;

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

export function getDailyAura(cardId: string, score: number, day: string) {
  const seed = hash(`${cardId}:${day}`);
  return {
    score: Math.max(1, Math.min(99, score + (seed % 7) - 3)),
    prompt: CAMPUS_MOOD_PROMPTS[seed % CAMPUS_MOOD_PROMPTS.length] ?? CAMPUS_MOOD_PROMPTS[0],
  };
}

/** Count one completed app share action per local calendar day; this cannot verify a story post. */
export function recordAuraShare(streak: AuraStreak | null, today: string): AuraStreak {
  if (streak?.lastShareDay === today) return streak;
  const yesterdayDate = new Date(`${today}T00:00:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
  return { count: streak?.lastShareDay === yesterday ? streak.count + 1 : 1, lastShareDay: today };
}