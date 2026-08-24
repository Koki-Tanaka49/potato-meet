import type { NormalizedFaceBox, Point, Rect } from "./types";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export function rectFromDomRect(rect: DOMRect): Rect {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

export function isRenderableRect(rect: Rect): boolean {
  return rect.width >= 80 && rect.height >= 60 && rect.x < innerWidth && rect.y < innerHeight && rect.x + rect.width > 0 && rect.y + rect.height > 0;
}

export function mapVideoPoint(
  point: Point,
  videoRect: Rect,
  sourceWidth: number,
  sourceHeight: number,
  objectFit: string,
  mirrored: boolean
): Point {
  const normalizedX = mirrored ? 1 - point.x : point.x;
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);

  if (objectFit === "fill") {
    return {
      x: videoRect.x + normalizedX * videoRect.width,
      y: videoRect.y + point.y * videoRect.height
    };
  }

  const contain = objectFit === "contain";
  const scale = contain
    ? Math.min(videoRect.width / safeSourceWidth, videoRect.height / safeSourceHeight)
    : Math.max(videoRect.width / safeSourceWidth, videoRect.height / safeSourceHeight);
  const renderedWidth = safeSourceWidth * scale;
  const renderedHeight = safeSourceHeight * scale;
  const offsetX = videoRect.x + (videoRect.width - renderedWidth) / 2;
  const offsetY = videoRect.y + (videoRect.height - renderedHeight) / 2;

  return {
    x: offsetX + normalizedX * renderedWidth,
    y: offsetY + point.y * renderedHeight
  };
}

export function faceBoxToPageRect(
  box: NormalizedFaceBox,
  videoRect: Rect,
  sourceWidth: number,
  sourceHeight: number,
  objectFit: string,
  mirrored: boolean
): Rect {
  const topLeft = mapVideoPoint(
    { x: box.x, y: box.y },
    videoRect,
    sourceWidth,
    sourceHeight,
    objectFit,
    mirrored
  );
  const bottomRight = mapVideoPoint(
    { x: box.x + box.width, y: box.y + box.height },
    videoRect,
    sourceWidth,
    sourceHeight,
    objectFit,
    mirrored
  );

  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y)
  };
}

export function expandAndClampFace(face: Rect, tile: Rect): Rect {
  const width = clamp(face.width * 1.78, 68, tile.width * 0.99);
  const height = clamp(face.height * 1.72, 84, Math.max(84, tile.height - 24));
  const maxVisibleY = tile.y + tile.height;
  const x = clamp(face.x + face.width / 2, tile.x + width / 2, tile.x + tile.width - width / 2);
  const y = clamp(face.y + face.height / 2, tile.y + height / 2, maxVisibleY - height / 2);
  return { x: x - width / 2, y: y - height / 2, width, height };
}

export function staticPotatoRect(tile: Rect): Rect {
  const maxHeight = Math.max(72, tile.height - Math.min(48, tile.height * 0.18));
  const height = Math.min(maxHeight * 0.84, tile.width * 0.9);
  const width = height * 0.76;
  const visibleHeight = tile.height - Math.min(48, tile.height * 0.18);
  return {
    x: tile.x + (tile.width - width) / 2,
    y: tile.y + (visibleHeight - height) / 2,
    width,
    height
  };
}

export function isMirroredTransform(transform: string): boolean {
  if (transform === "none" || !transform) return false;
  const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/);
  if (matrixMatch?.[1]) {
    const first = Number(matrixMatch[1].split(",")[0]);
    return Number.isFinite(first) && first < 0;
  }
  return /scaleX\(\s*-1\s*\)|scale\(\s*-1\s*[,)]/.test(transform);
}
