import type { PerformanceMode } from "./types";

export interface PerformanceProfile {
  mode: PerformanceMode;
  detectionSize: number;
  detectionDelay: number;
  maxTrackedFaces: number;
}

const FULL: PerformanceProfile = {
  mode: "full",
  detectionSize: 256,
  detectionDelay: 45,
  maxTrackedFaces: 4
};

const BALANCED: PerformanceProfile = {
  mode: "balanced",
  detectionSize: 224,
  detectionDelay: 60,
  maxTrackedFaces: 8
};

const LIGHT: PerformanceProfile = {
  mode: "light",
  detectionSize: 176,
  detectionDelay: 90,
  maxTrackedFaces: 8
};

export function performanceProfileFor(participantCount: number): PerformanceProfile {
  if (participantCount <= 4) return FULL;
  if (participantCount <= 8) return BALANCED;
  return LIGHT;
}
