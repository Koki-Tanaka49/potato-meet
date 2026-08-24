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
    tile.innerText
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

function isSelfTile(tile: HTMLElement, video: HTMLVideoElement): boolean {
  if (hasTruthyMarker(tile, ["data-is-self", "data-self", "data-local-participant"])) return true;
  if (tile.querySelector("[data-is-self='true'], [data-self='true'], [data-local-participant='true']")) return true;
  return SELF_PATTERN.test(textFor(tile, video));
}

function isScreenShare(tile: HTMLElement, video: HTMLVideoElement): boolean {
  if (hasTruthyMarker(tile, ["data-screen-share", "data-is-presentation", "data-presentation-id"])) return true;
  if (tile.querySelector("[data-screen-share='true'], [data-is-presentation='true'], [data-presentation-id]")) return true;
  const trackLabel = video.srcObject instanceof MediaStream
    ? video.srcObject.getVideoTracks()[0]?.label ?? ""
    : "";
  return SHARE_PATTERN.test(`${textFor(tile, video)} ${trackLabel}`);
}

function isVisibleVideo(video: HTMLVideoElement): boolean {
  const style = getComputedStyle(video);
  const rect = rectFromDomRect(video.getBoundingClientRect());
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && isRenderableRect(rect);
}

function isMirrored(video: HTMLVideoElement): boolean {
  const transform = getComputedStyle(video).transform;
  if (transform === "none") return false;
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  return Boolean(match?.[1] && Number(match[1].split(",")[0]) < 0);
}

export function findMeetCandidates(root: ParentNode = document): MeetVideoCandidate[] {
  const byTile = new Map<HTMLElement, MeetVideoCandidate>();

  for (const video of root.querySelectorAll("video")) {
    if (!(video instanceof HTMLVideoElement) || !isVisibleVideo(video)) continue;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) continue;
    const tile = video.closest<HTMLElement>(TILE_SELECTOR);
    if (!tile || isSelfTile(tile, video) || isScreenShare(tile, video)) continue;
    const tileRect = rectFromDomRect(tile.getBoundingClientRect());
    if (!isRenderableRect(tileRect)) continue;

    const candidate: MeetVideoCandidate = {
      video,
      tile,
      tileRect,
      videoRect: rectFromDomRect(video.getBoundingClientRect()),
      objectFit: getComputedStyle(video).objectFit || "cover",
      mirrored: isMirrored(video)
    };
    const existing = byTile.get(tile);
    if (!existing || candidate.videoRect.width * candidate.videoRect.height > existing.videoRect.width * existing.videoRect.height) {
      byTile.set(tile, candidate);
    }
  }

  return [...byTile.values()]
    .sort((a, b) => b.tileRect.width * b.tileRect.height - a.tileRect.width * a.tileRect.height);
}

export function updateCandidateLayout(candidate: MeetVideoCandidate): void {
  candidate.tileRect = rectFromDomRect(candidate.tile.getBoundingClientRect());
  candidate.videoRect = rectFromDomRect(candidate.video.getBoundingClientRect());
  const style = getComputedStyle(candidate.video);
  candidate.objectFit = style.objectFit || "cover";
  candidate.mirrored = isMirrored(candidate.video);
}
