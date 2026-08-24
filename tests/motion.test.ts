import { describe, expect, it } from "vitest";
import { estimateHeadMotion, nextMouthState, smoothMotion } from "../src/motion";
import type { Point } from "../src/types";

describe("口の開閉", () => {
  it("開く値と閉じる値を分けて点滅を防ぐ", () => {
    expect(nextMouthState(false, 0.24)).toBe(false);
    expect(nextMouthState(false, 0.25)).toBe(true);
    expect(nextMouthState(true, 0.2)).toBe(true);
    expect(nextMouthState(true, 0.17)).toBe(false);
  });
});

describe("顔の向き", () => {
  function landmarks(overrides: Record<number, Point>): Point[] {
    const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    for (const [index, point] of Object.entries(overrides)) points[Number(index)] = point;
    return points;
  }

  it("右へ移動した鼻を右向きとして返す", () => {
    const pose = estimateHeadMotion(landmarks({
      33: { x: 0.35, y: 0.4 },
      263: { x: 0.65, y: 0.4 },
      1: { x: 0.58, y: 0.5 },
      234: { x: 0.25, y: 0.52 },
      454: { x: 0.75, y: 0.52 },
      10: { x: 0.5, y: 0.2 },
      152: { x: 0.5, y: 0.8 }
    }));
    expect(pose.yaw).toBeGreaterThan(0);
    expect(pose.roll).toBeCloseTo(0);
  });

  it("値を補間して細かな揺れを抑える", () => {
    const smoothed = smoothMotion(
      { roll: 0, yaw: 0, pitch: 0, mouthOpen: false },
      { roll: 20, yaw: 20, pitch: -20, mouthOpen: true },
      0.25
    );
    expect(smoothed).toEqual({ roll: 5, yaw: 5, pitch: -5, mouthOpen: true });
  });
});
