import { FaceTracker } from "./face-tracker";
import { expandAndClampFace, faceBoxToPageRect, staticPotatoRect } from "./geometry";
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
  addedAt: number;
  lastSeenAt: number;
  consecutiveDetections: number;
  trackingConfirmed: boolean;
  readable: boolean;
}

const EMPTY_MOTION: FaceMotion = { roll: 0, yaw: 0, pitch: 0, mouthOpen: false };

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
  private lastRenderTimestamp = 0;
  private generation = 0;
  private trackerLoadQueue: Promise<void> = Promise.resolve();

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
    return this.getState();
  }

  setSunglassesEnabled(enabled: boolean): ExtensionStateResponse {
    this.sunglassesEnabled = enabled;
    this.renderer?.setSunglassesEnabled(enabled);
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
    try {
      this.renderer = await PotatoRenderer.create(this.variant, this.sunglassesEnabled);
    } catch {
      this.enabled = false;
      throw new Error("ポテト素材を読み込めませんでした。");
    }
    if (!this.enabled || generation !== this.generation) {
      this.renderer.destroy();
      this.renderer = null;
      return;
    }

    this.scan();
    this.mutationObserver = new MutationObserver(() => this.scheduleScan());
    this.mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    this.resizeObserver = new ResizeObserver(() => this.updateLayouts());
    for (const state of this.participants.values()) this.resizeObserver.observe(state.candidate.tile);
    this.scanTimer = window.setInterval(() => this.scan(), 750);
    this.layoutTimer = window.setInterval(() => this.updateLayouts(), 120);
    window.addEventListener("resize", this.handleWindowResize, { passive: true });
    this.renderLoop();
    this.trackerLoadQueue = this.trackerLoadQueue
      .catch(() => undefined)
      .then(() => this.loadTracker(generation));
  }

  private async loadTracker(generation: number): Promise<void> {
    if (!this.enabled || generation !== this.generation) return;
    try {
      const tracker = await FaceTracker.create();
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
      // 顔検出を初期化できない場合も、静止ポテトで安全に動作を続ける。
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
    this.lastRenderTimestamp = 0;
    window.removeEventListener("resize", this.handleWindowResize);
    this.tracker?.close();
    this.tracker = null;
    this.renderer?.destroy();
    this.renderer = null;
    this.participants.clear();
  }

  private readonly handleWindowResize = (): void => {
    this.renderer?.resize();
    this.updateLayouts();
  };

  private scheduleScan(): void {
    if (this.scanDebounce !== null) clearTimeout(this.scanDebounce);
    this.scanDebounce = window.setTimeout(() => {
      this.scanDebounce = null;
      this.scan();
    }, 150);
  }

  private scan(): void {
    if (!this.enabled) return;
    const now = performance.now();
    const candidates = findMeetCandidates();
    const activeVideos = new Set(candidates.map((candidate) => candidate.video));

    for (const [video, state] of this.participants) {
      if (!activeVideos.has(video) || !state.candidate.tile.isConnected || !video.isConnected) {
        this.resizeObserver?.unobserve(state.candidate.tile);
        this.participants.delete(video);
      }
    }

    for (const candidate of candidates) {
      const existing = this.participants.get(candidate.video);
      if (existing) {
        existing.candidate = candidate;
      } else {
        this.participants.set(candidate.video, {
          candidate,
          observation: null,
          motion: { ...EMPTY_MOTION },
          addedAt: now,
          lastSeenAt: 0,
          consecutiveDetections: 0,
          trackingConfirmed: false,
          readable: true
        });
        this.resizeObserver?.observe(candidate.tile);
      }
    }
  }

  private updateLayouts(): void {
    for (const state of this.participants.values()) updateCandidateLayout(state.candidate);
  }

  private scheduleDetection(delay = 45): void {
    if (!this.enabled || !this.tracker) return;
    this.detectionTimer = window.setTimeout(() => this.detectNext(), delay);
  }

  private detectNext(): void {
    if (!this.enabled || !this.tracker) return;
    const profile = performanceProfileFor(this.participants.size);
    const states = [...this.participants.values()]
      .sort((a, b) => {
        const areaA = a.candidate.tileRect.width * a.candidate.tileRect.height;
        const areaB = b.candidate.tileRect.width * b.candidate.tileRect.height;
        return areaB - areaA;
      })
      .slice(0, profile.maxTrackedFaces);
    if (states.length === 0) {
      this.scheduleDetection(120);
      return;
    }
    const state = states[this.detectionCursor % states.length];
    this.detectionCursor = (this.detectionCursor + 1) % Math.max(1, states.length);
    if (!state) {
      this.scheduleDetection();
      return;
    }

    const now = performance.now();
    const timestamp = Math.max(Math.round(now), this.lastDetectionTimestamp + 1);
    this.lastDetectionTimestamp = timestamp;
    const outcome = this.tracker.detect(state.candidate.video, timestamp, profile.detectionSize);
    state.readable = outcome.readable;
    if (outcome.observation) {
      if (state.lastSeenAt > 0 && now - state.lastSeenAt > 500) {
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
      if (state.lastSeenAt > 0 && now - state.lastSeenAt > 500) state.trackingConfirmed = false;
    }
    this.scheduleDetection(profile.detectionDelay);
  }

  private poses(now: number): OverlayPose[] {
    const poses: OverlayPose[] = [];
    for (const state of this.participants.values()) {
      const candidate = state.candidate;
      const shouldTrack = Boolean(
        state.readable &&
        state.observation &&
        state.trackingConfirmed &&
        now - state.lastSeenAt <= 500
      );
      const shouldShowStatic = now - state.addedAt >= 500 || state.lastSeenAt > 0;
      if (!shouldTrack && !shouldShowStatic) continue;

      const potatoRect = shouldTrack && state.observation
        ? expandAndClampFace(
            faceBoxToPageRect(
              state.observation.box,
              candidate.videoRect,
              candidate.video.videoWidth,
              candidate.video.videoHeight,
              candidate.objectFit,
              candidate.mirrored
            ),
            candidate.tileRect
          )
        : staticPotatoRect(candidate.tileRect);
      poses.push({
        x: potatoRect.x + potatoRect.width / 2,
        y: potatoRect.y + potatoRect.height / 2,
        width: potatoRect.width,
        height: potatoRect.height,
        tile: candidate.tileRect,
        roll: shouldTrack ? state.motion.roll : 0,
        yaw: shouldTrack ? state.motion.yaw : 0,
        pitch: shouldTrack ? state.motion.pitch : 0,
        mouthOpen: shouldTrack ? state.motion.mouthOpen : false,
        isStatic: !shouldTrack
      });
    }
    return poses;
  }

  private renderLoop = (timestamp = performance.now()): void => {
    if (!this.enabled || !this.renderer) return;
    const profile = performanceProfileFor(this.participants.size);
    if (timestamp - this.lastRenderTimestamp >= profile.renderInterval) {
      this.renderer.draw(this.poses(timestamp));
      this.lastRenderTimestamp = timestamp;
    }
    this.animationFrame = requestAnimationFrame(this.renderLoop);
  };
}

const controller = new PotatoMeetController();

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: ExtensionStateResponse) => void) => {
    if (message.type === "POTATO_GET_STATE") {
      sendResponse(controller.getState());
      return false;
    }
    if (message.type === "POTATO_SET_ENABLED") {
      controller
        .setEnabled(message.enabled)
        .then(sendResponse)
        .catch(() => sendResponse(controller.getState()));
      return true;
    }
    if (message.type === "POTATO_SET_VARIANT") {
      sendResponse(controller.setVariant(message.variant));
      return false;
    }
    if (message.type === "POTATO_SET_SUNGLASSES") {
      sendResponse(controller.setSunglassesEnabled(message.enabled));
      return false;
    }
    return false;
  }
);

void chrome.storage.local.get(["potatoVariant", "sunglassesEnabled"]).then(({ potatoVariant, sunglassesEnabled }) => {
  if (isPotatoVariant(potatoVariant)) controller.setVariant(potatoVariant);
  if (typeof sunglassesEnabled === "boolean") controller.setSunglassesEnabled(sunglassesEnabled);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const variant = changes.potatoVariant?.newValue;
  if (isPotatoVariant(variant)) controller.setVariant(variant);
  const sunglassesEnabled = changes.sunglassesEnabled?.newValue;
  if (typeof sunglassesEnabled === "boolean") controller.setSunglassesEnabled(sunglassesEnabled);
});
