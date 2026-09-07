import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ExtensionMessage, ExtensionStateResponse } from "../src/types";
import type { MeetVideoCandidate } from "../src/meet-adapter";

const mocks = vi.hoisted(() => ({ scan: vi.fn(), createTracker: vi.fn(), createRenderer: vi.fn() }));
vi.mock("../src/meet-adapter", () => ({ findMeetCandidates: mocks.scan, updateCandidateLayout: () => false }));
vi.mock("../src/face-tracker", () => ({ FaceTracker: { create: mocks.createTracker } }));
vi.mock("../src/renderer", () => ({ PotatoRenderer: { create: mocks.createRenderer } }));
let listener: (message: ExtensionMessage, sender: object, respond: (value: ExtensionStateResponse) => void) => void;
const send = (message: ExtensionMessage) => new Promise<ExtensionStateResponse>((resolve) => listener(message, {}, resolve));
const toggle = (enabled: boolean) => send({ type: "POTATO_SET_ENABLED", enabled });
const renderer = () => ({ draw: vi.fn(), destroy: vi.fn(), resize: vi.fn(), setVariant: vi.fn(), setSunglassesEnabled: vi.fn() });
function candidate(): MeetVideoCandidate {
  const tile = document.createElement("div");
  const video = document.createElement("video");
  video.getVideoPlaybackQuality = () => ({ totalVideoFrames: 1 }) as VideoPlaybackQuality;
  tile.append(video); document.body.append(tile);
  const rect = { x: 0, y: 0, width: 320, height: 180 };
  return { tile, video, tileRect: rect, videoRect: rect, objectFit: "cover", mirrored: false };
}
beforeEach(async () => {
  vi.useFakeTimers(); vi.resetModules(); vi.resetAllMocks();
  delete (globalThis as { potatoMeetInitialized?: boolean }).potatoMeetInitialized;
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  mocks.scan.mockReturnValue([]);
  mocks.createRenderer.mockResolvedValue(renderer());
  mocks.createTracker.mockResolvedValue({ detect: vi.fn().mockResolvedValue({ readable: true, observation: null }), close: vi.fn() });
  vi.stubGlobal("chrome", {
    runtime: { onMessage: { addListener: (callback: typeof listener) => { listener = callback; } } },
    storage: { local: { get: async () => ({}) }, onChanged: { addListener: () => undefined } }
  });
  await import("../src/content");
});
afterEach(async () => {
  await toggle(false);
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
  document.body.replaceChildren();
  delete (globalThis as { potatoMeetInitialized?: boolean }).potatoMeetInitialized;
});

it("does not initialize face tracking until a visible candidate appears", async () => {
  await toggle(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(mocks.createTracker).not.toHaveBeenCalled();
  mocks.scan.mockReturnValue([candidate()]);
  await vi.advanceTimersByTimeAsync(750);
  expect(mocks.createTracker).toHaveBeenCalledOnce();
});

it("does not scan hidden-tab DOM mutations, and resumes on visibility", async () => {
  await toggle(true);
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  document.dispatchEvent(new Event("visibilitychange"));
  const before = mocks.scan.mock.calls.length;
  candidate(); // Even video-related changes must wait while hidden.
  await vi.advanceTimersByTimeAsync(1000);
  expect(mocks.scan).toHaveBeenCalledTimes(before);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  document.dispatchEvent(new Event("visibilitychange"));
  expect(mocks.scan.mock.calls.length).toBeGreaterThan(before);
});

it("continues tracking others when a participant disappears during detection", async () => {
  const first = candidate(), second = candidate();
  mocks.scan.mockReturnValue([first, second]);
  let finish!: (outcome: { readable: boolean; observation: null }) => void;
  const detect = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
    .mockResolvedValue({ readable: true, observation: null });
  mocks.createTracker.mockResolvedValue({ detect, close: vi.fn() });
  await toggle(true); await vi.advanceTimersByTimeAsync(10);
  expect(detect).toHaveBeenCalledOnce();
  first.tile.remove(); mocks.scan.mockReturnValue([second]);
  await vi.advanceTimersByTimeAsync(750);
  finish({ readable: true, observation: null });
  await vi.advanceTimersByTimeAsync(200);
  expect(detect).toHaveBeenCalledWith(second.video, expect.any(Number), 256);
});

it("an old renderer load cannot replace the renderer from a later On", async () => {
  let finish!: (value: ReturnType<typeof renderer>) => void;
  const oldRenderer = renderer(), newRenderer = renderer();
  mocks.createRenderer.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
    .mockResolvedValue(newRenderer);
  const oldStart = toggle(true); await vi.advanceTimersByTimeAsync(0);
  await toggle(false); await toggle(true);
  finish(oldRenderer); await oldStart;
  await send({ type: "POTATO_SET_VARIANT", variant: "purple" });
  expect(oldRenderer.destroy).toHaveBeenCalledOnce();
  expect(newRenderer.setVariant).toHaveBeenCalledWith("purple");
});

it("coalesces ordinary text updates without rescanning the full Meet page", async () => {
  await toggle(true);
  const before = mocks.scan.mock.calls.length;
  const caption = document.createElement("span");
  document.body.append(caption);
  for (let index = 0; index < 5; index += 1) {
    caption.textContent = `Caption ${index}`;
    await vi.advanceTimersByTimeAsync(100);
  }
  expect(mocks.scan).toHaveBeenCalledTimes(before);
});

it("Off cancels an unfinished tracker initialization without blocking the next On", async () => {
  mocks.scan.mockReturnValue([candidate()]);
  let pendingSignal: AbortSignal | undefined;
  mocks.createTracker.mockImplementationOnce((signal: AbortSignal) => {
    pendingSignal = signal;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("Aborted"))));
  });
  await toggle(true);
  expect(pendingSignal?.aborted).toBe(false);
  await toggle(false);
  expect(pendingSignal?.aborted).toBe(true);
  await toggle(true);
  await vi.advanceTimersByTimeAsync(10);
  expect(mocks.createTracker).toHaveBeenCalledTimes(2);
  expect(await send({ type: "POTATO_GET_STATE" })).toMatchObject({ enabled: true, detectorReady: true });
});
