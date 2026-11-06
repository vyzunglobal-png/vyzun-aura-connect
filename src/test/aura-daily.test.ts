import { describe, expect, it } from "vitest";
import { getDailyAura, recordAuraShare } from "@/lib/aura-daily";

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
});