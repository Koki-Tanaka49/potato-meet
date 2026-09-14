import { afterEach, expect, it, vi } from "vitest";
import { sendToTab } from "../src/popup/connection";
const tab = { id: 42, url: "https://meet.google.com/test-room" } as chrome.tabs.Tab;
const message = { type: "POTATO_GET_STATE" } as const;
afterEach(() => vi.unstubAllGlobals());

it("reconnects a Meet tab without a receiver, keeping it Off", async () => {
  const response = { enabled: false, available: true };
  const sendMessage = vi.fn().mockRejectedValueOnce(new Error("Receiving end does not exist")).mockResolvedValue(response);
  const executeScript = vi.fn().mockResolvedValue([]);
  vi.stubGlobal("chrome", { tabs: { sendMessage }, scripting: { executeScript } });
  expect(await sendToTab(tab, message, true)).toEqual(response);
  expect(executeScript).toHaveBeenCalledWith({ target: { tabId: 42 }, files: ["content.js"] });
  expect(sendMessage.mock.calls).toEqual([[42, message], [42, message]]);
});

it("does not inject on a non-Meet tab", async () => {
  const executeScript = vi.fn();
  vi.stubGlobal("chrome", { tabs: { sendMessage: vi.fn().mockRejectedValue(new Error("Missing receiver")) }, scripting: { executeScript } });
  expect(await sendToTab({ ...tab, url: "https://example.com/" }, message, true)).toBeNull();
  expect(executeScript).not.toHaveBeenCalled();
});

it("does not reinject into an already connected Meet tab", async () => {
  const executeScript = vi.fn();
  vi.stubGlobal("chrome", { tabs: { sendMessage: vi.fn().mockResolvedValue({ enabled: true }) }, scripting: { executeScript } });
  expect(await sendToTab(tab, message, true)).toEqual({ enabled: true });
  expect(executeScript).not.toHaveBeenCalled();
});

it("returns disconnected if Chrome denies injection", async () => {
  vi.stubGlobal("chrome", { tabs: { sendMessage: vi.fn().mockRejectedValue(new Error("Missing receiver")) }, scripting: { executeScript: vi.fn().mockRejectedValue(new Error("Access denied")) } });
  expect(await sendToTab(tab, message, true)).toBeNull();
});
