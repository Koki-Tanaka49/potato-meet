import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REVIEWED_VERSION = "0.10.21";
const OUTBOUND_INDICATORS = [
  "odml.pa.googleapis.com",
  "x-goog-api-key"
];

export async function checkMediapipeRuntime(root = process.cwd()) {
  const packageMetadataPath = path.join(
    root,
    "node_modules/@mediapipe/tasks-vision/package.json"
  );
  const packageMetadata = JSON.parse(await readFile(packageMetadataPath, "utf8"));

  if (packageMetadata.version !== REVIEWED_VERSION) {
    throw new Error(
      `MediaPipe version ${packageMetadata.version} has not been reviewed. ` +
      `Expected ${REVIEWED_VERSION}; review licensing, notices, and outbound traffic before updating.`
    );
  }
  if (packageMetadata.license !== "Apache-2.0") {
    throw new Error(
      `Unexpected MediaPipe license ${packageMetadata.license ?? "(missing)"}; expected Apache-2.0.`
    );
  }

  const runtimeFiles = [
    "dist/face-tracker-worker.js",
    "dist/mediapipe/wasm/vision_wasm_internal.js",
    "dist/mediapipe/wasm/vision_wasm_internal.wasm"
  ];

  for (const relativePath of runtimeFiles) {
    const contents = await readFile(path.join(root, relativePath));
    for (const indicator of OUTBOUND_INDICATORS) {
      if (contents.includes(Buffer.from(indicator))) {
        throw new Error(
          `MediaPipe outbound-traffic indicator "${indicator}" was found in ${relativePath}. ` +
          "Review the runtime and privacy disclosures before packaging."
        );
      }
    }
  }

  console.log(
    `MediaPipe ${REVIEWED_VERSION} is pinned; reviewed runtime files contain no known outbound-traffic indicators.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkMediapipeRuntime();
}
