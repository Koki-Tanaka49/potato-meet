import { describe, expect, it } from "vitest";
import { performanceProfileFor } from "../src/performance";

describe("人数に応じた負荷調整", () => {
  it("4人までは動きを優先する", () => {
    const profile = performanceProfileFor(4);
    expect(profile.mode).toBe("full");
    expect(profile.detectionSize).toBe(256);
    expect(profile.maxTrackedFaces).toBe(4);
  });

  it("5〜8人では解像度と描画回数を抑える", () => {
    const profile = performanceProfileFor(8);
    expect(profile.mode).toBe("balanced");
    expect(profile.detectionSize).toBeLessThan(256);
    expect(profile.maxTrackedFaces).toBe(8);
  });

  it("9人以上では8人だけを追従し、残りを静止表示にできる", () => {
    const profile = performanceProfileFor(12);
    expect(profile.mode).toBe("light");
    expect(profile.detectionSize).toBeLessThan(224);
    expect(profile.renderInterval).toBeGreaterThanOrEqual(50);
    expect(profile.maxTrackedFaces).toBe(8);
  });
});
