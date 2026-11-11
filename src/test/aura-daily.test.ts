import { describe, expect, it } from "vitest";
import { activeStreakCount, getDailyAura, getLiveVibe, recordAuraShare, shouldSendMorningRitual } from "@/lib/aura-daily";
import { paletteFromHues } from "@/lib/aura-palette";

describe("daily Aura ritual", () => {
  it("keeps the daily Aura stable during a day and changes its prompt on another date", () => {
    expect(getDailyAura("card-1", 80, "2026-11-06")).toEqual(getDailyAura("card-1", 80, "2026-11-06"));
    expect(getDailyAura("card-1", 80, "2026-11-06").score).toBeGreaterThanOrEqual(77);
    expect(getDailyAura("card-1", 80, "2026-11-06").score).toBeLessThanOrEqual(83);
    expect(getDailyAura("card-1", 80, "2026-11-06").prompt).not.toBe(getDailyAura("card-1", 80, "2026-11-07").prompt);
  });

  it("increments a streak on consecutive days and resets after a missed day", () => {
    const first = recordAuraShare(null, "2026-11-06");
    expect(first.count).toBe(1);
    expect(recordAuraShare(first, "2026-11-06").count).toBe(1);
    expect(recordAuraShare(first, "2026-11-07").count).toBe(2);
    expect(recordAuraShare(first, "2026-11-08").count).toBe(1);
  });

  it("shows the Aura Flame only while it was extended today or yesterday", () => {
    const streak = { count: 4, lastShareDay: "2026-11-09" };
    expect(activeStreakCount(streak, "2026-11-10")).toBe(4);
    expect(activeStreakCount(streak, "2026-11-11")).toBe(0);
  });

  it("adds a capped live-vibe bonus only from real activity", () => {
    const quiet = getLiveVibe("card-1", 80, "2026-11-10");
    const busy = getLiveVibe("card-1", 80, "2026-11-10", { scans: 2, secrets: 1, posts: 1, sharedToday: true });
    expect(quiet.boost).toBe(0);
    expect(busy.boost).toBe(7);
    expect(busy.score).toBe(Math.min(99, quiet.score + 7));
    expect(getLiveVibe("c", 80, "2026-11-10", { scans: 50, secrets: 50, posts: 50, sharedToday: true }).boost).toBe(8);
  });

  it("sends the morning ritual once per day, only from 6 a.m.", () => {
    expect(shouldSendMorningRitual(null, new Date(2026, 10, 10, 5, 59))).toBe(false);
    expect(shouldSendMorningRitual("2026-11-09", new Date(2026, 10, 10, 6, 0))).toBe(true);
    expect(shouldSendMorningRitual("2026-11-10", new Date(2026, 10, 10, 9, 0))).toBe(false);
  });

  it("builds a 4-color persona palette from the portrait's dominant hues", () => {
    const palette = paletteFromHues([{ hue: 52, weight: 5 }, { hue: 268, weight: 3 }]);
    expect(palette.map((c) => c.name)).toEqual(["Stellar Gold", "Mythic Violet", "Neon Aqua", "Cosmic Rose"]);
  });
});
