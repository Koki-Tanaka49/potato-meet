import type { ExtensionMessage, ExtensionStateResponse } from "../types";

// Only reconnect the Meet tab whose state request failed. Never inject into
// another site or turn tracking on merely because the popup was opened.
export async function sendToTab(
  tab: chrome.tabs.Tab | undefined,
  message: ExtensionMessage,
  reconnect = false
): Promise<ExtensionStateResponse | null> {
  if (tab?.id === undefined) return null;
  const tabId = tab.id;
  try {
    return await chrome.tabs.sendMessage(tabId, message) as ExtensionStateResponse;
  } catch {
    if (!reconnect || !tab.url?.startsWith("https://meet.google.com/")) return null;
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      return await chrome.tabs.sendMessage(tabId, message) as ExtensionStateResponse;
    } catch {
      return null;
    }
  }
}
