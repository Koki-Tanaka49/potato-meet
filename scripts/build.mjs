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
await cp(path.join(root, "docs/third-party.md"), path.join(dist, "THIRD_PARTY_NOTICES.md"));
await mkdir(path.join(dist, "licenses"), { recursive: true });
await cp(
  path.join(root, "licenses/apache-2.0.txt"),
  path.join(dist, "licenses/apache-2.0.txt")
);
await cp(
  path.join(root, "licenses/mediapipe-notice.txt"),
  path.join(dist, "licenses/mediapipe-notice.txt")
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
