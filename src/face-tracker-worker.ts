import { FaceLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { estimateHeadMotion } from "./motion";
import type { FaceObservation, NormalizedFaceBox } from "./types";

interface InitMessage {
  type: "init";
  wasmLoaderPath: string;
  wasmBinaryPath: string;
  modelPath: string;
}

interface DetectMessage {
  type: "detect";
  requestId: number;
  timestamp: number;
  frame: ImageBitmap;
}

type WorkerRequest = InitMessage | DetectMessage;

interface DetectionOutcome {
  observation: FaceObservation | null;
  readable: boolean;
}

const workerScope = globalThis as typeof globalThis & {
  importScripts: (...urls: string[]) => void;
  postMessage: (message: unknown) => void;
  ModuleFactory?: unknown;
  PotatoMeetModuleFactory?: unknown;
};

let landmarker: FaceLandmarker | null = null;

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

async function initialize(message: InitMessage): Promise<void> {
  workerScope.importScripts(message.wasmLoaderPath);
  if (!workerScope.PotatoMeetModuleFactory) {
    throw new Error("Could not load the local MediaPipe runtime.");
  }
  workerScope.ModuleFactory = workerScope.PotatoMeetModuleFactory;
  landmarker = await FaceLandmarker.createFromOptions(
    { wasmLoaderPath: "", wasmBinaryPath: message.wasmBinaryPath },
    {
      baseOptions: { modelAssetPath: message.modelPath },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: true,
      // 顔向きは必要な特徴点から求めるため、未使用の変換行列は生成しない。
      outputFacialTransformationMatrixes: false
    }
  );
}

function detect(message: DetectMessage): DetectionOutcome {
  if (!landmarker) return { observation: null, readable: false };
  try {
    const result = landmarker.detectForVideo(message.frame, message.timestamp);
    const landmarks = result.faceLandmarks[0];
    if (!landmarks?.length) return { observation: null, readable: true };

    const jawOpen = result.faceBlendshapes[0]?.categories.find(
      (category) => category.categoryName === "jawOpen"
    )?.score ?? 0;
    return {
      readable: true,
      observation: {
        box: landmarksToBox(landmarks),
        jawOpen,
        ...estimateHeadMotion(landmarks)
      }
    };
  } catch {
    return { observation: null, readable: false };
  } finally {
    message.frame.close();
  }
}

globalThis.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === "init") {
    void initialize(message)
      .then(() => workerScope.postMessage({ type: "ready" }))
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        workerScope.postMessage({ type: "init-error", error: text });
      });
    return;
  }

  const outcome = detect(message);
  workerScope.postMessage({ type: "result", requestId: message.requestId, outcome });
});
