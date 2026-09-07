import { expect, test, chromium, type Worker } from "@playwright/test";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

async function sendToMeet(worker: Worker, enabled: boolean): Promise<void> {
  await worker.evaluate(async (nextEnabled) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error("模擬Meetタブが見つかりません。");
    await chrome.tabs.sendMessage(tab.id, { type: "POTATO_SET_ENABLED", enabled: nextEnabled });
  }, enabled);
}

async function getMeetState(worker: Worker): Promise<{
  detectorReady: boolean;
  trackedCount: number;
  variant: "classic" | "sweet" | "purple";
  sunglassesEnabled: boolean;
  performanceMode: "full" | "balanced" | "light";
  detectorError?: string;
}> {
  return worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error("模擬Meetタブが見つかりません。");
    return chrome.tabs.sendMessage(tab.id, { type: "POTATO_GET_STATE" });
  });
}

for (const mode of ["normal", "csp", "reconnect"] as const) {
const restrictiveCsp = mode !== "normal";
test(`模擬Meetで相手だけに表示し、ON/OFFを繰り返せる (${mode})`, async () => {
  let extensionPath = path.resolve("dist");
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "potato-meet-chrome-"));
  if (mode === "reconnect") {
    extensionPath = path.join(userDataDir, "extension");
    await cp(path.resolve("dist"), extensionPath, { recursive: true });
    const manifest = JSON.parse(await readFile(path.join(extensionPath, "manifest.json"), "utf8"));
    delete manifest.content_scripts; // Model a tab opened before extension installation/update.
    await writeFile(path.join(extensionPath, "manifest.json"), JSON.stringify(manifest));
  }
  const mockTemplate = await readFile(path.resolve("tests/mock-meet.html"), "utf8");
  const portrait = await readFile(path.resolve("tests/fixtures/remote-face-open.png"));
  const mockHtml = mockTemplate.replace(
    "__REMOTE_PORTRAIT_DATA_URL__",
    `data:image/png;base64,${portrait.toString("base64")}`
  );
  const externalRequests: string[] = [];
  const browserErrors: string[] = [];
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-first-run",
      "--disable-default-apps"
    ]
  });

  try {
    await context.route("https://meet.google.com/mock-potato-room", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: mockHtml,
        headers: restrictiveCsp ? {
          // The Blob worker used before 0.3.3 inherits this policy and fails WASM initialization.
          "Content-Security-Policy": "script-src 'self' 'unsafe-inline'; worker-src 'self' blob:;"
        } : {}
      });
    });
    context.on("request", (request) => {
      const url = request.url();
      if (/^https?:/.test(url) && url !== "https://meet.google.com/mock-potato-room") externalRequests.push(url);
    });

    const page = context.pages()[0] ?? await context.newPage();
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.goto("https://meet.google.com/mock-potato-room");
    await expect(page.locator("[data-participant-id='remote-aki'] video")).toHaveJSProperty("readyState", 4);

    let worker = context.serviceWorkers()[0];
    worker ??= await context.waitForEvent("serviceworker", { timeout: 15_000 });
    if (mode === "reconnect") {
      await expect(getMeetState(worker)).rejects.toThrow();
      await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({ target: { tabId: tab!.id! }, files: ["content.js"] });
      });
      expect(await getMeetState(worker)).toMatchObject({ enabled: false });
    }
    await sendToMeet(worker, true);

    const overlay = page.locator("#potato-meet-overlay");
    await expect(overlay).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => {
      const state = await getMeetState(worker);
      if (state.detectorError) throw new Error(`顔検出の初期化に失敗: ${state.detectorError}`);
      return state.detectorReady;
    }, { timeout: 10_000 }).toBe(true);
    await expect(overlay).toHaveAttribute("data-potato-count", "1", { timeout: 4_000 });
    expect((await getMeetState(worker)).trackedCount).toBe(1);
    if (mode === "reconnect") {
      await worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({ target: { tabId: tab!.id! }, files: ["content.js"] });
      });
      expect(await getMeetState(worker)).toMatchObject({ enabled: true, detectorReady: true });
      await expect(page.locator('iframe[src$="/face-tracker-host.html"]')).toHaveCount(1);
    }
    await expect(overlay).toHaveAttribute("data-static-count", "0", { timeout: 5_000 });
    await expect(overlay).toHaveAttribute("data-open-mouth-count", "1", { timeout: 5_000 });
    await expect(overlay).toHaveAttribute("data-potato-variant", "classic");
    await expect(overlay).toHaveAttribute("data-sunglasses-count", "0");

    await page.evaluate(async () => {
      const sourceVideo = document.querySelector<HTMLVideoElement>("[data-participant-id='slides'] video");
      if (!sourceVideo?.srcObject) throw new Error("複製元の画面共有映像がありません。");
      const tile = document.createElement("div");
      tile.id = "unmarked-screen-share";
      tile.dataset.participantId = "unknown-content";
      Object.assign(tile.style, {
        position: "fixed",
        left: "20px",
        top: "80px",
        width: "320px",
        height: "180px"
      });
      const video = document.createElement("video");
      Object.assign(video.style, { width: "100%", height: "100%", objectFit: "contain" });
      video.muted = true;
      video.srcObject = sourceVideo.srcObject;
      tile.append(video);
      document.body.append(tile);
      await video.play();
    });
    await expect.poll(async () => (await getMeetState(worker)).trackedCount).toBe(2);
    await page.waitForTimeout(1_200);
    await expect(overlay).toHaveAttribute("data-potato-count", "1");
    await page.locator("#unmarked-screen-share").evaluate((element) => element.remove());
    await expect.poll(async () => (await getMeetState(worker)).trackedCount).toBe(1);

    const renderCountBefore = Number(await overlay.getAttribute("data-render-count"));
    await page.waitForTimeout(1_000);
    const renderCountAfter = Number(await overlay.getAttribute("data-render-count"));
    // 模擬映像は8fps。映像や配置が変わらない間に60fpsで同じ絵を描き直さない。
    expect(renderCountAfter - renderCountBefore).toBeLessThanOrEqual(15);

    await worker.evaluate(() => chrome.storage.local.set({ sunglassesEnabled: true }));
    await expect(overlay).toHaveAttribute("data-sunglasses-count", "1");
    expect((await getMeetState(worker)).sunglassesEnabled).toBe(true);
    await page.screenshot({ path: test.info().outputPath("meet.png"), fullPage: true });
    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: test.info().outputPath("meet-1280x800.png"), fullPage: true });
    if (originalViewport) await page.setViewportSize(originalViewport);

    await worker.evaluate(() => chrome.storage.local.set({ potatoVariant: "sweet" }));
    await expect(overlay).toHaveAttribute("data-potato-variant", "sweet");
    expect((await getMeetState(worker)).variant).toBe("sweet");

    await page.evaluate(async () => {
      const sourceVideo = document.querySelector<HTMLVideoElement>("[data-participant-id='remote-aki'] video");
      if (!sourceVideo?.srcObject) throw new Error("複製元の参加者映像がありません。");
      const extras = document.createElement("div");
      extras.id = "performance-test-participants";
      extras.style.position = "fixed";
      extras.style.inset = "0";
      extras.style.pointerEvents = "none";
      for (let index = 0; index < 8; index += 1) {
        const tile = document.createElement("div");
        tile.dataset.participantId = `extra-${index}`;
        Object.assign(tile.style, {
          position: "absolute",
          left: `${20 + (index % 4) * 115}px`,
          top: `${80 + Math.floor(index / 4) * 85}px`,
          width: "104px",
          height: "76px"
        });
        const video = document.createElement("video");
        Object.assign(video.style, { width: "100%", height: "100%", objectFit: "cover" });
        video.muted = true;
        video.srcObject = sourceVideo.srcObject;
        tile.append(video);
        extras.append(tile);
        await video.play();
      }
      document.body.append(extras);
    });
    await expect(overlay).toHaveAttribute("data-potato-count", "8", { timeout: 5_000 });
    await expect.poll(async () => (await getMeetState(worker)).performanceMode).toBe("light");
    expect((await getMeetState(worker)).trackedCount).toBe(9);
    await expect(overlay).toHaveAttribute("data-sunglasses-count", "8");
    await page.locator("#performance-test-participants").evaluate((element) => element.remove());
    await expect(overlay).toHaveAttribute("data-potato-count", "1", { timeout: 10_000 });

    await worker.evaluate(() => chrome.storage.local.set({ sunglassesEnabled: false }));
    await expect(overlay).toHaveAttribute("data-sunglasses-count", "0");
    expect((await getMeetState(worker)).sunglassesEnabled).toBe(false);

    for (let index = 0; index < 10; index += 1) {
      await sendToMeet(worker, index % 2 === 1);
    }
    await expect(page.locator("#potato-meet-overlay")).toBeVisible();
    await expect(page.locator("#potato-meet-overlay")).toHaveCount(1);
    await expect.poll(async () => (await getMeetState(worker)).detectorReady, { timeout: 10_000 }).toBe(true);

    const started = Date.now();
    await sendToMeet(worker, false);
    await expect(page.locator("#potato-meet-overlay")).toHaveCount(0, { timeout: 1_000 });
    await expect(page.locator('iframe[src$="/face-tracker-host.html"]')).toHaveCount(0);
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(externalRequests).toEqual([]);
    expect(browserErrors).toEqual([]);

    await worker.evaluate(() => chrome.storage.local.set({ sunglassesEnabled: true }));

    const extensionId = new URL(worker.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popup.setViewportSize({ width: 360, height: 640 });
    await expect(popup.getByRole("heading", { name: "Potato Meet" })).toBeVisible();
    await expect(popup.locator("input[name='potato-variant']")).toHaveCount(3);
    await expect(popup.getByText("Sweet potato", { exact: true })).toBeVisible();
    await expect(popup.locator("#sunglasses-toggle")).toBeChecked();
    await expect(popup.locator("#preview-body")).toHaveAttribute("src", /potato-body-sweet\.png$/);
    await expect(popup.locator("#preview-sunglasses")).toBeVisible();
    await expect(popup.locator("#selection-summary")).toHaveText("Sweet potato + sunglasses");
    await expect(popup.getByText(
      "Before you turn it on: Potato Meet processes visible Meet video, face estimates, and participant tile text on this device to place potatoes. It does not save or upload them.",
      { exact: true }
    )).toBeVisible();
    await expect(popup.locator("#connection-notice")).toBeVisible();

    // ポップアップを開いたままMeet側の設定が変わっても、表示を同期する。
    await worker.evaluate(() => chrome.storage.local.set({
      potatoVariant: "purple",
      sunglassesEnabled: false
    }));
    await expect(popup.locator("input[name='potato-variant'][value='purple']")).toBeChecked();
    await expect(popup.locator("#sunglasses-toggle")).not.toBeChecked();
    await expect(popup.locator("#preview-body")).toHaveAttribute("src", /potato-body-purple\.png$/);
    await expect(popup.locator("#preview-sunglasses")).toBeHidden();
    await expect(popup.locator("#selection-summary")).toHaveText("Purple potato");
    await popup.screenshot({ path: test.info().outputPath("popup.png") });

    // The popup must refresh after asynchronous tracker initialization finishes.
    await page.bringToFront();
    await sendToMeet(worker, true);
    await expect(popup.locator("#tracking-status")).toHaveText(/Checking 1 video/, { timeout: 15_000 });
    await expect(popup.locator("#potato-toggle")).toBeChecked();
    await expect(overlay).toHaveAttribute("data-potato-count", "1");
    await popup.screenshot({ path: test.info().outputPath("popup-tracking.png") });
    await sendToMeet(worker, false);
    await expect(popup.locator("#tracking-status")).toBeHidden();
  } finally {
    await context.close();
    const expectedPrefix = `${os.tmpdir()}${path.sep}potato-meet-chrome-`;
    if (!userDataDir.startsWith(expectedPrefix)) throw new Error("一時Chromeプロファイル以外は削除できません。");
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 2 });
  }
});

}
