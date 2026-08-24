import type { PerformanceMode } from "./types";

export interface PerformanceProfile {
  mode: PerformanceMode;
  detectionSize: number;
  detectionDelay: number;
  renderInterval: number;
  maxTrackedFaces: number;
}

const FULL: PerformanceProfile = {
  mode: "full",
  detectionSize: 256,
  detectionDelay: 45,
  renderInterval: 1000 / 60,
  maxTrackedFaces: 4
};

const BALANCED: PerformanceProfile = {
  mode: "balanced",
  detectionSize: 224,
  detectionDelay: 60,
  renderInterval: 1000 / 30,
  maxTrackedFaces: 8
};

const LIGHT: PerformanceProfile = {
  mode: "light",
  detectionSize: 176,
  detectionDelay: 90,
  renderInterval: 1000 / 20,
  maxTrackedFaces: 8
};

export function performanceProfileFor(participantCount: number): PerformanceProfile {
  if (participantCount <= 4) return FULL;
  if (participantCount <= 8) return BALANCED;
  return LIGHT;
}
