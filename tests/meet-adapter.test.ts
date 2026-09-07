import { beforeEach, describe, expect, it } from "vitest";
import { findMeetCandidates } from "../src/meet-adapter";

interface TileOptions {
  id: string;
  width: number;
  height: number;
  self?: boolean;
  screenShare?: boolean;
}

function addTile({ id, width, height, self = false, screenShare = false }: TileOptions): void {
  const tile = document.createElement("div");
  tile.dataset.participantId = id;
  tile.dataset.participantName = id;
  if (self) tile.dataset.isSelf = "true";
  if (screenShare) tile.dataset.screenShare = "true";
  const video = document.createElement("video");
  tile.append(video);
  document.body.append(tile);

  Object.defineProperties(video, {
    readyState: { value: HTMLMediaElement.HAVE_CURRENT_DATA },
    videoWidth: { value: 640 },
    videoHeight: { value: 360 }
  });
  video.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
  tile.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
}

describe("Meetタイル検出", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
  });

  it("自分と画面共有を除外する", () => {
    addTile({ id: "remote", width: 640, height: 360 });
    addTile({ id: "me", width: 640, height: 360, self: true });
    addTile({ id: "slides", width: 640, height: 360, screenShare: true });
    expect(findMeetCandidates()).toHaveLength(1);
    expect(findMeetCandidates()[0]?.tile.dataset.participantId).toBe("remote");
  });

  it("人数を制限せず、検出順に全員を選ぶ", () => {
    for (let index = 1; index <= 6; index += 1) {
      addTile({ id: `remote-${index}`, width: index * 100, height: index * 60 });
    }
    const result = findMeetCandidates();
    expect(result).toHaveLength(6);
    expect(result.map((candidate) => candidate.tile.dataset.participantId)).toEqual([
      "remote-1",
      "remote-2",
      "remote-3",
      "remote-4",
      "remote-5",
      "remote-6"
    ]);
  });
});
