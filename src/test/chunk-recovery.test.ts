import { describe, expect, it, vi } from "vitest";
import { recoverChunkLoad } from "@/lib/chunk-recovery";

describe("deployment chunk recovery", () => {
  const error = new TypeError("Failed to fetch dynamically imported module: /assets/routes-old.js");
  function storage() {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  }
  it("reloads the document once to fetch a current deployment", () => {
    const reload = vi.fn();
    expect(recoverChunkLoad(error, storage(), reload, 100000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("does not loop when the refreshed chunk still fails", () => {
    const reload = vi.fn(); const state = storage();
    recoverChunkLoad(error, state, reload, 100000);
    expect(recoverChunkLoad(error, state, reload, 101000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("does not refresh for ordinary application errors", () => {
    const reload = vi.fn();
    expect(recoverChunkLoad(new Error("Permission denied"), storage(), reload, 100000)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});