import { FaceTracker } from "./face-tracker";
import { expandAndClampFace, faceBoxToPageRect } from "./geometry";
import { findMeetCandidates, updateCandidateLayout, type MeetVideoCandidate } from "./meet-adapter";
import { nextMouthState, smoothMotion } from "./motion";
import { performanceProfileFor } from "./performance";
import { PotatoRenderer } from "./renderer";
import {
  isPotatoVariant,
  type ExtensionMessage,
  type ExtensionStateResponse,
  type FaceMotion,
  type FaceObservation,
  type OverlayPose,
  type PotatoVariant
} from "./types";

interface ParticipantState {
  candidate: MeetVideoCandidate;
  observation: FaceObservation | null;
  motion: FaceMotion;
  lastSeenAt: number;
  consecutiveDetections: number;
  trackingConfirmed: boolean;
  readable: boolean;
  lastVideoFrame: number;
}

const EMPTY_MOTION: FaceMotion = { roll: 0, yaw: 0, pitch: 0, mouthOpen: false };
const MIN_FACE_HOLD_MS = 500;

function faceHoldDuration(participantCount: number): number {
  const profile = performanceProfileFor(participantCount);
  return Math.max(MIN_FACE_HOLD_MS, profile.detectionDelay * profile.maxTrackedFaces * 2);
}

function videoFrameToken(video: HTMLVideoElement): number {
  const totalFrames = video.getVideoPlaybackQuality().totalVideoFrames;
  return totalFrames > 0 ? totalFrames : video.currentTime;
}

class PotatoMeetController {
  private enabled = false;
  private variant: PotatoVariant = "classic";
  private sunglassesEnabled = false;
  private detectorReady = false;
  private detectorError: string | undefined;
  private renderer: PotatoRenderer | null = null;
  private tracker: FaceTracker | null = null;
  private readonly participants = new Map<HTMLVideoElement, ParticipantState>();
  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scanTimer: number | null = null;
  private layoutTimer: number | null = null;
  private detectionTimer: number | null = null;
  private scanDebounce: number | null = null;
  private animationFrame: number | null = null;
  private detectionCursor = 0;
  private lastDetectionTimestamp = 0;
  private generation = 0;
  private trackerLoading: AbortController | null = null;
  private detectionInFlight = false;
  private detectionTargets: ParticipantState[] = [];

  getState(): ExtensionStateResponse {
    return {
      enabled: this.enabled,
      available: true,
      trackedCount: this.participants.size,
      detectorReady: this.detectorReady,
      variant: this.variant,
      sunglassesEnabled: this.sunglassesEnabled,
      performanceMode: performanceProfileFor(this.participants.size).mode,
      detectorError: this.detectorError
    };
  }

  setVariant(variant: PotatoVariant): ExtensionStateResponse {
    this.variant = variant;
    this.renderer?.setVariant(variant);
    this.requestRender();
    return this.getState();
  }

  setSunglassesEnabled(enabled: boolean): ExtensionStateResponse {
    this.sunglassesEnabled = enabled;
    this.renderer?.setSunglassesEnabled(enabled);
    this.requestRender();
    return this.getState();
  }

  async setEnabled(enabled: boolean): Promise<ExtensionStateResponse> {
    if (enabled === this.enabled) return this.getState();
    if (enabled) await this.start();
    else this.stop();
    return this.getState();
  }

  private async start(): Promise<void> {
    this.enabled = true;
    this.detectorError = undefined;
    const generation = ++this.generation;
    let renderer: PotatoRenderer;
    try {
      renderer = await PotatoRenderer.create(this.variant, this.sunglassesEnabled);
    } catch {
      if (!this.enabled || generation !== this.generation) return;
      this.enabled = false;
      this.detectorError = "Could not load the potato assets. Reload the Meet tab after updating the extension.";
      throw new Error(this.detectorError);
    }
    if (!this.enabled || generation !== this.generation) {
      renderer.destroy();
      return;
    }
    this.renderer = renderer;
    renderer.setVariant(this.variant);
    renderer.setSunglassesEnabled(this.sunglassesEnabled);

    this.scan();
    this.mutationObserver = new MutationObserver((records) => {
      if (document.hidden) return;
      // Chat text, captions and the overlay's own nodes cannot add/remove video.
      // The periodic scan still refreshes labels and attributes for classification.
      for (const record of records) {
        for (const node of [...record.addedNodes, ...record.removedNodes]) {
          if (node instanceof Element && (node.matches("video") || node.querySelector("video"))) {
            this.scheduleScan();
            return;
          }
        }
      }
    });
    this.mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    this.resizeObserver = new ResizeObserver(() => this.updateLayouts());
    for (const state of this.participants.values()) this.observeCandidate(state.candidate);
    this.scanTimer = window.setInterval(() => {
      if (!document.hidden) this.scan();
    }, 750);
    this.layoutTimer = window.setInterval(() => {
      if (!document.hidden) this.updateLayouts();
    }, 120);
    window.addEventListener("resize", this.handleWindowResize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.requestRender();
  }

  private ensureTracker(): void {
    if (!this.enabled || document.hidden || this.participants.size === 0 ||
        this.tracker || this.trackerLoading || this.detectorError) return;
    const loading = new AbortController();
    this.trackerLoading = loading;
    void this.loadTracker(this.generation, loading);
  }

  private async loadTracker(generation: number, loading: AbortController): Promise<void> {
    try {
      const tracker = await FaceTracker.create(loading.signal);
      if (!this.enabled || generation !== this.generation) {
        tracker.close();
        return;
      }
      this.tracker = tracker;
      this.detectorReady = true;
      this.scheduleDetection(0);
    } catch (error) {
      if (!this.enabled || generation !== this.generation) return;
      this.detectorReady = false;
      this.detectorError = error instanceof Error ? error.message : String(error);
      // カメラ映像だと確認できないため、顔検出を使えない場合は描画しない。
    } finally {
      if (this.trackerLoading === loading) this.trackerLoading = null;
    }
  }

  private stop(): void {
    this.enabled = false;
    this.generation += 1;
    this.detectorReady = false;
    this.detectorError = undefined;
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.mutationObserver = null;
    this.resizeObserver = null;
    if (this.scanTimer !== null) clearInterval(this.scanTimer);
    if (this.layoutTimer !== null) clearInterval(this.layoutTimer);
    if (this.detectionTimer !== null) clearTimeout(this.detectionTimer);
    if (this.scanDebounce !== null) clearTimeout(this.scanDebounce);
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.scanTimer = null;
    this.layoutTimer = null;
    this.detectionTimer = null;
    this.scanDebounce = null;
    this.animationFrame = null;
    window.removeEventListener("resize", this.handleWindowResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.trackerLoading?.abort();
    this.trackerLoading = null;
    this.detectionInFlight = false;
    this.detectionTargets = [];
    this.tracker?.close();
    this.tracker = null;
    this.renderer?.destroy();
    this.renderer = null;
    this.participants.clear();
  }

  private readonly handleWindowResize = (): void => {
    this.renderer?.resize();
    this.updateLayouts();
    this.requestRender();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.detectionTimer !== null) clearTimeout(this.detectionTimer);
      if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
      if (this.scanDebounce !== null) clearTimeout(this.scanDebounce);
      this.scanDebounce = null;
      this.detectionTimer = null;
      this.animationFrame = null;
      return;
    }
    this.scan();
    this.updateLayouts();
    this.requestRender();
    this.scheduleDetection(0);
  };

  private scheduleScan(): void {
    // Coalesce mutation bursts without postponing discovery indefinitely.
    if (!this.enabled || document.hidden || this.scanDebounce !== null) return;
    this.scanDebounce = window.setTimeout(() => {
      this.scanDebounce = null;
      this.scan();
    }, 150);
  }

  private scan(): void {
    if (!this.enabled || document.hidden) return;
    const candidates = findMeetCandidates();
    const activeVideos = new Set(candidates.map((candidate) => candidate.video));
    let changed = false;

    for (const [video, state] of this.participants) {
      if (!activeVideos.has(video) || !state.candidate.tile.isConnected || !video.isConnected) {
        this.unobserveCandidate(state.candidate);
        this.participants.delete(video);
        changed = true;
      }
    }

    for (const candidate of candidates) {
      const existing = this.participants.get(candidate.video);
      if (existing) {
        const previous = existing.candidate;
        const candidateChanged =
          previous.tile !== candidate.tile ||
          previous.tileRect.x !== candidate.tileRect.x ||
          previous.tileRect.y !== candidate.tileRect.y ||
          previous.tileRect.width !== candidate.tileRect.width ||
          previous.tileRect.height !== candidate.tileRect.height ||
          previous.videoRect.x !== candidate.videoRect.x ||
          previous.videoRect.y !== candidate.videoRect.y ||
          previous.videoRect.width !== candidate.videoRect.width ||
          previous.videoRect.height !== candidate.videoRect.height ||
          previous.objectFit !== candidate.objectFit ||
          previous.mirrored !== candidate.mirrored;
        if (previous.tile !== candidate.tile) {
          this.unobserveCandidate(previous);
          this.observeCandidate(candidate);
        }
        existing.candidate = candidate;
        changed ||= candidateChanged;
      } else {
        this.participants.set(candidate.video, {
          candidate,
          observation: null,
          motion: { ...EMPTY_MOTION },
          lastSeenAt: 0,
          consecutiveDetections: 0,
          trackingConfirmed: false,
          readable: true,
          lastVideoFrame: -1
        });
        this.observeCandidate(candidate);
        changed = true;
      }
    }
    if (changed) {
      this.updateDetectionTargets();
      this.requestRender();
    }
    this.ensureTracker();
    if (this.detectionTimer === null) this.scheduleDetection(0);
  }

  private updateDetectionTargets(): void {
    this.detectionTargets = [...this.participants.values()]
      .sort((a, b) => b.candidate.tileRect.width * b.candidate.tileRect.height -
        a.candidate.tileRect.width * a.candidate.tileRect.height)
      .slice(0, performanceProfileFor(this.participants.size).maxTrackedFaces);
  }

  private updateLayouts(): void {
    if (!this.enabled || document.hidden) return;
    let changed = false;
    for (const state of this.participants.values()) changed = updateCandidateLayout(state.candidate) || changed;
    if (changed) {
      this.updateDetectionTargets();
      this.requestRender();
    }
  }

  private scheduleDetection(delay = 45): void {
    if (!this.enabled || !this.tracker || document.hidden || this.detectionInFlight ||
        this.detectionTargets.length === 0) return;
    if (this.detectionTimer !== null) clearTimeout(this.detectionTimer);
    this.detectionTimer = window.setTimeout(() => {
      this.detectionTimer = null;
      void this.detectNext();
    }, delay);
  }

  private async detectNext(): Promise<void> {
    if (!this.enabled || !this.tracker || document.hidden || this.detectionInFlight) return;
    const generation = this.generation;
    this.detectionInFlight = true;
    try {
      await this.detectOne();
    } finally {
      if (generation === this.generation) {
        this.detectionInFlight = false;
        this.scheduleDetection(performanceProfileFor(this.participants.size).detectionDelay);
      }
    }
  }

  private async detectOne(): Promise<void> {
    if (!this.tracker) return;
    const tracker = this.tracker;
    const generation = this.generation;
    const profile = performanceProfileFor(this.participants.size);
    const states = this.detectionTargets;
    const state = states[this.detectionCursor % states.length];
    this.detectionCursor = (this.detectionCursor + 1) % Math.max(1, states.length);
    if (!state) {
      return;
    }

    const videoFrame = videoFrameToken(state.candidate.video);
    if (videoFrame === state.lastVideoFrame) {
      // 同じ映像フレームを再解析せず、最後に確認できた顔はそのまま維持する。
      if (state.readable && state.observation) state.lastSeenAt = performance.now();
      return;
    }

    const startedAt = performance.now();
    const timestamp = Math.max(Math.round(startedAt), this.lastDetectionTimestamp + 1);
    this.lastDetectionTimestamp = timestamp;
    const video = state.candidate.video;
    const outcome = await tracker.detect(video, timestamp, profile.detectionSize);
    if (
      !this.enabled ||
      generation !== this.generation ||
      tracker !== this.tracker ||
      this.participants.get(video) !== state
    ) return;
    if (outcome.failed) {
      this.detectorReady = false;
      this.detectorError = "The face-tracking worker stopped unexpectedly.";
      tracker.close();
      this.tracker = null;
      this.requestRender();
      return;
    }
    if (outcome.readable) state.lastVideoFrame = videoFrame;
    const now = performance.now();
    const faceHoldMs = faceHoldDuration(this.participants.size);
    state.readable = outcome.readable;
    if (outcome.observation) {
      if (state.lastSeenAt > 0 && now - state.lastSeenAt > faceHoldMs) {
        state.trackingConfirmed = false;
        state.consecutiveDetections = 0;
      }
      const mouthOpen = nextMouthState(state.motion.mouthOpen, outcome.observation.jawOpen);
      const nextMotion: FaceMotion = {
        roll: state.candidate.mirrored ? -outcome.observation.roll : outcome.observation.roll,
        yaw: state.candidate.mirrored ? -outcome.observation.yaw : outcome.observation.yaw,
        pitch: outcome.observation.pitch,
        mouthOpen
      };
      state.motion = smoothMotion(state.motion, nextMotion);
      state.observation = outcome.observation;
      state.lastSeenAt = now;
      state.consecutiveDetections += 1;
      if (state.consecutiveDetections >= 2) state.trackingConfirmed = true;
    } else {
      state.consecutiveDetections = 0;
      if (state.lastSeenAt > 0 && now - state.lastSeenAt > faceHoldMs) state.trackingConfirmed = false;
    }
    this.requestRender();
  }

  private poses(now: number): OverlayPose[] {
    const poses: OverlayPose[] = [];
    const faceHoldMs = faceHoldDuration(this.participants.size);
    for (const state of this.participants.values()) {
      const candidate = state.candidate;
      const shouldTrack = Boolean(
        state.readable &&
        state.observation &&
        state.trackingConfirmed &&
        now - state.lastSeenAt <= faceHoldMs
      );
      // 顔を連続して確認できた映像だけを、カメラONの対象として描画する。
      // これにより、分類用の目印がない画面共有やカメラOFF映像へは表示しない。
      if (!shouldTrack || !state.observation) continue;

      const potatoRect = expandAndClampFace(
        faceBoxToPageRect(
          state.observation.box,
          candidate.videoRect,
          candidate.video.videoWidth,
          candidate.video.videoHeight,
          candidate.objectFit,
          candidate.mirrored
        ),
        candidate.tileRect
      );
      poses.push({
        x: potatoRect.x + potatoRect.width / 2,
        y: potatoRect.y + potatoRect.height / 2,
        width: potatoRect.width,
        height: potatoRect.height,
        tile: candidate.tileRect,
        roll: state.motion.roll,
        yaw: state.motion.yaw,
        pitch: state.motion.pitch,
        mouthOpen: state.motion.mouthOpen,
        isStatic: false
      });
    }
    return poses;
  }

  private requestRender(): void {
    if (!this.enabled || !this.renderer || document.hidden || this.animationFrame !== null) return;
    this.animationFrame = requestAnimationFrame((timestamp) => {
      this.animationFrame = null;
      if (!this.enabled || !this.renderer || document.hidden) return;
      this.renderer.draw(this.poses(timestamp));
    });
  }

  private observeCandidate(candidate: MeetVideoCandidate): void {
    this.resizeObserver?.observe(candidate.tile);
    this.resizeObserver?.observe(candidate.video);
  }

  private unobserveCandidate(candidate: MeetVideoCandidate): void {
    this.resizeObserver?.unobserve(candidate.tile);
    this.resizeObserver?.unobserve(candidate.video);
  }
}

// Reconnection can inject this bundle while document_idle injection is racing.
// Register exactly one controller/listener set in each extension execution world.
const contentScope = globalThis as typeof globalThis & { potatoMeetInitialized?: boolean };
if (!contentScope.potatoMeetInitialized) {
  contentScope.potatoMeetInitialized = true;
  initializeContent();
}

function initializeContent(): void {
const controller = new PotatoMeetController();
let variantChangedWhileLoading = false;
let sunglassesChangedWhileLoading = false;
let controllerInitialized = false;

// Content Scriptの起動直後にポップアップを開いても、保存済みの見た目を
// 初期値で返さないよう、設定の読み込み完了をすべての操作より先に待つ。
const controllerReady = chrome.storage.local
  .get(["potatoVariant", "sunglassesEnabled"])
  .then(({ potatoVariant, sunglassesEnabled }) => {
    if (!variantChangedWhileLoading && isPotatoVariant(potatoVariant)) controller.setVariant(potatoVariant);
    if (!sunglassesChangedWhileLoading && typeof sunglassesEnabled === "boolean") {
      controller.setSunglassesEnabled(sunglassesEnabled);
    }
    controllerInitialized = true;
  });

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: ExtensionStateResponse) => void) => {
    void controllerReady
      .then(async () => {
        if (message.type === "POTATO_GET_STATE") return controller.getState();
        if (message.type === "POTATO_SET_ENABLED") return controller.setEnabled(message.enabled);
        if (message.type === "POTATO_SET_VARIANT") return controller.setVariant(message.variant);
        return controller.setSunglassesEnabled(message.enabled);
      })
      .then(sendResponse)
      .catch(() => sendResponse(controller.getState()));
    return true;
  }
);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const variant = changes.potatoVariant?.newValue;
  if (isPotatoVariant(variant)) {
    if (!controllerInitialized) variantChangedWhileLoading = true;
    controller.setVariant(variant);
  }
  const sunglassesEnabled = changes.sunglassesEnabled?.newValue;
  if (typeof sunglassesEnabled === "boolean") {
    if (!controllerInitialized) sunglassesChangedWhileLoading = true;
    controller.setSunglassesEnabled(sunglassesEnabled);
  }
});

}
