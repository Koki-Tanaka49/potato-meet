# Third-party software

## MediaPipe Tasks Vision

- Package: `@mediapipe/tasks-vision@0.10.21`
- Official project: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0
- License text: `licenses/apache-2.0.txt`
- Additional notices: `licenses/mediapipe-notice.txt`

The build copies the package's JavaScript and WebAssembly files into `dist`. The generated `dist` directory is not committed to Git.

### Distributed loader modification

During the production build, Potato Meet appends two assignments to the copied `mediapipe/wasm/vision_wasm_internal.js` file. The assignments expose MediaPipe's `ModuleFactory` on `globalThis` so the bundled loader can initialize inside the Chrome extension execution environment. The build also appends this modification notice directly to the distributed file. No other MediaPipe package file is intentionally modified.

## MediaPipe Face Landmarker model

- File: `face_landmarker.task`
- Official distribution source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- Official usage example: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md

The model is not committed to Git. If the model is missing, `npm run build` downloads it from the official source and verifies that its SHA-256 checksum matches exactly before use.

The task bundle contains BlazeFace Short Range, Face Mesh V2, and Blendshape V2 model components. Google's official model cards identify each of those models as Apache License 2.0. The pinned task file also matches the exact SHA-256 of the model bundled by the currently published Chrome Web Store extension [Gaze Guard](https://chromewebstore.google.com/detail/fomblcbdekidgallgkdkpkndoneajkbf). Potato Meet therefore treats redistribution of this pinned model as acceptable under its documented practical release standard. Re-review the terms, notices, and checksum before replacing the model.
