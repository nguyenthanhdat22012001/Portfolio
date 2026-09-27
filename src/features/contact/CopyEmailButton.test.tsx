import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyEmailButton } from "./CopyEmailButton";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true
  });
}

async function renderAndClick() {
  await act(async () => {
    root.render(
      <CopyEmailButton
        email="me@example.com"
        label="Copy email"
        copiedLabel="Copied"
      />
    );
  });
  await act(async () => {
    host.querySelector("button")?.click();
  });
}

const status = () => host.querySelector("[aria-live]")?.textContent;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("CopyEmailButton", () => {
  it("copies the email and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    await renderAndClick();
    expect(writeText).toHaveBeenCalledWith("me@example.com");
    expect(status()).toBe("Copied");
  });

  it("stays silent when the clipboard rejects", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    await renderAndClick();
    expect(status()).toBe("");
    expect(host.querySelector("button")?.textContent).toBe("Copy email");
  });

  it("resets the announcement after two seconds", async () => {
    vi.useFakeTimers();
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    await renderAndClick();
    expect(status()).toBe("Copied");
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(status()).toBe("");
  });
});
