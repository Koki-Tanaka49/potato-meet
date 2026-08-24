import { clamp, lerp } from "./geometry";
import type { FaceMotion, Point } from "./types";

export const MOUTH_OPEN_THRESHOLD = 0.25;
export const MOUTH_CLOSE_THRESHOLD = 0.17;

export function nextMouthState(current: boolean, jawOpen: number): boolean {
  if (!current && jawOpen >= MOUTH_OPEN_THRESHOLD) return true;
  if (current && jawOpen <= MOUTH_CLOSE_THRESHOLD) return false;
  return current;
}

export function smoothMotion(current: FaceMotion, next: FaceMotion, amount = 0.35): FaceMotion {
  return {
    roll: lerp(current.roll, next.roll, amount),
    yaw: lerp(current.yaw, next.yaw, amount),
    pitch: lerp(current.pitch, next.pitch, amount),
    mouthOpen: next.mouthOpen
  };
}

export function estimateHeadMotion(landmarks: Point[]): Omit<FaceMotion, "mouthOpen"> {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  if (!leftEye || !rightEye || !nose || !leftCheek || !rightCheek || !forehead || !chin) {
    return { roll: 0, yaw: 0, pitch: 0 };
  }

  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceHalfWidth = Math.max(0.001, Math.abs(rightCheek.x - leftCheek.x) / 2);
  const yaw = ((nose.x - faceCenterX) / faceHalfWidth) * 42;
  const faceHeight = Math.max(0.001, chin.y - forehead.y);
  const noseRatio = (nose.y - forehead.y) / faceHeight;
  const pitch = (noseRatio - 0.5) * 70;

  return {
    roll: clamp(roll, -25, 25),
    yaw: clamp(yaw, -35, 35),
    pitch: clamp(pitch, -25, 25)
  };
}
