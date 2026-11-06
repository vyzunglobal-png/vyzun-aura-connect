import { describe, expect, it } from "vitest";
import { secretDropLink, secretExpiresAt } from "@/lib/vyzun-links";

describe("Part 1 privacy and sharing", () => {
  it("shares recipient drops on the actual app origin", () => {
    expect(secretDropLink("https://my-vyzun.lovable.app", "@Aurafan")).toBe("https://my-vyzun.lovable.app/ask/@aurafan");
  });
  it("expires a secret exactly 24 hours after creation", () => {
    expect(secretExpiresAt(1000)).toBe(86_401_000);
  });
});