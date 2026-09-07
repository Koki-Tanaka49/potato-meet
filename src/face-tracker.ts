import type { FaceObservation } from "./types";

export interface DetectionOutcome {
  observation: FaceObservation | null;
  readable: boolean;
  failed?: boolean;
}

interface WorkerDetectionResponse {
  type: "result";
  requestId: number;
  outcome: DetectionOutcome;
}

interface PendingDetection {
  resolve: (outcome: DetectionOutcome) => void;
}

type TrackingWorker = Pick<Worker, "postMessage" | "addEventListener" | "removeEventListener" | "terminate">;

const UNREADABLE: DetectionOutcome = { observation: null, readable: false };
const WORKER_FAILED: DetectionOutcome = { observation: null, readable: false, failed: true };

export class FaceTracker {
  private requestId = 0;
  private closed = false;
  private failed = false;
  private readonly pending = new Map<number, PendingDetection>();

  private constructor(private readonly worker: TrackingWorker) {
    this.worker.addEventListener("message", this.handleMessage);
    this.worker.addEventListener("error", this.handleWorkerFailure);
    this.worker.addEventListener("messageerror", this.handleWorkerFailure);
  }

  static async create(signal?: AbortSignal): Promise<FaceTracker> {
    signal?.throwIfAborted();
    // Run the worker in an extension frame: a page-origin Blob worker inherits
    // Meet's CSP, which can forbid the WebAssembly required by MediaPipe.
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.src = chrome.runtime.getURL("face-tracker-host.html");
    const channel = new MessageChannel();
    const worker: TrackingWorker = Object.assign(channel.port1, {
      terminate: () => {
        channel.port1.close();
        channel.port2.close();
        frame.remove();
      }
    });
    channel.port1.start();
    try {
      await new Promise<void>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<{ type?: string; error?: string }>): void => {
          if (event.data.type === "ready") {
            cleanup();
            resolve();
          } else if (event.data.type === "init-error") {
            cleanup();
            reject(new Error(event.data.error || "Could not initialize face tracking."));
          }
        };
        const handleError = (): void => {
          cleanup();
          reject(new Error("Could not start the face-tracking worker."));
        };
        const handleAbort = (): void => {
          cleanup();
          reject(new DOMException("Face tracking was cancelled.", "AbortError"));
        };
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Face tracking timed out. Turn it off and on to retry."));
        }, 15_000);
        const cleanup = (): void => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", handleAbort);
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          worker.removeEventListener("messageerror", handleError);
        };
        signal?.addEventListener("abort", handleAbort, { once: true });
        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);
        worker.addEventListener("messageerror", handleError);
        frame.addEventListener("load", () => {
          frame.contentWindow?.postMessage({ type: "POTATO_CONNECT" },
            new URL(frame.src).origin, [channel.port2]);
        }, { once: true });
        document.documentElement.append(frame);
        worker.postMessage({ type: "init" });
      });
      return new FaceTracker(worker);
    } catch (error) {
      worker.terminate();
      throw error;
    }
  }

  async detect(video: HTMLVideoElement, timestamp: number, maxDimension = 256): Promise<DetectionOutcome> {
    if (this.failed) return WORKER_FAILED;
    if (
      this.closed ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      return UNREADABLE;
    }

    const scale = maxDimension / Math.max(video.videoWidth, video.videoHeight);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    let frame: ImageBitmap;
    try {
      frame = await createImageBitmap(video, 0, 0, video.videoWidth, video.videoHeight, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "low"
      });
    } catch {
      return UNREADABLE;
    }

    if (this.closed) {
      frame.close();
      return UNREADABLE;
    }

    const requestId = ++this.requestId;
    return new Promise((resolve) => {
      this.pending.set(requestId, { resolve });
      try {
        this.worker.postMessage({ type: "detect", requestId, timestamp, frame }, [frame]);
      } catch {
        this.pending.delete(requestId);
        frame.close();
        resolve(UNREADABLE);
      }
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.removeEventListener("error", this.handleWorkerFailure);
    this.worker.removeEventListener("messageerror", this.handleWorkerFailure);
    this.worker.terminate();
    this.resolvePendingAsUnreadable();
  }

  private readonly handleMessage = (event: MessageEvent<WorkerDetectionResponse | { type: "init-error" }>): void => {
    if (event.data.type === "init-error") {
      this.handleWorkerFailure();
      return;
    }
    if (event.data.type !== "result") return;
    const pending = this.pending.get(event.data.requestId);
    if (!pending) return;
    this.pending.delete(event.data.requestId);
    pending.resolve(event.data.outcome);
  };

  private readonly handleWorkerFailure = (): void => {
    this.failed = true;
    this.worker.terminate();
    this.resolvePending(WORKER_FAILED);
  };

  private resolvePendingAsUnreadable(): void {
    this.resolvePending(UNREADABLE);
  }

  private resolvePending(outcome: DetectionOutcome): void {
    for (const pending of this.pending.values()) pending.resolve(outcome);
    this.pending.clear();
  }
}
