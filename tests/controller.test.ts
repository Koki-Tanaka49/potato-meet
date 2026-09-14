import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ExtensionMessage, ExtensionStateResponse, FaceObservation, OverlayPose } from "../src/types";
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
  Object.defineProperties(video, { videoWidth: { value: 640 }, videoHeight: { value: 360 } });
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
  mocks.createTracker.mockResolvedValue({ detect: vi.fn().mockResolvedValue({ readable: true, observations: [] }), close: vi.fn() });
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
  let finish!: (outcome: { readable: boolean; observations: [] }) => void;
  const detect = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
    .mockResolvedValue({ readable: true, observations: [] });
  mocks.createTracker.mockResolvedValue({ detect, close: vi.fn() });
  await toggle(true); await vi.advanceTimersByTimeAsync(10);
  expect(detect).toHaveBeenCalledOnce();
  first.tile.remove(); mocks.scan.mockReturnValue([second]);
  await vi.advanceTimersByTimeAsync(750);
  finish({ readable: true, observations: [] });
  await vi.advanceTimersByTimeAsync(200);
  expect(detect).toHaveBeenCalledWith(second.video, 256);
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

it("keeps four camera faces visible when inference takes longer than the fixed hold time", async () => {
  const candidates = Array.from({ length: 4 }, () => candidate());
  for (const { video } of candidates) {
    video.getVideoPlaybackQuality = () => ({ totalVideoFrames: Math.floor(performance.now()) + 1 }) as VideoPlaybackQuality;
  }
  mocks.scan.mockReturnValue(candidates);
  const output = renderer();
  mocks.createRenderer.mockResolvedValue(output);
  const observation = { box: { x: 0.3, y: 0.2, width: 0.3, height: 0.4 }, jawOpen: 0, roll: 0, yaw: 0, pitch: 0 };
  mocks.createTracker.mockResolvedValue({
    detect: vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { readable: true, observations: [observation] };
    }),
    close: vi.fn()
  });
  await toggle(true);
  await vi.advanceTimersByTimeAsync(3500);
  expect(output.draw.mock.lastCall?.[0]).toHaveLength(4);
});

it("tracks two faces independently when result order changes and removes a missing face", async () => {
  const target = candidate();
  target.video.getVideoPlaybackQuality = () => ({ totalVideoFrames: Math.floor(performance.now()) + 1 }) as VideoPlaybackQuality;
  mocks.scan.mockReturnValue([target]);
  const output = renderer();
  mocks.createRenderer.mockResolvedValue(output);
  const left: FaceObservation = { box: { x: 0.1, y: 0.2, width: 0.2, height: 0.4 }, jawOpen: 0.3, roll: 0, yaw: 0, pitch: 0 };
  const right: FaceObservation = { ...left, box: { ...left.box, x: 0.65 }, jawOpen: 0 };
  let observations = [left, right];
  mocks.createTracker.mockResolvedValue({ detect: vi.fn().mockImplementation(async () => ({ readable: true, observations })), close: vi.fn() });
  await toggle(true);
  await vi.advanceTimersByTimeAsync(150);
  expect(output.draw.mock.lastCall?.[0]).toHaveLength(2);
  // 0.19 keeps an open mouth open and a closed mouth closed: a swap is observable.
  observations = [{ ...right, jawOpen: 0.19 }, { ...left, jawOpen: 0.19 }];
  await vi.advanceTimersByTimeAsync(150);
  const poses = [...(output.draw.mock.lastCall?.[0] as OverlayPose[])].sort((a, b) => a.x - b.x);
  expect(poses.map((pose) => pose.mouthOpen)).toEqual([true, false]);
  observations = [right];
  await vi.advanceTimersByTimeAsync(700);
  expect(output.draw.mock.lastCall?.[0]).toHaveLength(1);
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(30_000);
  observations = [];
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(700);
  expect(output.draw.mock.lastCall?.[0]).toHaveLength(0);
});
