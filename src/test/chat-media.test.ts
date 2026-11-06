import { describe, expect, it } from "vitest";
import { validChatPreview } from "@/lib/chat-media";
describe("private media preview validation", () => {
  it("accepts media up to 20 MB and rejects oversized previews", () => {
    expect(validChatPreview({ type: "video/webm", size: 20 * 1024 * 1024 })).toBe(true);
    expect(validChatPreview({ type: "video/webm", size: 20 * 1024 * 1024 + 1 })).toBe(false);
  });
  it("rejects non-media and empty files", () => {
    expect(validChatPreview({ type: "text/html", size: 1024 })).toBe(false);
    expect(validChatPreview({ type: "image/png", size: 0 })).toBe(false);
  });
});