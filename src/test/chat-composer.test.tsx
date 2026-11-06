import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatComposer } from "@/components/vyzun/ChatComposer";
afterEach(cleanup);
describe("private chat drafts", () => {
  it("keeps a message local when encrypted delivery is unavailable", () => {
    render(<ChatComposer onBattle={vi.fn()} onLoot={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Private message draft" });
    fireEvent.change(input, { target: { value: "Hello from my campus" } });
    fireEvent.click(screen.getByRole("button", { name: "Send private message" }));
    expect(screen.getByRole("dialog").textContent).toContain("nothing was sent");
    expect(input).toHaveValue("Hello from my campus");
  });
});