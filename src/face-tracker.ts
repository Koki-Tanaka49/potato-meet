import { FaceLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { estimateHeadMotion } from "./motion";
import type { FaceObservation, NormalizedFaceBox } from "./types";

export interface DetectionOutcome {
  observation: FaceObservation | null;
  readable: boolean;
}

function landmarksToBox(landmarks: NormalizedLandmark[]): NormalizedFaceBox {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.min(1, maxX) - Math.max(0, minX),
    height: Math.min(1, maxY) - Math.max(0, minY)
  };
}

export class FaceTracker {
  private constructor(
    private readonly landmarker: FaceLandmarker,
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D
  ) {}

  static async create(): Promise<FaceTracker> {
    const runtimeGlobal = globalThis as typeof globalThis & {
      ModuleFactory?: unknown;
      PotatoMeetModuleFactory?: unknown;
    };
    if (!runtimeGlobal.PotatoMeetModuleFactory) {
      throw new Error("MediaPipeのローカル実行環境を読み込めませんでした。");
    }
    // MediaPipeは生成後にModuleFactoryを破棄するため、ONのたびに同梱済みの関数を戻す。
    runtimeGlobal.ModuleFactory = runtimeGlobal.PotatoMeetModuleFactory;
    const modelPath = chrome.runtime.getURL("models/face_landmarker.task");
    const files = {
      // 読込用JSはmanifestから同じ隔離領域へ先に読み込むため、ここでは再読込しない。
      wasmLoaderPath: "",
      wasmBinaryPath: chrome.runtime.getURL("mediapipe/wasm/vision_wasm_internal.wasm")
    };
    const landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: modelPath },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!context) throw new Error("顔検出用Canvasを作成できませんでした。");
    return new FaceTracker(landmarker, canvas, context);
  }

  detect(video: HTMLVideoElement, timestamp: number, maxDimension = 256): DetectionOutcome {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return { observation: null, readable: false };
    }

    const scale = maxDimension / Math.max(video.videoWidth, video.videoHeight);
    this.canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    this.canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    try {
      this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      const result = this.landmarker.detectForVideo(this.canvas, timestamp);
      const landmarks = result.faceLandmarks[0];
      if (!landmarks?.length) return { observation: null, readable: true };

      const jawOpen = result.faceBlendshapes[0]?.categories.find(
        (category) => category.categoryName === "jawOpen"
      )?.score ?? 0;
      const motion = estimateHeadMotion(landmarks);
      return {
        readable: true,
        observation: {
          box: landmarksToBox(landmarks),
          jawOpen,
          ...motion
        }
      };
    } catch {
      return { observation: null, readable: false };
    }
  }

  close(): void {
    this.landmarker.close();
  }
}
