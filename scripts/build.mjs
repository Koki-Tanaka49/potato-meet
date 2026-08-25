import { build } from "esbuild";
import { appendFile, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import "./fetch-model.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: [
    path.join(root, "src/content.ts"),
    path.join(root, "src/face-tracker-worker.ts"),
    path.join(root, "src/background.ts"),
    path.join(root, "src/popup/popup.ts")
  ],
  bundle: true,
  format: "iife",
  target: "chrome120",
  outdir: dist,
  outbase: path.join(root, "src"),
  entryNames: "[dir]/[name]",
  logLevel: "info"
});

await cp(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));
await cp(path.join(root, "public"), dist, { recursive: true });
await cp(path.join(root, "THIRD_PARTY_NOTICES.md"), path.join(dist, "THIRD_PARTY_NOTICES.md"));
await mkdir(path.join(dist, "third_party"), { recursive: true });
await cp(
  path.join(root, "third_party/Apache-2.0.txt"),
  path.join(dist, "third_party/Apache-2.0.txt")
);
await cp(
  path.join(root, "third_party/MediaPipe-NOTICE.txt"),
  path.join(dist, "third_party/MediaPipe-NOTICE.txt")
);
await mkdir(path.join(dist, "popup"), { recursive: true });
await cp(path.join(root, "src/popup/popup.html"), path.join(dist, "popup/popup.html"));
await cp(path.join(root, "src/popup/popup.css"), path.join(dist, "popup/popup.css"));

const mediapipeWasm = path.join(root, "node_modules/@mediapipe/tasks-vision/wasm");
await mkdir(path.join(dist, "mediapipe/wasm"), { recursive: true });
await cp(mediapipeWasm, path.join(dist, "mediapipe/wasm"), { recursive: true });
// Chrome Content ScriptとMediaPipe本体が同じ隔離領域で初期化関数を共有できるようにする。
await appendFile(
  path.join(dist, "mediapipe/wasm/vision_wasm_internal.js"),
  "\nglobalThis.PotatoMeetModuleFactory = ModuleFactory;\nglobalThis.ModuleFactory = ModuleFactory;\n"
);

console.log(`Chrome拡張機能を ${dist} に出力しました。`);
