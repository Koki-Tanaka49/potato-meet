export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface NormalizedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceMotion {
  roll: number;
  yaw: number;
  pitch: number;
  mouthOpen: boolean;
}

export interface FaceObservation {
  box: NormalizedFaceBox;
  jawOpen: number;
  roll: number;
  yaw: number;
  pitch: number;
}

export interface OverlayPose extends FaceMotion {
  x: number;
  y: number;
  width: number;
  height: number;
  tile: Rect;
  isStatic: boolean;
}

export const POTATO_VARIANTS = ["classic", "sweet", "purple"] as const;
export type PotatoVariant = typeof POTATO_VARIANTS[number];
export type PerformanceMode = "full" | "balanced" | "light";

export function isPotatoVariant(value: unknown): value is PotatoVariant {
  return typeof value === "string" && POTATO_VARIANTS.includes(value as PotatoVariant);
}

export type ExtensionMessage =
  | { type: "POTATO_GET_STATE" }
  | { type: "POTATO_SET_ENABLED"; enabled: boolean }
  | { type: "POTATO_SET_VARIANT"; variant: PotatoVariant }
  | { type: "POTATO_SET_SUNGLASSES"; enabled: boolean };

export interface ExtensionStateResponse {
  enabled: boolean;
  available: boolean;
  trackedCount: number;
  detectorReady: boolean;
  variant: PotatoVariant;
  sunglassesEnabled: boolean;
  performanceMode: PerformanceMode;
  detectorError?: string;
}
