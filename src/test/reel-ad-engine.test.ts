import { describe, expect, it } from "vitest";
import { withSponsoredSlots } from "@/lib/reel-ad-engine";

describe("native reel ad cadence", () => {
  it("places sponsorship at every fifth feed position after four organic reels", () => {
    const feed = withSponsoredSlots(Array.from({ length: 12 }, (_, i) => i));
    expect(feed.filter((item, index) => (index + 1) % 5 === 0).map(item => item.kind)).toEqual(["ad", "ad", "ad"]);
  });
  it("inserts after every four reels without duplicating organic content", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: i }));
    const feed = withSponsoredSlots(rows);
    expect(feed.filter(r => r.kind === "reel").map(r => r.kind === "reel" ? r.reel.id : -1)).toEqual(rows.map(r => r.id));
    expect(feed.map((r, i) => r.kind === "ad" ? i : -1).filter(i => i >= 0)).toEqual([4, 9, 14]);
  });
  it("does not manufacture ads before four real entries", () => {
    expect(withSponsoredSlots([1, 2, 3]).every(r => r.kind === "reel")).toBe(true);
  });
  it("allows a five-reel interval", () => {
    expect(withSponsoredSlots([1, 2, 3, 4, 5], 5).at(-1)?.kind).toBe("ad");
  });
});