import { describe, expect, it } from "vitest";
import {
  expandAndClampFace,
  faceBoxToPageRect,
  mapVideoPoint,
  staticPotatoRect
} from "../src/geometry";

describe("video座標から画面座標への変換", () => {
  it("cover表示の中央を保つ", () => {
    const point = mapVideoPoint(
      { x: 0.5, y: 0.5 },
      { x: 10, y: 20, width: 400, height: 400 },
      1920,
      1080,
      "cover",
      false
    );
    expect(point.x).toBeCloseTo(210);
    expect(point.y).toBeCloseTo(220);
  });

  it("左右反転されたvideoを画面どおりに変換する", () => {
    const normal = mapVideoPoint(
      { x: 0.2, y: 0.5 },
      { x: 0, y: 0, width: 100, height: 100 },
      100,
      100,
      "fill",
      false
    );
    const mirrored = mapVideoPoint(
      { x: 0.2, y: 0.5 },
      { x: 0, y: 0, width: 100, height: 100 },
      100,
      100,
      "fill",
      true
    );
    expect(normal.x).toBe(20);
    expect(mirrored.x).toBe(80);
  });

  it("顔領域を髪と顎まで隠れる大きさにしてタイル内へ収める", () => {
    const face = faceBoxToPageRect(
      { x: 0.25, y: 0.2, width: 0.5, height: 0.5 },
      { x: 0, y: 0, width: 400, height: 300 },
      400,
      300,
      "fill",
      false
    );
    const potato = expandAndClampFace(face, { x: 0, y: 0, width: 400, height: 300 });
    expect(potato.width).toBeCloseTo(356);
    expect(potato.height).toBeCloseTo(258);
    expect(potato.x).toBeGreaterThanOrEqual(0);
    expect(potato.y + potato.height).toBeLessThanOrEqual(300);
  });

  it("静止ポテトが名前表示用の下端領域へ入らない", () => {
    const potato = staticPotatoRect({ x: 100, y: 40, width: 400, height: 300 });
    expect(potato.x).toBeGreaterThanOrEqual(100);
    expect(potato.y).toBeGreaterThanOrEqual(40);
    expect(potato.y + potato.height).toBeLessThanOrEqual(292);
  });
});
