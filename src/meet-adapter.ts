import { isRenderableRect, rectFromDomRect } from "./geometry";
import type { Rect } from "./types";

export interface MeetVideoCandidate {
  video: HTMLVideoElement;
  tile: HTMLElement;
  tileRect: Rect;
  videoRect: Rect;
  objectFit: string;
  mirrored: boolean;
}

const TILE_SELECTOR = [
  "[data-participant-id]",
  "[data-requested-participant-id]",
  "[data-tile-id]",
  "[data-potato-tile]",
  "[role='listitem']"
].join(",");

const SELF_PATTERN = /(^|[\s(（])(?:you|your video|あなた|自分|あなたの映像)(?:[\s)）]|$)/i;
const SHARE_PATTERN = /(?:presentation|presenting|screen share|shared screen|画面共有|共有中|プレゼンテーション)/i;

function textFor(tile: HTMLElement, video: HTMLVideoElement): string {
  return [
    tile.getAttribute("aria-label"),
    tile.dataset.participantName,
    tile.dataset.selfName,
    video.getAttribute("aria-label"),
    // innerTextはレイアウト計算を発生させるため、分類にはtextContentを使う。
    tile.textContent
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

function hasTruthyMarker(element: HTMLElement, names: string[]): boolean {
  return names.some((name) => {
    const value = element.getAttribute(name);
    return value === "true" || value === "1" || value === "self" || value === "presentation";
  });
}

function isSelfTile(tile: HTMLElement, text: string): boolean {
  if (hasTruthyMarker(tile, ["data-is-self", "data-self", "data-local-participant"])) return true;
  if (tile.querySelector("[data-is-self='true'], [data-self='true'], [data-local-participant='true']")) return true;
  return SELF_PATTERN.test(text);
}

function isScreenShare(tile: HTMLElement, video: HTMLVideoElement, text: string): boolean {
  if (hasTruthyMarker(tile, ["data-screen-share", "data-is-presentation", "data-presentation-id"])) return true;
  if (tile.querySelector("[data-screen-share='true'], [data-is-presentation='true'], [data-presentation-id]")) return true;
  const trackLabel = video.srcObject instanceof MediaStream
    ? video.srcObject.getVideoTracks()[0]?.label ?? ""
    : "";
  return SHARE_PATTERN.test(`${text} ${trackLabel}`);
}

function isVisibleVideo(rect: Rect, style: CSSStyleDeclaration): boolean {
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && isRenderableRect(rect);
}

function isMirrored(style: CSSStyleDeclaration): boolean {
  const transform = style.transform;
  if (transform === "none") return false;
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  return Boolean(match?.[1] && Number(match[1].split(",")[0]) < 0);
}

export function findMeetCandidates(root: ParentNode = document): MeetVideoCandidate[] {
  const byTile = new Map<HTMLElement, MeetVideoCandidate>();

  for (const video of root.querySelectorAll("video")) {
    if (!(video instanceof HTMLVideoElement)) continue;
    const style = getComputedStyle(video);
    const videoRect = rectFromDomRect(video.getBoundingClientRect());
    if (!isVisibleVideo(videoRect, style)) continue;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) continue;
    const tile = video.closest<HTMLElement>(TILE_SELECTOR);
    if (!tile) continue;
    const text = textFor(tile, video);
    if (isSelfTile(tile, text) || isScreenShare(tile, video, text)) continue;
    const tileRect = rectFromDomRect(tile.getBoundingClientRect());
    if (!isRenderableRect(tileRect)) continue;

    const candidate: MeetVideoCandidate = {
      video,
      tile,
      tileRect,
      videoRect,
      objectFit: style.objectFit || "cover",
      mirrored: isMirrored(style)
    };
    const existing = byTile.get(tile);
    if (!existing || candidate.videoRect.width * candidate.videoRect.height > existing.videoRect.width * existing.videoRect.height) {
      byTile.set(tile, candidate);
    }
  }

  // The controller caches size priority and updates it only when candidates change.
  return [...byTile.values()];
}

function rectChanged(previous: Rect, next: Rect): boolean {
  return previous.x !== next.x || previous.y !== next.y || previous.width !== next.width || previous.height !== next.height;
}

export function updateCandidateLayout(candidate: MeetVideoCandidate): boolean {
  const tileRect = rectFromDomRect(candidate.tile.getBoundingClientRect());
  const videoRect = rectFromDomRect(candidate.video.getBoundingClientRect());
  const changed = rectChanged(candidate.tileRect, tileRect) || rectChanged(candidate.videoRect, videoRect);
  candidate.tileRect = tileRect;
  candidate.videoRect = videoRect;
  return changed;
}
