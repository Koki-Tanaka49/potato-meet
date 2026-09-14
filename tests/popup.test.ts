import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import type { ExtensionMessage, ExtensionStateResponse } from "../src/types";

const state = (enabled: boolean): ExtensionStateResponse => ({
  enabled, available: true, trackedCount: 1, detectorReady: enabled,
  variant: "classic", sunglassesEnabled: false, performanceMode: "full"
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("a delayed Off poll cannot undo a completed On action in the popup", async () => {
  vi.useFakeTimers();
  vi.resetModules();
  document.documentElement.innerHTML = readFileSync("src/popup/popup.html", "utf8").replace(/<link[^>]*>/g, "").replace(/<script[\s\S]*?<\/script>/g, "");
  let resolvePoll!: (value: ExtensionStateResponse) => void;
  let reads = 0;
  vi.stubGlobal("chrome", {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    tabs: {
      query: async () => [{ id: 1 }],
      sendMessage: async (_id: number, message: ExtensionMessage) => {
        if (message.type === "POTATO_SET_ENABLED") return state(message.enabled);
        if (++reads === 1) return state(false);
        return new Promise<ExtensionStateResponse>((resolve) => { resolvePoll = resolve; });
      }
    },
    storage: { local: { get: async () => ({}), set: async () => undefined }, onChanged: { addListener: () => undefined } }
  });
  await import("../src/popup/popup");
  await vi.advanceTimersByTimeAsync(0);
  const toggle = document.querySelector<HTMLInputElement>("#potato-toggle")!;
  expect(toggle.disabled).toBe(false);
  expect(toggle.checked).toBe(false);
  await vi.advanceTimersByTimeAsync(1000);
  toggle.checked = true;
  toggle.dispatchEvent(new Event("change"));
  await vi.advanceTimersByTimeAsync(0);
  expect(toggle.checked).toBe(true);
  resolvePoll(state(false));
  await vi.advanceTimersByTimeAsync(0);
  expect(toggle.checked).toBe(true);
  expect(document.querySelector("#state-label")!.textContent).toBe("On");
});

it("re-enables the grey switch when an existing Meet tab reconnects, then turns On", async () => {
  vi.useFakeTimers();
  vi.resetModules();
  document.documentElement.innerHTML = readFileSync("src/popup/popup.html", "utf8")
    .replace(/<link[^>]*>/g, "").replace(/<script[\s\S]*?<\/script>/g, "");
  let connected = false;
  const executeScript = vi.fn(async () => { connected = true; return []; });
  vi.stubGlobal("chrome", {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    tabs: {
      query: async () => [{ id: 42, url: "https://meet.google.com/test-room" }],
      sendMessage: async (_id: number, message: ExtensionMessage) => {
        if (!connected) throw new Error("Receiving end does not exist");
        return state(message.type === "POTATO_SET_ENABLED" && message.enabled);
      }
    },
    scripting: { executeScript },
    storage: { local: { get: async () => ({}), set: async () => undefined }, onChanged: { addListener: () => undefined } }
  });
  await import("../src/popup/popup");
  await vi.advanceTimersByTimeAsync(0);
  const toggle = document.querySelector<HTMLInputElement>("#potato-toggle")!;
  expect(executeScript).toHaveBeenCalledOnce();
  expect(toggle.disabled).toBe(false);
  expect(toggle.checked).toBe(false);
  expect(document.querySelector<HTMLElement>("#connection-notice")!.hidden).toBe(true);
  toggle.checked = true;
  toggle.dispatchEvent(new Event("change"));
  await vi.advanceTimersByTimeAsync(0);
  expect(toggle.disabled).toBe(false);
  expect(toggle.checked).toBe(true);
});
