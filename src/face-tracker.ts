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

const UNREADABLE: DetectionOutcome = { observation: null, readable: false };
const WORKER_FAILED: DetectionOutcome = { observation: null, readable: false, failed: true };

export class FaceTracker {
  private requestId = 0;
  private closed = false;
  private failed = false;
  private readonly pending = new Map<number, PendingDetection>();

  private constructor(private readonly worker: Worker) {
    this.worker.addEventListener("message", this.handleMessage);
    this.worker.addEventListener("error", this.handleWorkerFailure);
    this.worker.addEventListener("messageerror", this.handleWorkerFailure);
  }

  static async create(): Promise<FaceTracker> {
    // Content Scriptはページと別の環境で動くが、WorkerのURL判定にはページ側の
    // オリジンが使われる。拡張機能内の検証済みコードをBlobへ移して起動する。
    const workerScript = await fetch(chrome.runtime.getURL("face-tracker-worker.js"));
    if (!workerScript.ok) throw new Error("顔検出用の別処理を読み込めませんでした。");
    const workerUrl = URL.createObjectURL(new Blob([await workerScript.text()], { type: "text/javascript" }));
    let worker: Worker;
    try {
      worker = new Worker(workerUrl);
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<{ type?: string; error?: string }>): void => {
          if (event.data.type === "ready") {
            cleanup();
            resolve();
          } else if (event.data.type === "init-error") {
            cleanup();
            reject(new Error(event.data.error || "顔検出を初期化できませんでした。"));
          }
        };
        const handleError = (): void => {
          cleanup();
          reject(new Error("顔検出用の別処理を開始できませんでした。"));
        };
        const cleanup = (): void => {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          worker.removeEventListener("messageerror", handleError);
        };
        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);
        worker.addEventListener("messageerror", handleError);
        worker.postMessage({
          type: "init",
          wasmLoaderPath: chrome.runtime.getURL("mediapipe/wasm/vision_wasm_internal.js"),
          wasmBinaryPath: chrome.runtime.getURL("mediapipe/wasm/vision_wasm_internal.wasm"),
          modelPath: chrome.runtime.getURL("models/face_landmarker.task")
        });
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

  private readonly handleMessage = (event: MessageEvent<WorkerDetectionResponse>): void => {
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
